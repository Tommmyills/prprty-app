import React, { useState } from "react";
import { View, Text, ScrollView, Pressable, Modal, Share, Linking } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  FadeInDown,
  FadeInUp,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  FadeIn,
  FadeOut,
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as Clipboard from "expo-clipboard";
import { GlassCard, GlowButton } from "../components";
import { useRealtorStore } from "../state/realtorStore";

export function WeeklySummaryScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const [copied, setCopied] = useState(false);
  const [isGenerated, setIsGenerated] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [section1Open, setSection1Open] = useState(true);
  const [section2Open, setSection2Open] = useState(true);
  const [section3Open, setSection3Open] = useState(true);
  const [section4Open, setSection4Open] = useState(true);
  const [shareModalVisible, setShareModalVisible] = useState(false);
  const [shareSuccess, setShareSuccess] = useState(false);

  const weeklyHighlights = useRealtorStore((s) => s.weeklyHighlights);
  const transactions = useRealtorStore((s) => s.transactions);
  const activeTransactionId = useRealtorStore((s) => s.activeTransactionId);
  const activeTransaction = transactions.find((t) => t.id === activeTransactionId);

  const upcomingDeadlines = transactions
    .flatMap((t) =>
      t.deadlines
        .filter((d) => d.status === "upcoming" || d.status === "current")
        .map((d) => ({ ...d, address: t.address }))
    )
    .slice(0, 3);

  const completedThisWeek = transactions
    .flatMap((t) => t.deadlines.filter((d) => d.status === "completed"))
    .slice(-3);

  // Items that need attention (overdue items)
  const itemsNeedAttention = transactions
    .flatMap((t) =>
      t.deadlines
        .filter((d) => d.status === "overdue")
        .map((d) => ({ ...d, address: t.address, clientName: t.clientName }))
    );

  const generateSummaryText = () => {
    const clientName = activeTransaction?.clientName || "Valued Client";
    const address = activeTransaction?.address || "your property";

    let summary = `Hi ${clientName},\n\n`;
    summary += `Here is your weekly update for ${address}:\n\n`;

    summary += "COMPLETED THIS WEEK:\n";
    completedThisWeek.forEach((d) => {
      summary += `✓ ${d.label}\n`;
    });

    summary += "\nUPCOMING DEADLINES:\n";
    upcomingDeadlines.forEach((d) => {
      summary += `• ${d.label} - ${d.date}\n`;
    });

    if (itemsNeedAttention.length > 0) {
      summary += "\nITEMS THAT NEED ATTENTION:\n";
      itemsNeedAttention.forEach((d) => {
        summary += `⚠️ ${d.label} (${d.address})\n`;
      });
    }

    summary += "\nNEXT STEPS:\n";
    summary += "• We will continue to monitor all deadlines\n";
    summary += "• Will provide updates as milestones are completed\n";
    summary += "\nPlease let me know if you have any questions!\n";
    summary += "\nBest regards,\n[YOUR NAME]";

    return summary;
  };

  const getEmailSubject = () => {
    const address = activeTransaction?.address || "Your Property";
    return `Weekly Transaction Update - ${address}`;
  };

  const handleShareEmail = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const subject = encodeURIComponent(getEmailSubject());
    const body = encodeURIComponent(generateSummaryText());
    const clientEmail = ""; // Would be filled from client data

    const mailtoUrl = `mailto:${clientEmail}?subject=${subject}&body=${body}`;

    try {
      const canOpen = await Linking.canOpenURL(mailtoUrl);
      if (canOpen) {
        await Linking.openURL(mailtoUrl);
        setShareModalVisible(false);
        setShareSuccess(true);
        setTimeout(() => setShareSuccess(false), 3000);
      }
    } catch (error) {
      console.error("Error opening email:", error);
    }
  };

  const handleShareSMS = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const body = encodeURIComponent(generateSummaryText());
    const smsUrl = `sms:&body=${body}`;

    try {
      const canOpen = await Linking.canOpenURL(smsUrl);
      if (canOpen) {
        await Linking.openURL(smsUrl);
        setShareModalVisible(false);
        setShareSuccess(true);
        setTimeout(() => setShareSuccess(false), 3000);
      }
    } catch (error) {
      console.error("Error opening SMS:", error);
    }
  };

  const handleNativeShare = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const result = await Share.share({
        message: generateSummaryText(),
        title: getEmailSubject(),
      });

      if (result.action === Share.sharedAction) {
        setShareModalVisible(false);
        setShareSuccess(true);
        setTimeout(() => setShareSuccess(false), 3000);
      }
    } catch (error) {
      console.error("Error sharing:", error);
    }
  };

  const handleCopyToClipboard = async () => {
    await Clipboard.setStringAsync(generateSummaryText());
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setShareModalVisible(false);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const openShareModal = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setShareModalVisible(true);
  };

  const handleCopy = async () => {
    await Clipboard.setStringAsync(generateSummaryText());
    setCopied(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleGenerate = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsGenerating(true);

    // Simulate AI generation delay
    await new Promise((resolve) => setTimeout(resolve, 1000));

    setIsGenerated(true);
    setIsGenerating(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const CollapsibleSection = ({
    title,
    icon,
    iconColor,
    iconBg,
    children,
    isOpen,
    onToggle,
  }: {
    title: string;
    icon: keyof typeof Ionicons.glyphMap;
    iconColor: string;
    iconBg: string;
    children: React.ReactNode;
    isOpen: boolean;
    onToggle: () => void;
  }) => {
    return (
      <View className="mt-6">
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onToggle();
          }}
          className="flex-row items-center justify-between mb-4"
        >
          <View className="flex-row items-center flex-1">
            <View
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                backgroundColor: iconBg,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Ionicons name={icon} size={18} color={iconColor} />
            </View>
            <Text className="text-white text-lg font-semibold ml-3 flex-1">
              {title}
            </Text>
          </View>
          <Ionicons
            name={isOpen ? "chevron-up" : "chevron-down"}
            size={20}
            color="rgba(255, 255, 255, 0.5)"
          />
        </Pressable>

        {isOpen && (
          <Animated.View
            entering={FadeIn.springify()}
            exiting={FadeOut}
          >
            {children}
          </Animated.View>
        )}
      </View>
    );
  };

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
          <View className="flex-row items-center justify-between">
            <View>
              <Text
                style={{ color: "#FFB800", letterSpacing: 1 }}
                className="text-sm uppercase font-semibold"
              >
                Client-Ready
              </Text>
              <Text className="text-white text-2xl font-bold mt-1">
                Weekly Summary
              </Text>
            </View>
            {isGenerated && (
              <Pressable
                onPress={handleCopy}
                style={{
                  backgroundColor: copied
                    ? "rgba(16, 185, 129, 0.2)"
                    : "rgba(255,255,255,0.05)",
                  borderWidth: 1,
                  borderColor: copied ? "#10B981" : "rgba(255,255,255,0.1)",
                  paddingHorizontal: 16,
                  paddingVertical: 10,
                  borderRadius: 12,
                  flexDirection: "row",
                  alignItems: "center",
                }}
              >
                <Ionicons
                  name={copied ? "checkmark" : "copy"}
                  size={18}
                  color={copied ? "#10B981" : "#9CA3AF"}
                />
                <Text
                  style={{ color: copied ? "#10B981" : "#9CA3AF" }}
                  className="ml-2 font-semibold"
                >
                  {copied ? "Copied!" : "Copy All"}
                </Text>
              </Pressable>
            )}
          </View>
        </Animated.View>

        {/* Generate Summary Button */}
        {!isGenerated && (
          <Animated.View
            entering={FadeInUp.delay(200).springify()}
            className="mt-8"
          >
            <GlassCard glowColor="#FFB800" intensity="medium">
              <View className="items-center py-6">
                <View
                  style={{
                    width: 60,
                    height: 60,
                    borderRadius: 30,
                    backgroundColor: "rgba(255, 184, 0, 0.2)",
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: 16,
                  }}
                >
                  <Ionicons name="sparkles" size={28} color="#FFB800" />
                </View>
                <Text className="text-white text-lg font-semibold mb-2">
                  Generate Weekly Summary
                </Text>
                <Text style={{ color: "rgba(255, 255, 255, 0.7)" }} className="text-sm text-center mb-6">
                  Create a comprehensive client-ready report of this week&apos;s activity
                </Text>
                <GlowButton
                  title={isGenerating ? "Generating..." : "Generate Summary"}
                  onPress={handleGenerate}
                  variant="primary"
                  icon={isGenerating ? "sync" : "sparkles"}
                  loading={isGenerating}
                  size="lg"
                />
              </View>
            </GlassCard>
          </Animated.View>
        )}

        {/* Generated Summary Sections */}
        {isGenerated && (
          <>
            {/* Completed This Week */}
            <Animated.View entering={FadeInDown.delay(200).springify()}>
              <CollapsibleSection
                title="Completed This Week"
                icon="checkmark-done"
                iconColor="#10B981"
                iconBg="rgba(16, 185, 129, 0.2)"
                isOpen={section1Open}
                onToggle={() => setSection1Open(!section1Open)}
              >
                <GlassCard glowColor="#10B981" intensity="medium" animated={false}>
                  {completedThisWeek.map((deadline, index) => (
                    <View
                      key={deadline.id}
                      className={`flex-row items-center ${
                        index < completedThisWeek.length - 1 ? "mb-3" : ""
                      }`}
                    >
                      <View
                        style={{
                          width: 24,
                          height: 24,
                          borderRadius: 12,
                          backgroundColor: "#10B981",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                      </View>
                      <Text className="text-white text-base ml-3">
                        {deadline.label}
                      </Text>
                    </View>
                  ))}
                </GlassCard>
              </CollapsibleSection>
            </Animated.View>

            {/* Upcoming Deadlines */}
            <Animated.View entering={FadeInUp.delay(300).springify()}>
              <CollapsibleSection
                title="Upcoming Deadlines"
                icon="calendar"
                iconColor="#FFB800"
                iconBg="rgba(255, 184, 0, 0.2)"
                isOpen={section2Open}
                onToggle={() => setSection2Open(!section2Open)}
              >
                <GlassCard glowColor="#FFB800" intensity="medium" animated={false}>
                  {upcomingDeadlines.map((deadline, index) => (
                    <View
                      key={deadline.id}
                      className={`flex-row items-center justify-between ${
                        index < upcomingDeadlines.length - 1
                          ? "mb-4 pb-4 border-b border-white/10"
                          : ""
                      }`}
                    >
                      <View className="flex-1">
                        <Text className="text-white text-base font-medium">
                          {deadline.label}
                        </Text>
                        <Text className="text-white opacity-70 text-sm mt-1">
                          {deadline.address}
                        </Text>
                      </View>
                      <View
                        style={{
                          backgroundColor:
                            deadline.status === "current"
                              ? "rgba(255, 184, 0, 0.2)"
                              : "rgba(255,255,255,0.05)",
                          paddingHorizontal: 10,
                          paddingVertical: 4,
                          borderRadius: 8,
                        }}
                      >
                        <Text
                          style={{
                            color:
                              deadline.status === "current" ? "#FFB800" : "#9CA3AF",
                          }}
                          className="text-sm font-medium"
                        >
                          {deadline.date}
                        </Text>
                      </View>
                    </View>
                  ))}
                </GlassCard>
              </CollapsibleSection>
            </Animated.View>

            {/* Items That Need Attention */}
            {itemsNeedAttention.length > 0 && (
              <Animated.View entering={FadeInUp.delay(400).springify()}>
                <CollapsibleSection
                  title="Items That Need Attention"
                  icon="alert-circle"
                  iconColor="#EF4444"
                  iconBg="rgba(239, 68, 68, 0.2)"
                  isOpen={section3Open}
                  onToggle={() => setSection3Open(!section3Open)}
                >
                  <GlassCard glowColor="#EF4444" intensity="high" animated={false}>
                    {itemsNeedAttention.map((item, index) => (
                      <View
                        key={item.id}
                        className={`flex-row items-start ${
                          index < itemsNeedAttention.length - 1 ? "mb-4" : ""
                        }`}
                      >
                        <View
                          style={{
                            width: 8,
                            height: 8,
                            borderRadius: 4,
                            backgroundColor: "#EF4444",
                            marginTop: 6,
                            shadowColor: "#EF4444",
                            shadowOffset: { width: 0, height: 0 },
                            shadowOpacity: 0.8,
                            shadowRadius: 4,
                          }}
                        />
                        <View className="ml-3 flex-1">
                          <Text className="text-white text-base font-medium">
                            {item.label}
                          </Text>
                          <Text className="text-white opacity-70 text-sm mt-1">
                            {item.address} - {item.date}
                          </Text>
                        </View>
                      </View>
                    ))}
                  </GlassCard>
                </CollapsibleSection>
              </Animated.View>
            )}

            {/* Next Steps */}
            <Animated.View entering={FadeInUp.delay(500).springify()}>
              <CollapsibleSection
                title="Next Steps"
                icon="arrow-forward-circle"
                iconColor="#00D4FF"
                iconBg="rgba(0, 212, 255, 0.2)"
                isOpen={section4Open}
                onToggle={() => setSection4Open(!section4Open)}
              >
                <GlassCard glowColor="#00D4FF" intensity="low" animated={false}>
                  <View className="flex-row items-start mb-3">
                    <Ionicons
                      name="chevron-forward"
                      size={18}
                      color="#00D4FF"
                      style={{ marginTop: 2 }}
                    />
                    <Text className="text-gray-300 text-base ml-2 flex-1">
                      Continue monitoring all transaction deadlines
                    </Text>
                  </View>
                  <View className="flex-row items-start">
                    <Ionicons
                      name="chevron-forward"
                      size={18}
                      color="#00D4FF"
                      style={{ marginTop: 2 }}
                    />
                    <Text className="text-gray-300 text-base ml-2 flex-1">
                      Provide updates as milestones are completed
                    </Text>
                  </View>
                </GlassCard>
              </CollapsibleSection>
            </Animated.View>

            {/* Share Summary Button */}
            <Animated.View
              entering={FadeInUp.delay(600).springify()}
              className="mt-8"
            >
              <GlowButton
                title="Share Summary"
                onPress={openShareModal}
                variant="primary"
                icon="share"
                size="lg"
              />
            </Animated.View>

            {/* Footer branding */}
            <Animated.View
              entering={FadeInUp.delay(700).springify()}
              className="mt-6 items-center"
            >
              <Text className="text-gray-600 text-sm">
                Powered by Closing Room
              </Text>
            </Animated.View>
          </>
        )}

        {/* Success Toast */}
        {(copied || shareSuccess) && (
          <Animated.View
            entering={FadeInUp.springify()}
            exiting={FadeOut}
            style={{
              position: "absolute",
              bottom: 100,
              left: 20,
              right: 20,
              backgroundColor: "rgba(16, 185, 129, 0.95)",
              borderRadius: 12,
              paddingVertical: 14,
              paddingHorizontal: 16,
              flexDirection: "row",
              alignItems: "center",
              shadowColor: "#10B981",
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.5,
              shadowRadius: 12,
            }}
          >
            <Ionicons name="checkmark-circle" size={24} color="#FFFFFF" />
            <Text style={{ color: "#FFFFFF", marginLeft: 12, fontWeight: "600", fontSize: 16 }}>
              {copied ? "Summary copied to clipboard!" : "Summary shared successfully!"}
            </Text>
          </Animated.View>
        )}
      </ScrollView>

      {/* Share Modal */}
      <Modal
        visible={shareModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setShareModalVisible(false)}
      >
        <Pressable
          style={{
            flex: 1,
            backgroundColor: "rgba(0, 0, 0, 0.7)",
            justifyContent: "flex-end",
          }}
          onPress={() => setShareModalVisible(false)}
        >
          <Pressable
            onPress={(e) => e.stopPropagation()}
            style={{
              backgroundColor: "#1A1A2E",
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              paddingTop: 12,
              paddingBottom: insets.bottom + 20,
              paddingHorizontal: 20,
            }}
          >
            {/* Drag handle */}
            <View style={{ alignItems: "center", marginBottom: 16 }}>
              <View
                style={{
                  width: 40,
                  height: 4,
                  backgroundColor: "rgba(255, 255, 255, 0.3)",
                  borderRadius: 2,
                }}
              />
            </View>

            {/* Header */}
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
              <Text style={{ color: "#FFFFFF", fontSize: 20, fontWeight: "700" }}>
                Share Summary
              </Text>
              <Pressable
                onPress={() => setShareModalVisible(false)}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 16,
                  backgroundColor: "rgba(255, 255, 255, 0.1)",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Ionicons name="close" size={20} color="#9CA3AF" />
              </Pressable>
            </View>

            {/* Recipient Preview */}
            {activeTransaction && (
              <View
                style={{
                  backgroundColor: "rgba(255, 184, 0, 0.1)",
                  borderRadius: 12,
                  padding: 14,
                  marginBottom: 20,
                  borderWidth: 1,
                  borderColor: "rgba(255, 184, 0, 0.2)",
                }}
              >
                <Text style={{ color: "rgba(255, 255, 255, 0.6)", fontSize: 12, marginBottom: 4 }}>
                  SENDING TO
                </Text>
                <Text style={{ color: "#FFB800", fontSize: 16, fontWeight: "600" }}>
                  {activeTransaction.clientName}
                </Text>
                <Text style={{ color: "rgba(255, 255, 255, 0.7)", fontSize: 14, marginTop: 2 }}>
                  {activeTransaction.address}
                </Text>
              </View>
            )}

            {/* Share Options */}
            <View style={{ gap: 12 }}>
              {/* Email Option */}
              <Pressable
                onPress={handleShareEmail}
                style={({ pressed }) => ({
                  flexDirection: "row",
                  alignItems: "center",
                  backgroundColor: pressed ? "rgba(16, 185, 129, 0.2)" : "rgba(16, 185, 129, 0.1)",
                  borderRadius: 14,
                  padding: 16,
                  borderWidth: 1,
                  borderColor: "rgba(16, 185, 129, 0.3)",
                })}
              >
                <View
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 12,
                    backgroundColor: "rgba(16, 185, 129, 0.2)",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Ionicons name="mail" size={22} color="#10B981" />
                </View>
                <View style={{ marginLeft: 14, flex: 1 }}>
                  <Text style={{ color: "#FFFFFF", fontSize: 16, fontWeight: "600" }}>
                    Send via Email
                  </Text>
                  <Text style={{ color: "rgba(255, 255, 255, 0.6)", fontSize: 13, marginTop: 2 }}>
                    Opens your email app with summary
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="rgba(255, 255, 255, 0.4)" />
              </Pressable>

              {/* SMS Option */}
              <Pressable
                onPress={handleShareSMS}
                style={({ pressed }) => ({
                  flexDirection: "row",
                  alignItems: "center",
                  backgroundColor: pressed ? "rgba(59, 130, 246, 0.2)" : "rgba(59, 130, 246, 0.1)",
                  borderRadius: 14,
                  padding: 16,
                  borderWidth: 1,
                  borderColor: "rgba(59, 130, 246, 0.3)",
                })}
              >
                <View
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 12,
                    backgroundColor: "rgba(59, 130, 246, 0.2)",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Ionicons name="chatbubble" size={22} color="#3B82F6" />
                </View>
                <View style={{ marginLeft: 14, flex: 1 }}>
                  <Text style={{ color: "#FFFFFF", fontSize: 16, fontWeight: "600" }}>
                    Send via Text Message
                  </Text>
                  <Text style={{ color: "rgba(255, 255, 255, 0.6)", fontSize: 13, marginTop: 2 }}>
                    Opens Messages with summary
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="rgba(255, 255, 255, 0.4)" />
              </Pressable>

              {/* More Share Options */}
              <Pressable
                onPress={handleNativeShare}
                style={({ pressed }) => ({
                  flexDirection: "row",
                  alignItems: "center",
                  backgroundColor: pressed ? "rgba(168, 85, 247, 0.2)" : "rgba(168, 85, 247, 0.1)",
                  borderRadius: 14,
                  padding: 16,
                  borderWidth: 1,
                  borderColor: "rgba(168, 85, 247, 0.3)",
                })}
              >
                <View
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 12,
                    backgroundColor: "rgba(168, 85, 247, 0.2)",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Ionicons name="share-social" size={22} color="#A855F7" />
                </View>
                <View style={{ marginLeft: 14, flex: 1 }}>
                  <Text style={{ color: "#FFFFFF", fontSize: 16, fontWeight: "600" }}>
                    More Options
                  </Text>
                  <Text style={{ color: "rgba(255, 255, 255, 0.6)", fontSize: 13, marginTop: 2 }}>
                    WhatsApp, Slack, Notes, and more
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="rgba(255, 255, 255, 0.4)" />
              </Pressable>

              {/* Copy to Clipboard */}
              <Pressable
                onPress={handleCopyToClipboard}
                style={({ pressed }) => ({
                  flexDirection: "row",
                  alignItems: "center",
                  backgroundColor: pressed ? "rgba(255, 255, 255, 0.1)" : "rgba(255, 255, 255, 0.05)",
                  borderRadius: 14,
                  padding: 16,
                  borderWidth: 1,
                  borderColor: "rgba(255, 255, 255, 0.1)",
                })}
              >
                <View
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 12,
                    backgroundColor: "rgba(255, 255, 255, 0.1)",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Ionicons name="copy" size={22} color="#9CA3AF" />
                </View>
                <View style={{ marginLeft: 14, flex: 1 }}>
                  <Text style={{ color: "#FFFFFF", fontSize: 16, fontWeight: "600" }}>
                    Copy to Clipboard
                  </Text>
                  <Text style={{ color: "rgba(255, 255, 255, 0.6)", fontSize: 13, marginTop: 2 }}>
                    Paste anywhere you want
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="rgba(255, 255, 255, 0.4)" />
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}
