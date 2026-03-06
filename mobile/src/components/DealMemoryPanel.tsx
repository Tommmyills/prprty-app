/**
 * Deal Memory Panel
 * Collapsible panel for storing deal-related information during live negotiations
 * Includes: Quick Notes, Paste Text, File Upload, Photo/Screenshot
 */

import React, { useState } from "react";
import {
  View,
  Text,
  Pressable,
  TextInput,
  ScrollView,
  Image,
  Alert,
} from "react-native";
import Animated, {
  FadeIn,
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import { useDealMemoryStore } from "../state/dealMemoryStore";

interface DealMemoryPanelProps {
  isExpanded: boolean;
  onToggle: () => void;
}

export function DealMemoryPanel({ isExpanded, onToggle }: DealMemoryPanelProps) {
  const [activeTab, setActiveTab] = useState<"notes" | "paste" | "files" | "photos">("notes");

  const notesText = useDealMemoryStore((s) => s.memory.notesText);
  const pastedText = useDealMemoryStore((s) => s.memory.pastedText);
  const fileUrls = useDealMemoryStore((s) => s.memory.fileUrls);
  const imageUrls = useDealMemoryStore((s) => s.memory.imageUrls);

  const setNotesText = useDealMemoryStore((s) => s.setNotesText);
  const setPastedText = useDealMemoryStore((s) => s.setPastedText);
  const addFileUrl = useDealMemoryStore((s) => s.addFileUrl);
  const removeFileUrl = useDealMemoryStore((s) => s.removeFileUrl);
  const addImageUrl = useDealMemoryStore((s) => s.addImageUrl);
  const removeImageUrl = useDealMemoryStore((s) => s.removeImageUrl);

  // Count total items in memory
  const itemCount =
    (notesText.trim() ? 1 : 0) +
    (pastedText.trim() ? 1 : 0) +
    fileUrls.length +
    imageUrls.length;

  const handlePickFile = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const result = await DocumentPicker.getDocumentAsync({
        type: ["application/pdf", "image/*"],
        multiple: true,
      });

      if (!result.canceled && result.assets) {
        result.assets.forEach((asset) => {
          addFileUrl(asset.uri);
        });
      }
    } catch (error) {
      console.error("[DealMemory] File pick error:", error);
    }
  };

  const handleTakePhoto = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission Required", "Camera permission is needed to take photos.");
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        addImageUrl(result.assets[0].uri);
      }
    } catch (error) {
      console.error("[DealMemory] Camera error:", error);
    }
  };

  const handlePickImage = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets) {
        result.assets.forEach((asset) => {
          addImageUrl(asset.uri);
        });
      }
    } catch (error) {
      console.error("[DealMemory] Image pick error:", error);
    }
  };

  const tabs = [
    { id: "notes" as const, label: "Notes", icon: "create-outline" as const },
    { id: "paste" as const, label: "Paste", icon: "clipboard-outline" as const },
    { id: "files" as const, label: "Files", icon: "document-outline" as const, count: fileUrls.length },
    { id: "photos" as const, label: "Photos", icon: "camera-outline" as const, count: imageUrls.length },
  ];

  return (
    <View className="mx-5 mb-4">
      {/* Header - Always Visible */}
      <Pressable
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onToggle();
        }}
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          backgroundColor: "rgba(255, 184, 0, 0.1)",
          borderWidth: 1,
          borderColor: "rgba(255, 184, 0, 0.2)",
          borderRadius: 12,
          paddingHorizontal: 14,
          paddingVertical: 12,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <View
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              backgroundColor: "rgba(255, 184, 0, 0.2)",
              alignItems: "center",
              justifyContent: "center",
              marginRight: 10,
            }}
          >
            <Ionicons name="folder-open" size={18} color="#FFB800" />
          </View>
          <View>
            <Text style={{ color: "#FFB800", fontSize: 14, fontWeight: "600" }}>
              Deal Memory
            </Text>
            <Text style={{ color: "rgba(255, 255, 255, 0.5)", fontSize: 11 }}>
              {itemCount > 0 ? `${itemCount} item${itemCount > 1 ? "s" : ""} stored` : "Tap to expand"}
            </Text>
          </View>
        </View>

        <View style={{ flexDirection: "row", alignItems: "center" }}>
          {itemCount > 0 && (
            <View
              style={{
                backgroundColor: "#FFB800",
                paddingHorizontal: 8,
                paddingVertical: 2,
                borderRadius: 10,
                marginRight: 8,
              }}
            >
              <Text style={{ color: "#000", fontSize: 11, fontWeight: "700" }}>
                {itemCount}
              </Text>
            </View>
          )}
          <Ionicons
            name={isExpanded ? "chevron-up" : "chevron-down"}
            size={20}
            color="rgba(255, 255, 255, 0.5)"
          />
        </View>
      </Pressable>

      {/* Expanded Content */}
      {isExpanded && (
        <Animated.View
          entering={FadeIn.duration(200)}
          exiting={FadeOut.duration(150)}
          style={{
            backgroundColor: "rgba(255, 255, 255, 0.03)",
            borderWidth: 1,
            borderTopWidth: 0,
            borderColor: "rgba(255, 184, 0, 0.15)",
            borderBottomLeftRadius: 12,
            borderBottomRightRadius: 12,
            paddingTop: 12,
            paddingBottom: 16,
            paddingHorizontal: 14,
          }}
        >
          {/* Tabs */}
          <View style={{ flexDirection: "row", marginBottom: 12 }}>
            {tabs.map((tab) => (
              <Pressable
                key={tab.id}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setActiveTab(tab.id);
                }}
                style={{
                  flex: 1,
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                  paddingVertical: 8,
                  borderRadius: 8,
                  backgroundColor:
                    activeTab === tab.id ? "rgba(255, 184, 0, 0.2)" : "transparent",
                  marginRight: tab.id !== "photos" ? 4 : 0,
                }}
              >
                <Ionicons
                  name={tab.icon}
                  size={16}
                  color={activeTab === tab.id ? "#FFB800" : "rgba(255, 255, 255, 0.5)"}
                />
                {tab.count !== undefined && tab.count > 0 && (
                  <View
                    style={{
                      backgroundColor: "#FFB800",
                      width: 14,
                      height: 14,
                      borderRadius: 7,
                      alignItems: "center",
                      justifyContent: "center",
                      marginLeft: 4,
                    }}
                  >
                    <Text style={{ color: "#000", fontSize: 9, fontWeight: "700" }}>
                      {tab.count}
                    </Text>
                  </View>
                )}
              </Pressable>
            ))}
          </View>

          {/* Tab Content */}
          {activeTab === "notes" && (
            <View>
              <Text style={{ color: "rgba(255, 255, 255, 0.6)", fontSize: 11, marginBottom: 6 }}>
                Add Notes
              </Text>
              <TextInput
                value={notesText}
                onChangeText={setNotesText}
                placeholder="Type key facts, numbers, promises, objections, or reminders..."
                placeholderTextColor="rgba(255, 255, 255, 0.3)"
                multiline
                numberOfLines={4}
                style={{
                  backgroundColor: "rgba(255, 255, 255, 0.05)",
                  borderWidth: 1,
                  borderColor: "rgba(255, 255, 255, 0.1)",
                  borderRadius: 10,
                  padding: 12,
                  color: "#FFFFFF",
                  fontSize: 14,
                  minHeight: 100,
                  textAlignVertical: "top",
                }}
              />
            </View>
          )}

          {activeTab === "paste" && (
            <View>
              <Text style={{ color: "rgba(255, 255, 255, 0.6)", fontSize: 11, marginBottom: 6 }}>
                Paste Email or Text
              </Text>
              <TextInput
                value={pastedText}
                onChangeText={setPastedText}
                placeholder="Paste email, message, or document text here..."
                placeholderTextColor="rgba(255, 255, 255, 0.3)"
                multiline
                numberOfLines={6}
                style={{
                  backgroundColor: "rgba(255, 255, 255, 0.05)",
                  borderWidth: 1,
                  borderColor: "rgba(255, 255, 255, 0.1)",
                  borderRadius: 10,
                  padding: 12,
                  color: "#FFFFFF",
                  fontSize: 14,
                  minHeight: 120,
                  textAlignVertical: "top",
                }}
              />
            </View>
          )}

          {activeTab === "files" && (
            <View>
              <Text style={{ color: "rgba(255, 255, 255, 0.6)", fontSize: 11, marginBottom: 6 }}>
                Upload Files
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
                  borderRadius: 10,
                  paddingVertical: 14,
                  marginBottom: 10,
                }}
              >
                <Ionicons name="cloud-upload" size={20} color="#3B82F6" />
                <Text style={{ color: "#3B82F6", fontSize: 14, fontWeight: "600", marginLeft: 8 }}>
                  Select PDF or Image
                </Text>
              </Pressable>

              {/* File List */}
              {fileUrls.length > 0 && (
                <View style={{ marginTop: 4 }}>
                  {fileUrls.map((url, index) => {
                    const fileName = url.split("/").pop() || "File";
                    return (
                      <View
                        key={index}
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          justifyContent: "space-between",
                          backgroundColor: "rgba(255, 255, 255, 0.05)",
                          borderRadius: 8,
                          paddingHorizontal: 12,
                          paddingVertical: 10,
                          marginBottom: 6,
                        }}
                      >
                        <View style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
                          <Ionicons name="document" size={18} color="#3B82F6" />
                          <Text
                            numberOfLines={1}
                            style={{
                              color: "rgba(255, 255, 255, 0.8)",
                              fontSize: 13,
                              marginLeft: 8,
                              flex: 1,
                            }}
                          >
                            {fileName}
                          </Text>
                        </View>
                        <Pressable
                          onPress={() => removeFileUrl(url)}
                          hitSlop={8}
                        >
                          <Ionicons name="close-circle" size={20} color="#EF4444" />
                        </Pressable>
                      </View>
                    );
                  })}
                </View>
              )}
            </View>
          )}

          {activeTab === "photos" && (
            <View>
              <Text style={{ color: "rgba(255, 255, 255, 0.6)", fontSize: 11, marginBottom: 6 }}>
                Take Photo or Screenshot
              </Text>

              <View style={{ flexDirection: "row", marginBottom: 10 }}>
                <Pressable
                  onPress={handleTakePhoto}
                  style={{
                    flex: 1,
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: "rgba(16, 185, 129, 0.15)",
                    borderWidth: 1,
                    borderColor: "rgba(16, 185, 129, 0.3)",
                    borderRadius: 10,
                    paddingVertical: 14,
                    marginRight: 8,
                  }}
                >
                  <Ionicons name="camera" size={20} color="#10B981" />
                  <Text style={{ color: "#10B981", fontSize: 13, fontWeight: "600", marginLeft: 6 }}>
                    Camera
                  </Text>
                </Pressable>

                <Pressable
                  onPress={handlePickImage}
                  style={{
                    flex: 1,
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: "rgba(168, 85, 247, 0.15)",
                    borderWidth: 1,
                    borderColor: "rgba(168, 85, 247, 0.3)",
                    borderRadius: 10,
                    paddingVertical: 14,
                  }}
                >
                  <Ionicons name="images" size={20} color="#A855F7" />
                  <Text style={{ color: "#A855F7", fontSize: 13, fontWeight: "600", marginLeft: 6 }}>
                    Gallery
                  </Text>
                </Pressable>
              </View>

              {/* Image Grid */}
              {imageUrls.length > 0 && (
                <View style={{ flexDirection: "row", flexWrap: "wrap", marginTop: 4 }}>
                  {imageUrls.map((url, index) => (
                    <View
                      key={index}
                      style={{
                        width: "31%",
                        aspectRatio: 1,
                        marginRight: (index + 1) % 3 === 0 ? 0 : "3.5%",
                        marginBottom: 8,
                        borderRadius: 8,
                        overflow: "hidden",
                        position: "relative",
                      }}
                    >
                      <Image
                        source={{ uri: url }}
                        style={{ width: "100%", height: "100%" }}
                        resizeMode="cover"
                      />
                      <Pressable
                        onPress={() => removeImageUrl(url)}
                        style={{
                          position: "absolute",
                          top: 4,
                          right: 4,
                          backgroundColor: "rgba(0, 0, 0, 0.6)",
                          borderRadius: 10,
                          padding: 2,
                        }}
                      >
                        <Ionicons name="close" size={14} color="#FFFFFF" />
                      </Pressable>
                    </View>
                  ))}
                </View>
              )}
            </View>
          )}
        </Animated.View>
      )}
    </View>
  );
}
