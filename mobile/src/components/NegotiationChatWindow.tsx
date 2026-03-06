/**
 * NegotiationChatWindow - Draggable AI Assistant Window for Live Coaching
 * Shows bot responses and user transcriptions with text input and file/camera options
 */

import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  ScrollView,
  Pressable,
  Dimensions,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
} from "react-native-reanimated";
import {
  Gesture,
  GestureDetector,
} from "react-native-gesture-handler";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get("window");

// Window height states
const MIN_HEIGHT = 80;
const COLLAPSED_HEIGHT = 80;
const HALF_HEIGHT = SCREEN_HEIGHT * 0.35;
const MAX_HEIGHT = SCREEN_HEIGHT * 0.6;

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  type?: "transcription" | "typed" | "response";
}

interface NegotiationChatWindowProps {
  messages: ChatMessage[];
  onSendMessage?: (text: string) => void;
  onAddImage?: (uri: string) => void;
  onAddFile?: (uri: string) => void;
  lastTranscription?: string;
  isListening?: boolean;
}

export function NegotiationChatWindow({
  messages,
  onSendMessage,
  onAddImage,
  onAddFile,
  lastTranscription,
  isListening = false,
}: NegotiationChatWindowProps) {
  const insets = useSafeAreaInsets();
  const scrollViewRef = useRef<ScrollView>(null);
  const [inputText, setInputText] = useState("");
  const [isExpanded, setIsExpanded] = useState(false);

  // Animation values
  const windowHeight = useSharedValue(COLLAPSED_HEIGHT);
  const windowY = useSharedValue(SCREEN_HEIGHT - COLLAPSED_HEIGHT - insets.bottom - 140);
  const dragContext = useSharedValue({ startY: 0, startHeight: 0 });

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages]);

  // Animated styles
  const windowStyle = useAnimatedStyle(() => ({
    height: windowHeight.value,
    transform: [{ translateY: windowY.value }],
  }));

  // Handle height expansion from drag
  const expandWindow = (expanded: boolean) => {
    setIsExpanded(expanded);
  };

  // Drag gesture for resizing
  const dragGesture = Gesture.Pan()
    .onStart(() => {
      dragContext.value = {
        startY: windowY.value,
        startHeight: windowHeight.value,
      };
    })
    .onUpdate((event) => {
      // Dragging up increases height, dragging down decreases
      const newHeight = dragContext.value.startHeight - event.translationY;
      const clampedHeight = Math.max(MIN_HEIGHT, Math.min(MAX_HEIGHT, newHeight));
      windowHeight.value = clampedHeight;

      // Adjust Y position to keep bottom anchored
      const baseY = SCREEN_HEIGHT - insets.bottom - 140;
      windowY.value = baseY - clampedHeight + COLLAPSED_HEIGHT;
    })
    .onEnd((event) => {
      // Snap to nearest height state
      const currentHeight = windowHeight.value;
      const velocity = event.velocityY;

      let targetHeight: number;

      if (Math.abs(velocity) > 500) {
        // Fast swipe - expand or collapse based on direction
        targetHeight = velocity < 0 ? HALF_HEIGHT : COLLAPSED_HEIGHT;
      } else {
        // Snap to nearest
        const distToCollapsed = Math.abs(currentHeight - COLLAPSED_HEIGHT);
        const distToHalf = Math.abs(currentHeight - HALF_HEIGHT);
        const distToMax = Math.abs(currentHeight - MAX_HEIGHT);

        if (distToCollapsed < distToHalf && distToCollapsed < distToMax) {
          targetHeight = COLLAPSED_HEIGHT;
        } else if (distToHalf < distToMax) {
          targetHeight = HALF_HEIGHT;
        } else {
          targetHeight = MAX_HEIGHT;
        }
      }

      windowHeight.value = withSpring(targetHeight, { damping: 20, stiffness: 200 });
      const baseY = SCREEN_HEIGHT - insets.bottom - 140;
      windowY.value = withSpring(baseY - targetHeight + COLLAPSED_HEIGHT, { damping: 20, stiffness: 200 });

      runOnJS(expandWindow)(targetHeight > COLLAPSED_HEIGHT);
      runOnJS(Haptics.impactAsync)(Haptics.ImpactFeedbackStyle.Light);
    });

  // Toggle expand/collapse
  const toggleExpand = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const targetHeight = isExpanded ? COLLAPSED_HEIGHT : HALF_HEIGHT;
    windowHeight.value = withSpring(targetHeight, { damping: 20, stiffness: 200 });
    const baseY = SCREEN_HEIGHT - insets.bottom - 140;
    windowY.value = withSpring(baseY - targetHeight + COLLAPSED_HEIGHT, { damping: 20, stiffness: 200 });
    setIsExpanded(!isExpanded);
  };

  // Send message handler
  const handleSend = () => {
    if (inputText.trim() && onSendMessage) {
      onSendMessage(inputText.trim());
      setInputText("");
      Keyboard.dismiss();
    }
  };

  // Camera handler
  const handleCamera = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== "granted") return;

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0] && onAddImage) {
        onAddImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error("[NegotiationChat] Camera error:", error);
    }
  };

  // File picker handler
  const handleFilePick = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const result = await DocumentPicker.getDocumentAsync({
        type: ["application/pdf", "image/*"],
      });

      if (!result.canceled && result.assets?.[0] && onAddFile) {
        onAddFile(result.assets[0].uri);
      }
    } catch (error) {
      console.error("[NegotiationChat] File pick error:", error);
    }
  };

  return (
    <GestureDetector gesture={dragGesture}>
      <Animated.View
        style={[
          windowStyle,
          {
            position: "absolute",
            left: 16,
            right: 16,
            zIndex: 1000,
          },
        ]}
      >
        <BlurView
          intensity={40}
          tint="dark"
          style={{
            flex: 1,
            borderRadius: 20,
            overflow: "hidden",
          }}
        >
          <LinearGradient
            colors={["rgba(20, 20, 35, 0.95)", "rgba(15, 15, 25, 0.98)"]}
            style={{
              flex: 1,
              borderRadius: 20,
              borderWidth: 1,
              borderColor: isListening ? "rgba(52, 211, 153, 0.3)" : "rgba(255, 184, 0, 0.2)",
            }}
          >
            {/* Drag Handle */}
            <Pressable onPress={toggleExpand}>
              <View style={{ alignItems: "center", paddingTop: 10, paddingBottom: 6 }}>
                <View
                  style={{
                    width: 36,
                    height: 4,
                    borderRadius: 2,
                    backgroundColor: isListening ? "rgba(52, 211, 153, 0.4)" : "rgba(255, 184, 0, 0.4)",
                  }}
                />
              </View>

              {/* Collapsed Header */}
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  paddingHorizontal: 14,
                  paddingBottom: 10,
                }}
              >
                <View
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 16,
                    backgroundColor: isListening ? "rgba(52, 211, 153, 0.15)" : "rgba(255, 184, 0, 0.15)",
                    alignItems: "center",
                    justifyContent: "center",
                    marginRight: 10,
                  }}
                >
                  <Ionicons
                    name="chatbubbles"
                    size={16}
                    color={isListening ? "#34D399" : "#FFB800"}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: "#FFFFFF", fontSize: 13, fontWeight: "600" }}>
                    AI Assistant
                  </Text>
                  {lastTranscription && !isExpanded && (
                    <Text
                      numberOfLines={1}
                      style={{ color: "rgba(255, 255, 255, 0.5)", fontSize: 11, marginTop: 2 }}
                    >
                      {lastTranscription}
                    </Text>
                  )}
                </View>
                <Ionicons
                  name={isExpanded ? "chevron-down" : "chevron-up"}
                  size={18}
                  color="rgba(255, 255, 255, 0.4)"
                />
              </View>
            </Pressable>

            {/* Expanded Content */}
            {isExpanded && (
              <View style={{ flex: 1 }}>
                {/* Messages List */}
                <ScrollView
                  ref={scrollViewRef}
                  style={{ flex: 1 }}
                  contentContainerStyle={{ padding: 12, paddingBottom: 8 }}
                  showsVerticalScrollIndicator={false}
                  keyboardShouldPersistTaps="handled"
                >
                  {messages.map((msg) => (
                    <View
                      key={msg.id}
                      style={{
                        marginBottom: 10,
                        alignItems: msg.role === "user" ? "flex-end" : "flex-start",
                      }}
                    >
                      <View
                        style={{
                          maxWidth: "85%",
                          backgroundColor:
                            msg.role === "user"
                              ? "rgba(255, 184, 0, 0.15)"
                              : "rgba(52, 211, 153, 0.12)",
                          borderRadius: 14,
                          borderBottomRightRadius: msg.role === "user" ? 4 : 14,
                          borderBottomLeftRadius: msg.role === "assistant" ? 4 : 14,
                          paddingHorizontal: 12,
                          paddingVertical: 8,
                          borderWidth: 1,
                          borderColor:
                            msg.role === "user"
                              ? "rgba(255, 184, 0, 0.2)"
                              : "rgba(52, 211, 153, 0.15)",
                        }}
                      >
                        {msg.type === "transcription" && (
                          <Text
                            style={{
                              color: "rgba(255, 184, 0, 0.6)",
                              fontSize: 9,
                              fontWeight: "600",
                              marginBottom: 2,
                            }}
                          >
                            HEARD
                          </Text>
                        )}
                        <Text
                          selectable={true}
                          style={{
                            color: msg.role === "user" ? "#FFB800" : "#34D399",
                            fontSize: 13,
                            lineHeight: 18,
                          }}
                        >
                          {msg.content}
                        </Text>
                      </View>
                      <Text
                        style={{
                          color: "rgba(255, 255, 255, 0.3)",
                          fontSize: 9,
                          marginTop: 2,
                          marginHorizontal: 4,
                        }}
                      >
                        {msg.timestamp.toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </Text>
                    </View>
                  ))}

                  {/* Show last transcription if available */}
                  {lastTranscription && (
                    <View style={{ marginTop: 8 }}>
                      <Text style={{ color: "rgba(255, 255, 255, 0.4)", fontSize: 10, marginBottom: 4 }}>
                        Last heard:
                      </Text>
                      <Text
                        selectable={true}
                        style={{
                          color: "rgba(255, 255, 255, 0.6)",
                          fontSize: 12,
                          fontStyle: "italic",
                        }}
                      >
                        {`"${lastTranscription}"`}
                      </Text>
                    </View>
                  )}
                </ScrollView>

                {/* Input Area */}
                <KeyboardAvoidingView
                  behavior={Platform.OS === "ios" ? "padding" : undefined}
                  keyboardVerticalOffset={100}
                >
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "flex-end",
                      paddingHorizontal: 10,
                      paddingBottom: 10,
                      paddingTop: 6,
                      borderTopWidth: 1,
                      borderTopColor: "rgba(255, 255, 255, 0.06)",
                    }}
                  >
                    {/* Camera Button */}
                    <Pressable
                      onPress={handleCamera}
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 18,
                        backgroundColor: "rgba(255, 255, 255, 0.06)",
                        alignItems: "center",
                        justifyContent: "center",
                        marginRight: 6,
                      }}
                    >
                      <Ionicons name="camera" size={18} color="rgba(255, 255, 255, 0.5)" />
                    </Pressable>

                    {/* File Button */}
                    <Pressable
                      onPress={handleFilePick}
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 18,
                        backgroundColor: "rgba(255, 255, 255, 0.06)",
                        alignItems: "center",
                        justifyContent: "center",
                        marginRight: 8,
                      }}
                    >
                      <Ionicons name="attach" size={18} color="rgba(255, 255, 255, 0.5)" />
                    </Pressable>

                    {/* Text Input */}
                    <View
                      style={{
                        flex: 1,
                        flexDirection: "row",
                        alignItems: "flex-end",
                        backgroundColor: "rgba(255, 255, 255, 0.06)",
                        borderRadius: 20,
                        paddingHorizontal: 14,
                        paddingVertical: 8,
                        minHeight: 40,
                        maxHeight: 100,
                      }}
                    >
                      <TextInput
                        value={inputText}
                        onChangeText={setInputText}
                        placeholder="Type a message..."
                        placeholderTextColor="rgba(255, 255, 255, 0.3)"
                        multiline
                        style={{
                          flex: 1,
                          color: "#FFFFFF",
                          fontSize: 14,
                          maxHeight: 80,
                          paddingTop: 0,
                          paddingBottom: 0,
                        }}
                      />
                    </View>

                    {/* Send Button */}
                    <Pressable
                      onPress={handleSend}
                      disabled={!inputText.trim()}
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 18,
                        backgroundColor: inputText.trim()
                          ? "#FFB800"
                          : "rgba(255, 255, 255, 0.06)",
                        alignItems: "center",
                        justifyContent: "center",
                        marginLeft: 8,
                      }}
                    >
                      <Ionicons
                        name="send"
                        size={16}
                        color={inputText.trim() ? "#000000" : "rgba(255, 255, 255, 0.3)"}
                      />
                    </Pressable>
                  </View>
                </KeyboardAvoidingView>
              </View>
            )}
          </LinearGradient>
        </BlurView>
      </Animated.View>
    </GestureDetector>
  );
}
