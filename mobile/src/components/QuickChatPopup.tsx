/**
 * Quick Chat Popup
 * Small popup window for quick assistant conversations
 * Shows text, allows copy/paste, clear, save
 * Supports switching between Claude, ChatGPT, and Gemini
 * Swipe down to close
 */

import React, { useRef, useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  ActivityIndicator,
  Keyboard,
  Dimensions,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  FadeIn,
  FadeOut,
  SlideInDown,
  SlideOutDown,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
} from "react-native-reanimated";
import { PanGestureHandler, PanGestureHandlerGestureEvent, State, HandlerStateChangeEvent, PanGestureHandlerEventPayload } from "react-native-gesture-handler";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as Clipboard from "expo-clipboard";
import { Audio } from "expo-av";
import { transcribeAudio } from "../api/transcribe-audio";
import {
  AssistantMessage,
  AIProvider,
  getProviderDisplayName,
  getProviderColor,
} from "../services/multiAIAssistant";
import { sendToHomepageAgent, AgentMessage } from "../services/homepageAgent";
import { speakThroughSpeaker, stopSpeakerAudio } from "../services/speakerAudio";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

interface QuickChatPopupProps {
  visible: boolean;
  onClose: () => void;
  messages: AssistantMessage[];
  setMessages: React.Dispatch<React.SetStateAction<AssistantMessage[]>>;
  selectedProvider: AIProvider;
  onProviderChange: (provider: AIProvider) => void;
  isPaused?: boolean;
  onPauseToggle?: () => void;
  isMuted?: boolean;
  onMuteToggle?: () => void;
}

const AI_PROVIDERS: AIProvider[] = ["claude", "openai", "gemini"];

