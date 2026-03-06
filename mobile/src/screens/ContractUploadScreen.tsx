import React, { useState } from "react";
import { View, Text, ScrollView, Pressable } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  FadeInDown,
  FadeInUp,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as DocumentPicker from "expo-document-picker";
import { GlassCard, GlowButton, ExtractedDatesDisplay } from "../components";
import { useRealtorStore, Deadline } from "../state/realtorStore";
import { useContractExtraction } from "../hooks/useContractExtraction";
import { ExtractedContractData } from "../api/contract-extraction";

export function ContractUploadScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const [uploadState, setUploadState] = useState<
    "idle" | "uploaded" | "extracting" | "complete" | "error"
  >("idle");
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileUri, setFileUri] = useState<string | null>(null);
  const [fileSize, setFileSize] = useState<number | null>(null);
  const [extractedDeadlines, setExtractedDeadlines] = useState<Deadline[]>([]);
  const [extractedData, setExtractedData] = useState<ExtractedContractData | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const addTransaction = useRealtorStore((s) => s.addTransaction);
  const { extractDeadlines, isExtracting } = useContractExtraction();

  // Pulsing animation for processing state
  const processingPulse = useSharedValue(1);
  const scanLine = useSharedValue(0);

  React.useEffect(() => {
    if (uploadState === "extracting") {
      processingPulse.value = withRepeat(
        withSequence(
          withTiming(0.5, { duration: 800 }),
          withTiming(1, { duration: 800 })
        ),
        -1,
        true
      );
      scanLine.value = withRepeat(withTiming(1, { duration: 1500 }), -1, false);
    }
  }, [uploadState]);

  const processingStyle = useAnimatedStyle(() => ({
    opacity: processingPulse.value,
  }));

  const scanLineStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: scanLine.value * 120 }],
  }));

  const handlePickDocument = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setErrorMessage(null);

    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ["application/pdf", "image/*"],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets?.[0]) {
        const file = result.assets[0];
        setFileName(file.name);
        setFileUri(file.uri);
        setFileSize(file.size || null);
        setUploadState("uploaded");
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

        // Send file to Make.com webhook
        await sendFileToWebhook(file.uri, file.name);
      }
    } catch (error) {
      console.log("Document picker error:", error);
    }
  };

  const sendFileToWebhook = async (uri: string, name: string) => {
    try {
      const WEBHOOK_URL = "https://hook.us2.make.com/hb4gv11q5ijc3h8jy5wjmtsf33myai52";

      // Create FormData
      const formData = new FormData();

      // Add the file
      const fileData: any = {
        uri: uri,
        type: "application/pdf",
        name: name,
      };
      formData.append("file", fileData);

      // Add metadata
      formData.append("name", "User"); // Replace with actual user name if available
      formData.append("notes", "Contract uploaded from Closing Room");
      formData.append("timestamp", new Date().toISOString());

      // Send to webhook
      const response = await fetch(WEBHOOK_URL, {
        method: "POST",
        body: formData,
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      if (response.ok) {
        console.log("File successfully sent to webhook");
      } else {
        console.log("Webhook error:", response.status, response.statusText);
      }
    } catch (error) {
      console.log("Webhook send error:", error);
    }
  };

  const handleExtractDates = async () => {
    if (!fileUri || !fileName) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setUploadState("extracting");
    setErrorMessage(null);

    try {
      // Use OpenAI GPT-4o to extract contract deadlines
      const data = await extractDeadlines(fileUri, fileName);
      setExtractedData(data);
      setExtractedDeadlines(data.deadlines);
      setUploadState("complete");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.log("Extraction error:", error);
      const message = error instanceof Error ? error.message : "Failed to extract dates";
      setErrorMessage(message);
      setUploadState("error");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };

  const handleSaveTransaction = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    addTransaction({
      id: Date.now().toString(),
      address: extractedData?.propertyAddress || "Property Address",
      clientName: extractedData?.clientName || "New Client",
      price: extractedData?.purchasePrice || 0,
      contractDate: extractedData?.contractDate || new Date().toISOString(),
      deadlines: extractedDeadlines,
      status: "active",
      summary: extractedData?.summary,
      nextRequiredAction: extractedData?.nextRequiredAction,
      hasOverdue: extractedData?.hasOverdue,
      extractedAt: new Date().toISOString(),
    });

    // Reset state
    setUploadState("idle");
    setFileName(null);
    setFileUri(null);
    setFileSize(null);
    setExtractedDeadlines([]);
    setExtractedData(null);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  // Get next required action from extracted data or fallback to finding next deadline
  const nextAction = extractedDeadlines.find(
    (d) => d.status === "upcoming" || d.status === "current"
  );

  const nextActionText = extractedData?.nextRequiredAction || nextAction?.label;
  const nextActionDate = nextAction?.date;

  return (
    <View style={{ flex: 1, backgroundColor: "#050510" }}>
      {/* Midnight Glass Obsidian gradient */}
      <LinearGradient
        colors={["#050510", "#0F0F1A"]}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
        }}
      />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingTop: insets.top + 20,
          paddingBottom: insets.bottom + 40,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Back Button */}
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            navigation.goBack();
          }}
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: "rgba(255, 255, 255, 0.1)",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 16,
          }}
        >
          <Ionicons name="chevron-down" size={24} color="#FFFFFF" />
        </Pressable>

        {/* Header */}
        <Animated.View entering={FadeInDown.delay(100).springify()}>
          <View className="flex-row items-center mb-2">
            <Ionicons name="sparkles" size={20} color="#FFB800" />
            <Text
              style={{ color: "#FFFFFF", letterSpacing: 1 }}
              className="text-sm ml-2 uppercase font-semibold"
            >
              AI Contract Reader
            </Text>
          </View>
          <Text className="text-white text-2xl font-bold">Upload Contract</Text>
          <Text style={{ color: "rgba(255, 255, 255, 0.7)" }} className="text-base mt-2">
            Extract all critical deadlines automatically from your purchase
            agreements
          </Text>
        </Animated.View>

        {/* Upload Area - IDLE STATE */}
        {uploadState === "idle" && (
          <Animated.View
            entering={FadeInDown.delay(200).springify()}
            className="mt-8"
          >
            <Pressable onPress={handlePickDocument}>
              <GlassCard glowColor="#FFB800" intensity="medium">
                <View className="items-center py-8">
                  <View
                    style={{
                      width: 80,
                      height: 80,
                      borderRadius: 40,
                      backgroundColor: "rgba(212, 175, 55, 0.15)",
                      alignItems: "center",
                      justifyContent: "center",
                      marginBottom: 16,
                      borderWidth: 2,
                      borderColor: "rgba(212, 175, 55, 0.3)",
                      borderStyle: "dashed",
                    }}
                  >
                    <Ionicons name="cloud-upload" size={36} color="#FFB800" />
                  </View>
                  <Text className="text-white text-lg font-semibold">
                    Tap to Upload Contract
                  </Text>
                  <Text style={{ color: "rgba(255, 255, 255, 0.7)" }} className="text-sm mt-2 text-center">
                    PDF or image - Claude AI reads it all
                  </Text>
                </View>
              </GlassCard>
            </Pressable>
          </Animated.View>
        )}

        {/* UPLOADED STATE - Show file info and Extract button with success feedback */}
        {uploadState === "uploaded" && (
          <Animated.View
            entering={FadeInUp.springify()}
            className="mt-8"
          >
            {/* Upload Success Banner */}
            <Animated.View entering={FadeInDown.delay(100).springify()} className="mb-4">
              <GlassCard glowColor="#10B981" intensity="medium" animated={false}>
                <View className="flex-row items-center">
                  <View
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: 24,
                      backgroundColor: "rgba(16, 185, 129, 0.2)",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Ionicons name="checkmark-circle" size={28} color="#10B981" />
                  </View>
                  <View className="ml-4 flex-1">
                    <Text className="text-white text-lg font-semibold">
                      Upload Successful
                    </Text>
                    <Text style={{ color: "rgba(255, 255, 255, 0.7)" }} className="text-sm mt-1">
                      Ready to extract dates
                    </Text>
                  </View>
                </View>
              </GlassCard>
            </Animated.View>

            <GlassCard glowColor="#FFB800" intensity="medium" animated={false}>
              <View className="flex-row items-center mb-4">
                <View
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 12,
                    backgroundColor: "rgba(16, 185, 129, 0.2)",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Ionicons name="document-text" size={24} color="#10B981" />
                </View>
                <View className="ml-4 flex-1">
                  <Text className="text-white text-base font-semibold">
                    {fileName}
                  </Text>
                  {fileSize && (
                    <Text style={{ color: "rgba(255, 255, 255, 0.7)" }} className="text-sm mt-1">
                      {formatFileSize(fileSize)}
                    </Text>
                  )}
                </View>
                <Pressable
                  onPress={handlePickDocument}
                  style={{
                    padding: 8,
                  }}
                >
                  <Ionicons name="refresh" size={20} color="#9CA3AF" />
                </Pressable>
              </View>

              <View className="mt-4">
                <GlowButton
                  title="Extract Critical Dates"
                  onPress={handleExtractDates}
                  variant="primary"
                  icon="scan"
                  size="lg"
                />
              </View>
            </GlassCard>
          </Animated.View>
        )}

        {/* EXTRACTING STATE */}
        {uploadState === "extracting" && (
          <Animated.View
            entering={FadeInUp.springify()}
            className="mt-8"
          >
            <GlassCard glowColor="#00D4FF" intensity="high">
              <View className="items-center py-8 overflow-hidden">
                <View
                  style={{
                    width: 80,
                    height: 80,
                    borderRadius: 12,
                    backgroundColor: "rgba(0, 212, 255, 0.1)",
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: 16,
                    overflow: "hidden",
                  }}
                >
                  <Animated.View
                    style={[
                      scanLineStyle,
                      {
                        position: "absolute",
                        top: -20,
                        left: 0,
                        right: 0,
                        height: 4,
                        backgroundColor: "#00D4FF",
                        shadowColor: "#00D4FF",
                        shadowOffset: { width: 0, height: 0 },
                        shadowOpacity: 1,
                        shadowRadius: 10,
                      },
                    ]}
                  />
                  <Animated.View style={processingStyle}>
                    <Ionicons name="scan" size={36} color="#00D4FF" />
                  </Animated.View>
                </View>
                <Text className="text-white text-lg font-semibold">
                  Scanning Contract...
                </Text>
                {fileName && (
                  <Text style={{ color: "rgba(255, 255, 255, 0.7)" }} className="text-sm mt-2">{fileName}</Text>
                )}
                <Text className="text-neon-blue text-sm mt-3">
                  Extracting critical dates...
                </Text>
              </View>
            </GlassCard>
          </Animated.View>
        )}

        {/* ERROR STATE */}
        {uploadState === "error" && (
          <Animated.View
            entering={FadeInUp.springify()}
            className="mt-8"
          >
            <GlassCard glowColor="#EF4444" intensity="medium" animated={false}>
              <View className="items-center py-6">
                <View
                  style={{
                    width: 64,
                    height: 64,
                    borderRadius: 32,
                    backgroundColor: "rgba(239, 68, 68, 0.2)",
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: 16,
                  }}
                >
                  <Ionicons name="alert-circle" size={32} color="#EF4444" />
                </View>
                <Text className="text-white text-lg font-semibold text-center">
                  Extraction Failed
                </Text>
                <Text style={{ color: "rgba(255, 255, 255, 0.7)" }} className="text-sm mt-2 text-center px-4">
                  {errorMessage || "Unable to extract dates from this file"}
                </Text>
                <View className="mt-6 w-full">
                  <GlowButton
                    title="Try Again"
                    onPress={() => {
                      setUploadState("uploaded");
                      setErrorMessage(null);
                    }}
                    variant="primary"
                    icon="refresh"
                    size="lg"
                  />
                </View>
                <Pressable
                  onPress={() => {
                    setUploadState("idle");
                    setFileName(null);
                    setFileUri(null);
                    setFileSize(null);
                    setErrorMessage(null);
                  }}
                  className="mt-4"
                >
                  <Text style={{ color: "rgba(255, 255, 255, 0.7)" }} className="text-base">
                    Upload Different File
                  </Text>
                </Pressable>
              </View>
            </GlassCard>
          </Animated.View>
        )}

        {/* COMPLETE STATE */}
        {uploadState === "complete" && extractedDeadlines.length > 0 && (
          <>
            {/* Success Banner */}
            <Animated.View
              entering={FadeInUp.springify()}
              className="mt-8"
            >
              <GlassCard glowColor="#10B981" intensity="medium" animated={false}>
                <View className="flex-row items-center">
                  <View
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: 24,
                      backgroundColor: "rgba(16, 185, 129, 0.2)",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Ionicons name="checkmark-circle" size={28} color="#10B981" />
                  </View>
                  <View className="ml-4 flex-1">
                    <Text className="text-white text-lg font-semibold">
                      Contract Processed
                    </Text>
                    <Text style={{ color: "rgba(255, 255, 255, 0.7)" }} className="text-sm mt-1">
                      {extractedDeadlines.length} deadlines extracted
                    </Text>
                  </View>
                </View>
              </GlassCard>
            </Animated.View>

            {/* Next Required Action */}
            {nextActionText && (
              <Animated.View
                entering={FadeInUp.delay(100).springify()}
                className="mt-6"
              >
                <GlassCard glowColor="#FFB800" intensity="high" animated={false}>
                  <View className="flex-row items-center mb-2">
                    <Ionicons
                      name="arrow-forward-circle"
                      size={18}
                      color="#FFB800"
                    />
                    <Text
                      style={{ color: "#FFFFFF", letterSpacing: 1 }}
                      className="text-sm ml-2 uppercase font-semibold"
                    >
                      Next Required Action
                    </Text>
                  </View>
                  <Text className="text-white text-xl font-semibold">
                    {nextActionText}
                  </Text>
                  {nextActionDate && (
                    <Text style={{ color: "rgba(255, 255, 255, 0.7)" }} className="text-base mt-1">
                      Due: {nextActionDate}
                    </Text>
                  )}
                </GlassCard>
              </Animated.View>
            )}

            {/* Contract Summary */}
            {extractedData?.summary && (
              <Animated.View
                entering={FadeInUp.delay(150).springify()}
                className="mt-6"
              >
                <GlassCard glowColor="#A855F7" intensity="medium" animated={false}>
                  <View className="flex-row items-center mb-2">
                    <Ionicons
                      name="document-text"
                      size={18}
                      color="#A855F7"
                    />
                    <Text
                      style={{ color: "#FFFFFF", letterSpacing: 1 }}
                      className="text-sm ml-2 uppercase font-semibold"
                    >
                      Contract Summary
                    </Text>
                  </View>
                  <Text style={{ color: "rgba(255, 255, 255, 0.9)" }} className="text-base leading-6">
                    {extractedData.summary}
                  </Text>
                  {extractedData.hasOverdue && (
                    <View className="flex-row items-center mt-3 pt-3 border-t border-white/10">
                      <Ionicons name="alert-circle" size={16} color="#EF4444" />
                      <Text style={{ color: "#EF4444" }} className="text-sm ml-2 font-semibold">
                        ⚠️ Contains overdue deadlines
                      </Text>
                    </View>
                  )}
                </GlassCard>
              </Animated.View>
            )}

            {/* Extracted Dates Panel - Editable */}
            <Animated.View
              entering={FadeInUp.delay(200).springify()}
              className="mt-6"
            >
              <ExtractedDatesDisplay
                deadlines={extractedDeadlines}
                onUpdate={setExtractedDeadlines}
                editable={true}
              />
            </Animated.View>

            {/* Action Buttons */}
            <Animated.View
              entering={FadeInUp.delay(300).springify()}
              className="mt-6"
            >
              <GlowButton
                title="Save to Transactions"
                onPress={handleSaveTransaction}
                variant="success"
                icon="checkmark-circle"
                size="lg"
              />
            </Animated.View>

            <Pressable
              onPress={() => {
                setUploadState("idle");
                setFileName(null);
                setFileUri(null);
                setFileSize(null);
                setExtractedDeadlines([]);
                setExtractedData(null);
              }}
              className="mt-4 items-center"
            >
              <Text style={{ color: "rgba(255, 255, 255, 0.7)" }} className="text-base">Upload Another</Text>
            </Pressable>
          </>
        )}

        {/* Features Info - Only show in idle state */}
        {uploadState === "idle" && (
          <Animated.View
            entering={FadeInUp.delay(300).springify()}
            className="mt-8"
          >
            <Text style={{ color: "rgba(255, 255, 255, 0.7)" }} className="text-sm mb-4 uppercase tracking-wide">
              Critical Dates We Extract
            </Text>

            {[
              { icon: "wallet", label: "Earnest Money Due", color: "#FFB800" },
              { icon: "search", label: "Inspection Period", color: "#00D4FF" },
              {
                icon: "build",
                label: "Repair Request Deadline",
                color: "#A855F7",
              },
              {
                icon: "calculator",
                label: "Appraisal Deadline",
                color: "#10B981",
              },
              {
                icon: "cash",
                label: "Loan Commitment Date",
                color: "#F97316",
              },
              {
                icon: "business",
                label: "HOA Docs Deadline",
                color: "#EC4899",
              },
              { icon: "home", label: "Escrow Close Date", color: "#FFB800" },
            ].map((item) => (
              <View
                key={item.label}
                className="flex-row items-center mb-3"
                style={{
                  backgroundColor: "rgba(255,255,255,0.03)",
                  paddingVertical: 12,
                  paddingHorizontal: 16,
                  borderRadius: 12,
                  borderLeftWidth: 3,
                  borderLeftColor: item.color,
                }}
              >
                <Ionicons
                  name={item.icon as keyof typeof Ionicons.glyphMap}
                  size={20}
                  color={item.color}
                />
                <Text className="text-white text-base ml-4">{item.label}</Text>
              </View>
            ))}
          </Animated.View>
        )}
      </ScrollView>
    </View>
  );
}
