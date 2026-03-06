/**
 * Deal Context Memory Screen
 * Form for creating/editing deal contexts with notes, pasted text, and file uploads
 */

import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Modal,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import Animated, { FadeInDown, FadeIn } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as DocumentPicker from "expo-document-picker";
import { useDealContextStore, DealContext } from "../state/dealContextStore";
import { RootStackParamList } from "../types/navigation";

type DealContextMemoryRouteProp = RouteProp<RootStackParamList, "DealContextMemory">;

export function DealContextMemoryScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const route = useRoute<DealContextMemoryRouteProp>();

  const editContextId = route.params?.contextId;

  const dealContexts = useDealContextStore((s) => s.dealContexts);
  const addDealContext = useDealContextStore((s) => s.addDealContext);
  const updateDealContext = useDealContextStore((s) => s.updateDealContext);
  const deleteDealContext = useDealContextStore((s) => s.deleteDealContext);

  // Find existing context if editing
  const existingContext = editContextId
    ? dealContexts.find((c) => c.id === editContextId)
    : null;

  // Form state
  const [dealName, setDealName] = useState(existingContext?.dealName || "");
  const [address, setAddress] = useState(existingContext?.address || "");
  const [notes, setNotes] = useState(existingContext?.notes || "");
  const [pastedText, setPastedText] = useState(existingContext?.pastedText || "");
  const [fileUrls, setFileUrls] = useState<string[]>(existingContext?.fileUrls || []);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const handlePickFile = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const result = await DocumentPicker.getDocumentAsync({
        type: ["application/pdf", "image/*"],
        multiple: true,
      });

      if (!result.canceled && result.assets) {
        const newUrls = result.assets.map((asset) => asset.uri);
        setFileUrls((prev) => [...prev, ...newUrls]);
      }
    } catch (error) {
      console.error("[DealContextMemory] File pick error:", error);
    }
  };

  const removeFile = (url: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setFileUrls((prev) => prev.filter((f) => f !== url));
  };

  const handleSave = () => {
    if (!dealName.trim()) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const contextData = {
      dealName: dealName.trim(),
      address: address.trim(),
      notes: notes.trim(),
      pastedText: pastedText.trim(),
      fileUrls,
      extractedText: existingContext?.extractedText || "",
    };

    if (editContextId && existingContext) {
      updateDealContext(editContextId, contextData);
    } else {
      addDealContext(contextData);
    }

    navigation.goBack();
  };

  const handleDelete = () => {
    if (editContextId) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      deleteDealContext(editContextId);
      navigation.goBack();
    }
  };

  const canSave = dealName.trim().length > 0;

  return (
    <View className="flex-1 bg-[#0A0A0F]">
      <LinearGradient
        colors={["#0A0A0F", "#0F0F1A", "#0A0A0F"]}
        style={{ flex: 1 }}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ flex: 1 }}
        >
          {/* Header */}
          <View
            style={{ paddingTop: insets.top + 8 }}
            className="px-5 pb-4 border-b border-white/10"
          >
            <View className="flex-row items-center justify-between">
              <Pressable
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  navigation.goBack();
                }}
                className="w-10 h-10 rounded-full bg-white/10 items-center justify-center"
              >
                <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
              </Pressable>

              <Text className="text-white text-lg font-bold">
                {editContextId ? "Edit Deal Context" : "Add Deal Context"}
              </Text>

              {editContextId ? (
                <Pressable
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setShowDeleteModal(true);
                  }}
                  className="w-10 h-10 rounded-full bg-red-500/20 items-center justify-center"
                >
                  <Ionicons name="trash-outline" size={20} color="#EF4444" />
                </Pressable>
              ) : (
                <View className="w-10" />
              )}
            </View>
          </View>

          <ScrollView
            className="flex-1"
            contentContainerStyle={{ padding: 20, paddingBottom: 120 }}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Deal Name */}
            <Animated.View entering={FadeInDown.delay(100)}>
              <Text className="text-white/60 text-xs uppercase tracking-wide mb-2">
                Deal Name / Label *
              </Text>
              <TextInput
                value={dealName}
                onChangeText={setDealName}
                placeholder="e.g., 123 Maple St - Buyer offer round 2"
                placeholderTextColor="rgba(255, 255, 255, 0.3)"
                style={{
                  backgroundColor: "rgba(255, 255, 255, 0.05)",
                  borderWidth: 1,
                  borderColor: dealName.trim() ? "rgba(255, 184, 0, 0.3)" : "rgba(255, 255, 255, 0.1)",
                  borderRadius: 12,
                  padding: 14,
                  color: "#FFFFFF",
                  fontSize: 16,
                }}
              />
            </Animated.View>

            {/* Property Address */}
            <Animated.View entering={FadeInDown.delay(150)} className="mt-5">
              <Text className="text-white/60 text-xs uppercase tracking-wide mb-2">
                Property Address
              </Text>
              <TextInput
                value={address}
                onChangeText={setAddress}
                placeholder="e.g., 123 Maple Street, Austin, TX 78701"
                placeholderTextColor="rgba(255, 255, 255, 0.3)"
                style={{
                  backgroundColor: "rgba(255, 255, 255, 0.05)",
                  borderWidth: 1,
                  borderColor: "rgba(255, 255, 255, 0.1)",
                  borderRadius: 12,
                  padding: 14,
                  color: "#FFFFFF",
                  fontSize: 16,
                }}
              />
            </Animated.View>

            {/* Key Notes */}
            <Animated.View entering={FadeInDown.delay(200)} className="mt-5">
              <Text className="text-white/60 text-xs uppercase tracking-wide mb-2">
                Key Notes
              </Text>
              <TextInput
                value={notes}
                onChangeText={setNotes}
                placeholder="Key facts, numbers, objections, promises, or reminders..."
                placeholderTextColor="rgba(255, 255, 255, 0.3)"
                multiline
                numberOfLines={4}
                style={{
                  backgroundColor: "rgba(255, 255, 255, 0.05)",
                  borderWidth: 1,
                  borderColor: "rgba(255, 255, 255, 0.1)",
                  borderRadius: 12,
                  padding: 14,
                  color: "#FFFFFF",
                  fontSize: 15,
                  minHeight: 100,
                  textAlignVertical: "top",
                }}
              />
            </Animated.View>

            {/* Paste Email / Message */}
            <Animated.View entering={FadeInDown.delay(250)} className="mt-5">
              <Text className="text-white/60 text-xs uppercase tracking-wide mb-2">
                Paste Email / Message
              </Text>
              <TextInput
                value={pastedText}
                onChangeText={setPastedText}
                placeholder="Paste full email thread, text messages, or document content..."
                placeholderTextColor="rgba(255, 255, 255, 0.3)"
                multiline
                numberOfLines={6}
                style={{
                  backgroundColor: "rgba(255, 255, 255, 0.05)",
                  borderWidth: 1,
                  borderColor: "rgba(255, 255, 255, 0.1)",
                  borderRadius: 12,
                  padding: 14,
                  color: "#FFFFFF",
                  fontSize: 15,
                  minHeight: 140,
                  textAlignVertical: "top",
                }}
              />
            </Animated.View>

            {/* Upload Documents */}
            <Animated.View entering={FadeInDown.delay(300)} className="mt-5">
              <Text className="text-white/60 text-xs uppercase tracking-wide mb-2">
                Upload Documents
              </Text>

              <Pressable
                onPress={handlePickFile}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: "rgba(59, 130, 246, 0.15)",
                  borderWidth: 1,
                  borderColor: "rgba(59, 130, 246, 0.3)",
                  borderRadius: 12,
                  paddingVertical: 16,
                  borderStyle: "dashed",
                }}
              >
                <Ionicons name="cloud-upload" size={22} color="#3B82F6" />
                <Text style={{ color: "#3B82F6", fontSize: 15, fontWeight: "600", marginLeft: 10 }}>
                  Select PDF or Images
                </Text>
              </Pressable>

              {/* File List */}
              {fileUrls.length > 0 && (
                <View className="mt-3">
                  {fileUrls.map((url, index) => {
                    const fileName = url.split("/").pop() || "Document";
                    const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(fileName);
                    return (
                      <View
                        key={index}
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          justifyContent: "space-between",
                          backgroundColor: "rgba(255, 255, 255, 0.05)",
                          borderRadius: 10,
                          paddingHorizontal: 14,
                          paddingVertical: 12,
                          marginBottom: 8,
                        }}
                      >
                        <View style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
                          <Ionicons
                            name={isImage ? "image" : "document"}
                            size={20}
                            color={isImage ? "#A855F7" : "#3B82F6"}
                          />
                          <Text
                            numberOfLines={1}
                            style={{
                              color: "rgba(255, 255, 255, 0.8)",
                              fontSize: 14,
                              marginLeft: 10,
                              flex: 1,
                            }}
                          >
                            {fileName}
                          </Text>
                        </View>
                        <Pressable onPress={() => removeFile(url)} hitSlop={8}>
                          <Ionicons name="close-circle" size={22} color="#EF4444" />
                        </Pressable>
                      </View>
                    );
                  })}
                </View>
              )}

              <Text className="text-white/40 text-xs mt-3">
                Files are stored locally. Text extraction is available in future updates.
              </Text>
            </Animated.View>
          </ScrollView>

          {/* Save Button */}
          <View
            style={{ paddingBottom: insets.bottom + 16 }}
            className="px-5 pt-4 border-t border-white/10 bg-[#0A0A0F]/95"
          >
            <Pressable
              onPress={handleSave}
              disabled={!canSave}
              style={({ pressed }) => ({
                backgroundColor: canSave
                  ? pressed
                    ? "rgba(255, 184, 0, 0.8)"
                    : "#FFB800"
                  : "rgba(255, 255, 255, 0.1)",
                borderRadius: 14,
                paddingVertical: 16,
                alignItems: "center",
                opacity: canSave ? 1 : 0.5,
              })}
            >
              <Text
                style={{
                  color: canSave ? "#000000" : "rgba(255, 255, 255, 0.4)",
                  fontSize: 16,
                  fontWeight: "700",
                }}
              >
                {editContextId ? "Update Context" : "Save Context"}
              </Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>

        {/* Delete Confirmation Modal */}
        <Modal
          visible={showDeleteModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowDeleteModal(false)}
        >
          <Pressable
            className="flex-1 bg-black/70 justify-center items-center px-6"
            onPress={() => setShowDeleteModal(false)}
          >
            <Pressable
              onPress={(e) => e.stopPropagation()}
              className="bg-[#1A1A2E] w-full rounded-2xl p-6 border border-white/10"
            >
              <View className="items-center mb-4">
                <View className="w-16 h-16 rounded-full bg-red-500/20 items-center justify-center mb-4">
                  <Ionicons name="trash" size={32} color="#EF4444" />
                </View>
                <Text className="text-white text-xl font-bold text-center">Delete Deal Context?</Text>
                <Text className="text-white/60 text-center mt-2">
                  This will permanently delete {dealName} and cannot be undone.
                </Text>
              </View>

              <View className="flex-row mt-4" style={{ gap: 12 }}>
                <Pressable
                  onPress={() => setShowDeleteModal(false)}
                  className="flex-1 bg-white/10 rounded-xl py-4 items-center"
                >
                  <Text className="text-white font-semibold">Cancel</Text>
                </Pressable>
                <Pressable
                  onPress={handleDelete}
                  className="flex-1 bg-red-500 rounded-xl py-4 items-center"
                >
                  <Text className="text-white font-semibold">Delete</Text>
                </Pressable>
              </View>
            </Pressable>
          </Pressable>
        </Modal>
      </LinearGradient>
    </View>
  );
}