export function QuickChatPopup({
  visible,
  onClose,
  messages,
  setMessages,
  selectedProvider,
  onProviderChange,
  isPaused = false,
  onPauseToggle,
  isMuted = false,
  onMuteToggle,
}: QuickChatPopupProps) {
  const insets = useSafeAreaInsets();
  const scrollViewRef = useRef<ScrollView>(null);
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const recordingRef = useRef<Audio.Recording | null>(null);

  // Swipe to close gesture
  const translateY = useSharedValue(0);
  const POPUP_HEIGHT = SCREEN_HEIGHT * 0.45;
  const DISMISS_THRESHOLD = 100;

  // Reset position when popup becomes visible
  useEffect(() => {
    if (visible) {
      translateY.value = 0;
    }
  }, [visible]);

  const onGestureEvent = (event: PanGestureHandlerGestureEvent) => {
    const { translationY } = event.nativeEvent;
    // Only allow dragging down (positive Y)
    if (translationY > 0) {
      translateY.value = translationY;
    }
  };

  const onHandlerStateChange = (event: HandlerStateChangeEvent<PanGestureHandlerEventPayload>) => {
    if (event.nativeEvent.state === State.END) {
      const { translationY, velocityY } = event.nativeEvent;

      // Close if dragged past threshold or with fast velocity
      if (translationY > DISMISS_THRESHOLD || velocityY > 500) {
        translateY.value = withTiming(POPUP_HEIGHT, { duration: 200 });
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        runOnJS(handleClose)();
      } else {
        // Snap back
        translateY.value = withSpring(0, { damping: 20, stiffness: 300 });
      }
    }
  };

  const animatedContainerStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  // Scroll to bottom when messages change
  useEffect(() => {
    if (messages.length > 0 && visible) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages.length, visible]);

  const handleClose = () => {
    stopSpeakerAudio();
    if (recordingRef.current) {
      recordingRef.current.stopAndUnloadAsync();
      recordingRef.current = null;
    }
    onClose();
  };

  // Clear conversation
  const handleClear = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setMessages([]);
  };

  // Save/Copy all conversation
  const handleSave = async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const text = messages
      .map((m) => `${m.role === "user" ? "You" : "Assistant"}: ${m.content}`)
      .join("\n\n");
    await Clipboard.setStringAsync(text);
  };

  // Pause/Resume handler
  const handlePause = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (onPauseToggle) {
      onPauseToggle();
    }
    // Also stop any ongoing speech when pausing
    if (!isPaused) {
      stopSpeakerAudio();
    }
  };

  // Mute/Unmute handler
  const handleMute = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (onMuteToggle) {
      onMuteToggle();
    }
    // Stop any ongoing speech when muting
    if (!isMuted) {
      stopSpeakerAudio();
    }
  };

  // Cycle to next AI provider
  const handleProviderChange = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const currentIndex = AI_PROVIDERS.indexOf(selectedProvider);
    const nextIndex = (currentIndex + 1) % AI_PROVIDERS.length;
    onProviderChange(AI_PROVIDERS[nextIndex]);
  };

  // Send text message - uses Homepage Agent for navigation and guidance
  const handleSend = async () => {
    if (!inputText.trim() || isLoading) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Keyboard.dismiss();

    const text = inputText.trim();
    setInputText("");

    const userMsg: AssistantMessage = {
      id: Date.now().toString(),
      role: "user",
      content: text,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);

    try {
      // Convert messages to AgentMessage format for homepage agent
      const agentMessages: AgentMessage[] = messages.map((m) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        timestamp: m.timestamp,
      }));

      // Use Homepage Agent for task-capable assistance
      const agentResponse = await sendToHomepageAgent(text, agentMessages);

      // Convert back to AssistantMessage format
      const response: AssistantMessage = {
        id: agentResponse.id,
        role: "assistant",
        content: agentResponse.content,
        timestamp: agentResponse.timestamp,
        provider: "claude",
      };

      setMessages((prev) => [...prev, response]);

      // Speak response through speaker
      await speakThroughSpeaker(response.content);
    } catch (error) {
      console.error("[QuickChat] Error:", error);
    }
    setIsLoading(false);
  };

  // Recording functions
  const startRecording = async () => {
    try {
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== "granted") return;

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        playThroughEarpieceAndroid: false,
      });

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      recordingRef.current = recording;
      setIsRecording(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    } catch (error) {
      console.error("[QuickChat] Recording error:", error);
    }
  };

  const stopRecording = async () => {
    if (!recordingRef.current) return;

    try {
      setIsRecording(false);
      setIsTranscribing(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      await recordingRef.current.stopAndUnloadAsync();

      // Set audio mode for playback through speaker
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        playThroughEarpieceAndroid: false,
        staysActiveInBackground: false,
        shouldDuckAndroid: true,
      });

      const uri = recordingRef.current.getURI();
      recordingRef.current = null;

      if (!uri) {
        setIsTranscribing(false);
        return;
      }

      const transcription = await transcribeAudio(uri);

      if (transcription && transcription.trim()) {
        const userMsg: AssistantMessage = {
          id: Date.now().toString(),
          role: "user",
          content: transcription.trim(),
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, userMsg]);
        setIsTranscribing(false);
        setIsLoading(true);

        // Convert messages to AgentMessage format for homepage agent
        const agentMessages: AgentMessage[] = messages.map((m) => ({
          id: m.id,
          role: m.role,
          content: m.content,
          timestamp: m.timestamp,
        }));

        // Use Homepage Agent for task-capable assistance
        const agentResponse = await sendToHomepageAgent(transcription.trim(), agentMessages);

        // Convert back to AssistantMessage format
        const response: AssistantMessage = {
          id: agentResponse.id,
          role: "assistant",
          content: agentResponse.content,
          timestamp: agentResponse.timestamp,
          provider: "claude",
        };

        setMessages((prev) => [...prev, response]);
        setIsLoading(false);

        // Speak response through speaker
        await speakThroughSpeaker(response.content);
      } else {
        setIsTranscribing(false);
      }
    } catch (error) {
      console.error("[QuickChat] Error:", error);
      setIsRecording(false);
      setIsTranscribing(false);
      setIsLoading(false);
    }
  };

  const handleMicPress = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  if (!visible) return null;

  const providerColor = getProviderColor(selectedProvider);
  const providerName = getProviderDisplayName(selectedProvider);

  return (
    <Animated.View
      entering={FadeIn.duration(150)}
      exiting={FadeOut.duration(150)}
      style={{
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        height: "40%",
        zIndex: 9998,
      }}
    >
      <PanGestureHandler
        onGestureEvent={onGestureEvent}
        onHandlerStateChange={onHandlerStateChange}
      >
        <Animated.View
          style={[
            {
              flex: 1,
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              overflow: "hidden",
            },
            animatedContainerStyle,
          ]}
        >
          <LinearGradient
            colors={["#1A1A2E", "#0F0F1A"]}
            style={{ flex: 1 }}
          >
            {/* Drag Handle */}
            <View
              style={{
                alignItems: "center",
                paddingTop: 8,
                paddingBottom: 4,
              }}
            >
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
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                paddingHorizontal: 16,
                paddingTop: 4,
                paddingBottom: 10,
                borderBottomWidth: 1,
                borderBottomColor: "rgba(255, 255, 255, 0.1)",
              }}
            >
              {/* AI Provider Selector */}
              <Pressable
                onPress={handleProviderChange}
              style={{
                flexDirection: "row",
                alignItems: "center",
                backgroundColor: `${providerColor}20`,
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 16,
                borderWidth: 1,
                borderColor: `${providerColor}40`,
              }}
            >
              <View
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: providerColor,
                  marginRight: 8,
                }}
              />
              <Text style={{ color: providerColor, fontSize: 14, fontWeight: "600" }}>
                {providerName}
              </Text>
              <Ionicons
                name="chevron-down"
                size={14}
                color={providerColor}
                style={{ marginLeft: 4 }}
              />
            </Pressable>

            <View style={{ flexDirection: "row", alignItems: "center" }}>
              {/* Pause button */}
              {onPauseToggle && (
                <Pressable
                  onPress={handlePause}
                  style={{
                    paddingHorizontal: 10,
                    paddingVertical: 6,
                    marginRight: 8,
                    flexDirection: "row",
                    alignItems: "center",
                    backgroundColor: isPaused ? "rgba(239, 68, 68, 0.2)" : "rgba(34, 197, 94, 0.2)",
                    borderRadius: 12,
                  }}
                >
                  <Ionicons
                    name={isPaused ? "play" : "pause"}
                    size={14}
                    color={isPaused ? "#EF4444" : "#22C55E"}
                    style={{ marginRight: 4 }}
                  />
                  <Text style={{ color: isPaused ? "#EF4444" : "#22C55E", fontSize: 13 }}>
                    {isPaused ? "Resume" : "Pause"}
                  </Text>
                </Pressable>
              )}

              {/* Mute button */}
              {onMuteToggle && (
                <Pressable
                  onPress={handleMute}
                  style={{
                    paddingHorizontal: 10,
                    paddingVertical: 6,
                    marginRight: 8,
                    flexDirection: "row",
                    alignItems: "center",
                    backgroundColor: isMuted ? "rgba(239, 68, 68, 0.2)" : "rgba(59, 130, 246, 0.2)",
                    borderRadius: 12,
                  }}
                >
                  <Ionicons
                    name={isMuted ? "volume-mute" : "volume-high"}
                    size={14}
                    color={isMuted ? "#EF4444" : "#3B82F6"}
                    style={{ marginRight: 4 }}
                  />
                  <Text style={{ color: isMuted ? "#EF4444" : "#3B82F6", fontSize: 13 }}>
                    {isMuted ? "Unmute" : "Mute"}
                  </Text>
                </Pressable>
              )}

              {/* Clear button */}
              <Pressable
                onPress={handleClear}
                style={{
                  paddingHorizontal: 10,
                  paddingVertical: 6,
                  marginRight: 8,
                }}
              >
                <Text style={{ color: "#9CA3AF", fontSize: 13 }}>Clear</Text>
              </Pressable>

              {/* Save button */}
              <Pressable
                onPress={handleSave}
                disabled={messages.length === 0}
                style={{
                  paddingHorizontal: 10,
                  paddingVertical: 6,
                  marginRight: 8,
                  opacity: messages.length === 0 ? 0.4 : 1,
                }}
              >
                <Text style={{ color: "#8B5CF6", fontSize: 13 }}>Copy All</Text>
              </Pressable>

              {/* Close button - prominent X */}
              <Pressable
                onPress={handleClose}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 16,
                  backgroundColor: "rgba(239, 68, 68, 0.2)",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Ionicons name="close" size={20} color="#EF4444" />
              </Pressable>
            </View>
          </View>

          {/* Messages */}
          <ScrollView
            ref={scrollViewRef}
            style={{ flex: 1 }}
            contentContainerStyle={{ padding: 12, paddingBottom: 8, flexGrow: 1 }}
            showsVerticalScrollIndicator={false}
            showsHorizontalScrollIndicator={false}
            horizontal={false}
            keyboardShouldPersistTaps="handled"
          >
            {messages.length === 0 && (
              <View style={{ alignItems: "center", paddingTop: 30 }}>
                <Ionicons name="chatbubbles-outline" size={32} color="rgba(255,255,255,0.2)" />
                <Text
                  style={{
                    color: "rgba(255, 255, 255, 0.4)",
                    fontSize: 13,
                    marginTop: 8,
                    textAlign: "center",
                  }}
                >
                  Speak or type to start
                </Text>
                <Text
                  style={{
                    color: providerColor,
                    fontSize: 12,
                    marginTop: 4,
                  }}
                >
                  Using {providerName}
                </Text>
              </View>
            )}

            {messages.map((msg) => (
              <View
                key={msg.id}
                style={{
                  alignItems: msg.role === "user" ? "flex-end" : "flex-start",
                  marginBottom: 10,
                  width: "100%",
                }}
              >
                <View
                  style={{
                    backgroundColor:
                      msg.role === "user"
                        ? "#FFB800"
                        : `${msg.provider ? getProviderColor(msg.provider) : providerColor}20`,
                    borderRadius: 14,
                    borderTopRightRadius: msg.role === "user" ? 4 : 14,
                    borderTopLeftRadius: msg.role === "user" ? 14 : 4,
                    padding: 10,
                    maxWidth: "85%",
                    borderWidth: msg.role === "assistant" ? 1 : 0,
                    borderColor: msg.role === "assistant"
                      ? `${msg.provider ? getProviderColor(msg.provider) : providerColor}40`
                      : "transparent",
                  }}
                >
                  <Text
                    selectable
                    style={{
                      color: msg.role === "user" ? "#000000" : "#FFFFFF",
                      fontSize: 14,
                      lineHeight: 20,
                      flexWrap: "wrap",
                      flexShrink: 1,
                    }}
                  >
                    {msg.content}
                  </Text>
                  {msg.role === "assistant" && msg.provider && (
                    <Text
                      style={{
                        color: getProviderColor(msg.provider),
                        fontSize: 10,
                        marginTop: 4,
                        opacity: 0.8,
                      }}
                    >
                      via {getProviderDisplayName(msg.provider)}
                    </Text>
                  )}
                </View>
              </View>
            ))}

            {isTranscribing && (
              <View style={{ alignItems: "flex-end", marginBottom: 10 }}>
                <View
                  style={{
                    backgroundColor: "rgba(255, 184, 0, 0.2)",
                    borderRadius: 14,
                    padding: 10,
                    flexDirection: "row",
                    alignItems: "center",
                  }}
                >
                  <ActivityIndicator color="#FFB800" size="small" />
                  <Text style={{ color: "#FFB800", marginLeft: 6, fontSize: 12 }}>
                    Processing...
                  </Text>
                </View>
              </View>
            )}

            {isLoading && (
              <View style={{ alignItems: "flex-start", marginBottom: 10 }}>
                <View
                  style={{
                    backgroundColor: `${providerColor}20`,
                    borderRadius: 14,
                    padding: 10,
                    flexDirection: "row",
                    alignItems: "center",
                  }}
                >
                  <ActivityIndicator color={providerColor} size="small" />
                  <Text style={{ color: providerColor, marginLeft: 6, fontSize: 12 }}>
                    {providerName} is thinking...
                  </Text>
                </View>
              </View>
            )}
          </ScrollView>

          {/* Input area */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "flex-end",
              paddingHorizontal: 12,
              paddingTop: 8,
              paddingBottom: insets.bottom > 0 ? insets.bottom : 12,
              borderTopWidth: 1,
              borderTopColor: "rgba(255, 255, 255, 0.1)",
            }}
          >
            {/* Mic button */}
            <Pressable
              onPress={handleMicPress}
              disabled={isLoading || isTranscribing}
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: isRecording ? "#EF4444" : providerColor,
                alignItems: "center",
                justifyContent: "center",
                marginRight: 8,
                opacity: isLoading || isTranscribing ? 0.5 : 1,
              }}
            >
              <Ionicons
                name={isRecording ? "stop" : "mic"}
                size={20}
                color="#FFFFFF"
              />
            </Pressable>

            {/* Text input */}
            <View
              style={{
                flex: 1,
                backgroundColor: "rgba(255, 255, 255, 0.08)",
                borderRadius: 20,
                paddingHorizontal: 14,
                paddingVertical: 8,
                marginRight: 8,
                minHeight: 40,
                justifyContent: "center",
              }}
            >
              <TextInput
                value={inputText}
                onChangeText={setInputText}
                placeholder="Type a message..."
                placeholderTextColor="rgba(255, 255, 255, 0.4)"
                style={{
                  color: "#FFFFFF",
                  fontSize: 14,
                  maxHeight: 80,
                }}
                multiline
                onSubmitEditing={handleSend}
                returnKeyType="send"
                editable={!isLoading && !isTranscribing && !isRecording}
              />
            </View>

            {/* Send button */}
            <Pressable
              onPress={handleSend}
              disabled={!inputText.trim() || isLoading}
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor:
                  inputText.trim() && !isLoading
                    ? "#FFB800"
                    : "rgba(255, 184, 0, 0.3)",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Ionicons
                name="send"
                size={18}
                color={inputText.trim() && !isLoading ? "#000" : "rgba(0,0,0,0.4)"}
              />
            </Pressable>
          </View>
        </LinearGradient>
      </Animated.View>
    </PanGestureHandler>
    </Animated.View>
  );
}
