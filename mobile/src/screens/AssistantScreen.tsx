/**
 * AssistantScreen - The Realtor's Realtor
 * Dedicated conversation space for the AI companion
 * Swipe down to close and return to Dashboard
 *
 * Features floating editor window with:
 * - Editable text area for AI suggestions
 * - Pause, Mute, Recenter, Clear controls
 * - Slide up/down to minimize/expand
 */

import React, { useState, useRef, useEffect, useMemo, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  ActivityIndicator,
  Keyboard,
  Alert,
  Image,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  FadeIn,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withRepeat,
  withSequence,
  withDelay,
  Easing,
  interpolate,
  runOnJS,
} from "react-native-reanimated";
import {
  PanGestureHandler,
  PanGestureHandlerGestureEvent,
  State,
  HandlerStateChangeEvent,
  PanGestureHandlerEventPayload,
  GestureHandlerRootView,
} from "react-native-gesture-handler";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as Clipboard from "expo-clipboard";
import { Audio } from "expo-av";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { transcribeAudio } from "../api/transcribe-audio";
import { sendToHomepageAgent, AgentMessage } from "../services/homepageAgent";
import { speakThroughSpeaker, stopSpeakerAudio } from "../services/speakerAudio";
import { RootStackParamList } from "../types/navigation";
import { RealtorAssistantEditor } from "../components/RealtorAssistantEditor";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

export default function AssistantScreen() {
  const navigation = useNavigation<NavigationProp>();
  const insets = useSafeAreaInsets();
  const scrollViewRef = useRef<ScrollView>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null);
  const recordingRef = useRef<Audio.Recording | null>(null);

  // Editor window state
  const [isEditorVisible, setIsEditorVisible] = useState(false);
  const [editorText, setEditorText] = useState("");
  const [silentMode, setSilentMode] = useState(false);
  const [conversationContext, setConversationContext] = useState<AgentMessage[]>([]);
  const [isAIUpdating, setIsAIUpdating] = useState(false);

  // Glow animation values
  const glowBreath = useSharedValue(0);
  const glowFadeIn = useSharedValue(0); // Start hidden, fade in after delay
  const glowIntensity = useSharedValue(0.5); // 0.5 = normal, 1 = listening (big), 0.3 = speaking (small)

  // Icon size for empty state
  const ICON_SIZE = 102;

  // Generate smooth glow layers for empty state icon
  const glowLayers = useMemo(() => {
    const layers = [];
    const numLayers = 25;
    const maxRadius = 100;

    for (let i = 0; i < numLayers; i++) {
      const progress = i / (numLayers - 1);
      const layerOpacity = Math.pow(1 - progress, 3) * 0.4;
      const layerSize = ICON_SIZE + (maxRadius * progress);

      layers.push({
        size: layerSize,
        opacity: layerOpacity,
      });
    }
    return layers.reverse();
  }, []);

  // Start breathing glow animation on mount - glow fades in AFTER icon loads
  useEffect(() => {
    // Glow fades in AFTER icon loads (500ms delay)
    glowFadeIn.value = withDelay(500, withTiming(1, { duration: 600, easing: Easing.out(Easing.cubic) }));

    glowBreath.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 2500, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: 2500, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      false
    );
  }, []);

  // Adjust glow intensity based on state
  useEffect(() => {
    if (isRecording) {
      // Listening - big glow
      glowIntensity.value = withTiming(1.2, { duration: 300 });
    } else if (isSpeaking) {
      // Speaking - smaller glow
      glowIntensity.value = withTiming(0.4, { duration: 300 });
    } else {
      // Normal breathing
      glowIntensity.value = withTiming(0.7, { duration: 300 });
    }
  }, [isRecording, isSpeaking]);

  // Animated glow style
  const glowStyle = useAnimatedStyle(() => {
    const breathIntensity = interpolate(glowBreath.value, [0, 1], [0.7, 1]);
    return {
      opacity: glowFadeIn.value * breathIntensity * glowIntensity.value,
      transform: [{ scale: glowIntensity.value }],
    };
  });

  // Icon shows immediately (no fade needed)
  const iconFadeStyle = useAnimatedStyle(() => ({
    opacity: 1,
  }));

  // Swipe down to close
  const translateY = useSharedValue(0);
  const DISMISS_THRESHOLD = 120;

  const onGestureEvent = (event: PanGestureHandlerGestureEvent) => {
    const { translationY } = event.nativeEvent;
    if (translationY > 0) {
      translateY.value = translationY;
    }
  };

  const goBack = () => {
    stopSpeakerAudio();
    navigation.goBack();
  };

  const onHandlerStateChange = (
    event: HandlerStateChangeEvent<PanGestureHandlerEventPayload>
  ) => {
    if (event.nativeEvent.state === State.END) {
      const { translationY, velocityY } = event.nativeEvent;

      if (translationY > DISMISS_THRESHOLD || velocityY > 500) {
        translateY.value = withTiming(800, { duration: 200 });
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        runOnJS(goBack)();
      } else {
        translateY.value = withSpring(0, { damping: 20, stiffness: 300 });
      }
    }
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  // Scroll to bottom when messages change
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages.length]);

  // Copy message to clipboard
  const handleCopyMessage = async (content: string) => {
    await Clipboard.setStringAsync(content);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setSelectedMessageId(null);
  };

  // Delete message
  const handleDeleteMessage = (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setMessages((prev) => prev.filter((m) => m.id !== id));
    setSelectedMessageId(null);
  };

  // Clear all messages
  const handleClearAll = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setMessages([]);
  };

  // Send text message
  const handleSend = async () => {
    if (!inputText.trim() || isLoading) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Keyboard.dismiss();

    const text = inputText.trim();
    setInputText("");

    const userMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      content: text,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);

    try {
      const agentMessages: AgentMessage[] = messages.map((m) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        timestamp: m.timestamp,
      }));

      const agentResponse = await sendToHomepageAgent(text, agentMessages);

      const response: Message = {
        id: agentResponse.id,
        role: "assistant",
        content: agentResponse.content,
        timestamp: agentResponse.timestamp,
      };

      setMessages((prev) => [...prev, response]);
      setIsSpeaking(true);
      await speakThroughSpeaker(response.content);
      setIsSpeaking(false);
    } catch (error) {
      console.error("[Assistant] Error:", error);
    }
    setIsLoading(false);
  };

  // Voice recording
  const startRecording = async () => {
    try {
      console.log("[Assistant] Requesting audio permissions...");
      const { status } = await Audio.requestPermissionsAsync();
      console.log("[Assistant] Permission status:", status);
      if (status !== "granted") {
        console.log("[Assistant] Permission denied");
        return;
      }

      console.log("[Assistant] Setting audio mode for recording...");
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        playThroughEarpieceAndroid: false,
      });

      console.log("[Assistant] Creating recording...");
      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      recordingRef.current = recording;
      setIsRecording(true);
      console.log("[Assistant] Recording started");
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    } catch (error) {
      console.error("[Assistant] Recording error:", error);
    }
  };

  const stopRecording = async () => {
    if (!recordingRef.current) {
      console.log("[Assistant] No recording ref found");
      return;
    }

    try {
      setIsRecording(false);
      setIsTranscribing(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      console.log("[Assistant] Stopping recording...");
      await recordingRef.current.stopAndUnloadAsync();

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        playThroughEarpieceAndroid: false,
        staysActiveInBackground: false,
        shouldDuckAndroid: true,
      });

      const uri = recordingRef.current.getURI();
      recordingRef.current = null;

      console.log("[Assistant] Recording URI:", uri);

      if (!uri) {
        console.log("[Assistant] No URI from recording");
        setIsTranscribing(false);
        return;
      }

      console.log("[Assistant] Starting transcription...");
      const transcription = await transcribeAudio(uri);
      console.log("[Assistant] Transcription result:", transcription);

      if (transcription && transcription.trim()) {
        const userMsg: Message = {
          id: Date.now().toString(),
          role: "user",
          content: transcription.trim(),
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, userMsg]);
        setIsTranscribing(false);
        setIsLoading(true);

        const agentMessages: AgentMessage[] = messages.map((m) => ({
          id: m.id,
          role: m.role,
          content: m.content,
          timestamp: m.timestamp,
        }));

        const agentResponse = await sendToHomepageAgent(
          transcription.trim(),
          agentMessages
        );

        const response: Message = {
          id: agentResponse.id,
          role: "assistant",
          content: agentResponse.content,
          timestamp: agentResponse.timestamp,
        };

        setMessages((prev) => [...prev, response]);
        setIsLoading(false);
        setIsSpeaking(true);
        await speakThroughSpeaker(response.content);
        setIsSpeaking(false);
      } else {
        setIsTranscribing(false);
      }
    } catch (error) {
      console.error("[Assistant] Error:", error);
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

  // Editor handlers
  const handleOpenEditor = useCallback(() => {
    setIsEditorVisible(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  const handleCloseEditor = useCallback(() => {
    setIsEditorVisible(false);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  const handlePauseToggle = useCallback(() => {
    // Removed - no longer using pause functionality
  }, []);

  const handleMuteToggle = useCallback(() => {
    // Removed - replaced with silentMode
  }, []);

  const handleRecenter = useCallback(() => {
    // Reset conversation context to refocus guidance on current situation
    // WITHOUT deleting existing text in the editor
    setConversationContext([]);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, []);

  // New Question handler - stops speech and clears current turn
  const handleNewQuestion = useCallback(() => {
    stopSpeakerAudio();
    setEditorText("");
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }, []);

  // Silent Mode toggle
  const handleSilentModeToggle = useCallback(() => {
    setSilentMode((prev) => {
      if (!prev) {
        stopSpeakerAudio();
      }
      return !prev;
    });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  const handleEditorTextChange = useCallback((text: string) => {
    setEditorText(text);
  }, []);

  // Auto-populate editor with AI responses
  useEffect(() => {
    if (messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      if (lastMessage?.role === "assistant") {
        setIsAIUpdating(true);
        // Append or set the AI response in the editor
        setEditorText((prev) => {
          if (prev.trim()) {
            return prev + "\n\n---\n\n" + lastMessage.content;
          }
          return lastMessage.content;
        });
        setTimeout(() => setIsAIUpdating(false), 500);
      }
    }
  }, [messages]);

  return (
    <View style={{ flex: 1, backgroundColor: "#0A0A0F" }}>
      <PanGestureHandler
        onGestureEvent={onGestureEvent}
        onHandlerStateChange={onHandlerStateChange}
      >
        <Animated.View style={[{ flex: 1 }, animatedStyle]}>
          <LinearGradient
            colors={["#0F0F1A", "#0A0A0F"]}
            style={{ flex: 1 }}
          >
            {/* Header */}
            <View
              style={{
                paddingTop: insets.top + 8,
                paddingHorizontal: 20,
                paddingBottom: 16,
                borderBottomWidth: 1,
                borderBottomColor: "rgba(255, 255, 255, 0.08)",
              }}
            >
              {/* Drag Handle */}
              <View style={{ alignItems: "center", marginBottom: 12 }}>
                <View
                  style={{
                    width: 40,
                    height: 4,
                    backgroundColor: "rgba(255, 255, 255, 0.3)",
                    borderRadius: 2,
                  }}
                />
              </View>

              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <View
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 20,
                      overflow: "hidden",
                      marginRight: 12,
                    }}
                  >
                    <Image
                      source={require("../../assets/image-1764988335.jpeg")}
                      style={{
                        width: 40,
                        height: 40,
                        resizeMode: "cover",
                      }}
                    />
                  </View>
                  <View>
                    <Text
                      style={{
                        color: "#FFFFFF",
                        fontSize: 18,
                        fontWeight: "600",
                      }}
                    >
                      Assistant
                    </Text>
                    <Text
                      style={{
                        color: "rgba(255, 255, 255, 0.5)",
                        fontSize: 12,
                      }}
                    >
                      The Realtor{"'"}s Realtor
                    </Text>
                  </View>
                </View>

                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  {/* Editor Button */}
                  <Pressable
                    onPress={handleOpenEditor}
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 18,
                      backgroundColor: isEditorVisible ? "rgba(255, 184, 0, 0.25)" : "rgba(255, 255, 255, 0.08)",
                      alignItems: "center",
                      justifyContent: "center",
                      marginRight: 8,
                      borderWidth: isEditorVisible ? 1 : 0,
                      borderColor: "rgba(255, 184, 0, 0.5)",
                    }}
                  >
                    <Ionicons name="document-text" size={18} color={isEditorVisible ? "#FFB800" : "#9CA3AF"} />
                  </Pressable>

                  {messages.length > 0 && (
                    <Pressable
                      onPress={handleClearAll}
                      style={{
                        paddingHorizontal: 12,
                        paddingVertical: 6,
                        marginRight: 8,
                      }}
                    >
                      <Text style={{ color: "#9CA3AF", fontSize: 14 }}>
                        Clear
                      </Text>
                    </Pressable>
                  )}

                  <Pressable
                    onPress={goBack}
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 18,
                      backgroundColor: "rgba(255, 255, 255, 0.08)",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Ionicons name="close" size={20} color="#9CA3AF" />
                  </Pressable>
                </View>
              </View>
            </View>

            {/* Messages */}
            <ScrollView
              ref={scrollViewRef}
              style={{ flex: 1 }}
              contentContainerStyle={{
                padding: 16,
                paddingBottom: 20,
              }}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {messages.length === 0 && (
                <Animated.View
                  entering={FadeIn.duration(300)}
                  style={{ alignItems: "center", paddingTop: 60 }}
                >
                  {/* Icon with glow effect */}
                  <View
                    style={{
                      width: ICON_SIZE + 100,
                      height: ICON_SIZE + 100,
                      alignItems: "center",
                      justifyContent: "center",
                      marginBottom: 16,
                    }}
                  >
                    {/* Smooth glow layers */}
                    {glowLayers.map((layer, index) => (
                      <Animated.View
                        key={index}
                        style={[
                          glowStyle,
                          {
                            position: "absolute",
                            width: layer.size,
                            height: layer.size,
                            borderRadius: layer.size / 2,
                            backgroundColor: `rgba(255, 60, 150, ${layer.opacity})`,
                          },
                        ]}
                      />
                    ))}

                    {/* Avatar icon */}
                    <Animated.View
                      style={[
                        iconFadeStyle,
                        {
                          width: ICON_SIZE,
                          height: ICON_SIZE,
                          borderRadius: ICON_SIZE / 2,
                          overflow: "hidden",
                        },
                      ]}
                    >
                      <Image
                        source={require("../../assets/image-1764988335.jpeg")}
                        style={{
                          width: ICON_SIZE,
                          height: ICON_SIZE,
                          resizeMode: "cover",
                        }}
                      />
                    </Animated.View>
                  </View>
                  <Text
                    style={{
                      color: "#FFFFFF",
                      fontSize: 18,
                      fontWeight: "600",
                      marginBottom: 8,
                    }}
                  >
                    How can I help?
                  </Text>
                  <Text
                    style={{
                      color: "rgba(255, 255, 255, 0.5)",
                      fontSize: 14,
                      textAlign: "center",
                      paddingHorizontal: 40,
                      lineHeight: 20,
                    }}
                  >
                    Ask me anything about real estate, your business, or tasks you need help with.
                  </Text>
                </Animated.View>
              )}

              {messages.map((msg) => (
                <Pressable
                  key={msg.id}
                  onLongPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    setSelectedMessageId(
                      selectedMessageId === msg.id ? null : msg.id
                    );
                  }}
                  style={{
                    alignItems: msg.role === "user" ? "flex-end" : "flex-start",
                    marginBottom: 12,
                  }}
                >
                  <View
                    style={{
                      backgroundColor:
                        msg.role === "user"
                          ? "#FFB800"
                          : "rgba(255, 255, 255, 0.08)",
                      borderRadius: 16,
                      borderTopRightRadius: msg.role === "user" ? 4 : 16,
                      borderTopLeftRadius: msg.role === "user" ? 16 : 4,
                      padding: 14,
                      maxWidth: "85%",
                      borderWidth: selectedMessageId === msg.id ? 2 : 0,
                      borderColor: "#FFB800",
                    }}
                  >
                    <Text
                      selectable
                      style={{
                        color: msg.role === "user" ? "#000000" : "#FFFFFF",
                        fontSize: 15,
                        lineHeight: 22,
                      }}
                    >
                      {msg.content}
                    </Text>
                  </View>

                  {/* Action buttons when message is selected */}
                  {selectedMessageId === msg.id && (
                    <View
                      style={{
                        flexDirection: "row",
                        marginTop: 8,
                        gap: 8,
                      }}
                    >
                      <Pressable
                        onPress={() => handleCopyMessage(msg.content)}
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          backgroundColor: "rgba(255, 184, 0, 0.15)",
                          paddingHorizontal: 12,
                          paddingVertical: 6,
                          borderRadius: 12,
                        }}
                      >
                        <Ionicons name="copy-outline" size={14} color="#FFB800" />
                        <Text
                          style={{
                            color: "#FFB800",
                            fontSize: 12,
                            marginLeft: 4,
                          }}
                        >
                          Copy
                        </Text>
                      </Pressable>

                      <Pressable
                        onPress={() => handleDeleteMessage(msg.id)}
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          backgroundColor: "rgba(239, 68, 68, 0.15)",
                          paddingHorizontal: 12,
                          paddingVertical: 6,
                          borderRadius: 12,
                        }}
                      >
                        <Ionicons name="trash-outline" size={14} color="#EF4444" />
                        <Text
                          style={{
                            color: "#EF4444",
                            fontSize: 12,
                            marginLeft: 4,
                          }}
                        >
                          Delete
                        </Text>
                      </Pressable>
                    </View>
                  )}
                </Pressable>
              ))}

              {isTranscribing && (
                <View style={{ alignItems: "flex-end", marginBottom: 12 }}>
                  <View
                    style={{
                      backgroundColor: "rgba(255, 184, 0, 0.2)",
                      borderRadius: 16,
                      padding: 14,
                      flexDirection: "row",
                      alignItems: "center",
                    }}
                  >
                    <ActivityIndicator color="#FFB800" size="small" />
                    <Text
                      style={{ color: "#FFB800", marginLeft: 8, fontSize: 14 }}
                    >
                      Processing voice...
                    </Text>
                  </View>
                </View>
              )}

              {isLoading && (
                <View style={{ alignItems: "flex-start", marginBottom: 12 }}>
                  <View
                    style={{
                      backgroundColor: "rgba(255, 255, 255, 0.08)",
                      borderRadius: 16,
                      padding: 14,
                      flexDirection: "row",
                      alignItems: "center",
                    }}
                  >
                    <ActivityIndicator color="#FFB800" size="small" />
                    <Text
                      style={{
                        color: "rgba(255, 255, 255, 0.6)",
                        marginLeft: 8,
                        fontSize: 14,
                      }}
                    >
                      Thinking...
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
                paddingHorizontal: 16,
                paddingTop: 12,
                paddingBottom: insets.bottom > 0 ? insets.bottom : 16,
                borderTopWidth: 1,
                borderTopColor: "rgba(255, 255, 255, 0.08)",
                backgroundColor: "rgba(10, 10, 15, 0.95)",
              }}
            >
              {/* Mic button */}
              <Pressable
                onPress={handleMicPress}
                disabled={isLoading || isTranscribing}
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 22,
                  backgroundColor: isRecording ? "#EF4444" : "#FFB800",
                  alignItems: "center",
                  justifyContent: "center",
                  marginRight: 10,
                  opacity: isLoading || isTranscribing ? 0.5 : 1,
                }}
              >
                <Ionicons
                  name={isRecording ? "stop" : "mic"}
                  size={22}
                  color={isRecording ? "#FFFFFF" : "#000000"}
                />
              </Pressable>

              {/* Text input */}
              <View
                style={{
                  flex: 1,
                  backgroundColor: "rgba(255, 255, 255, 0.08)",
                  borderRadius: 22,
                  paddingHorizontal: 16,
                  paddingVertical: 10,
                  marginRight: 10,
                  minHeight: 44,
                  justifyContent: "center",
                }}
              >
                <TextInput
                  value={inputText}
                  onChangeText={setInputText}
                  placeholder="Ask anything..."
                  placeholderTextColor="rgba(255, 255, 255, 0.4)"
                  style={{
                    color: "#FFFFFF",
                    fontSize: 15,
                    maxHeight: 100,
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
                  width: 44,
                  height: 44,
                  borderRadius: 22,
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
                  size={20}
                  color={
                    inputText.trim() && !isLoading ? "#000" : "rgba(0,0,0,0.4)"
                  }
                />
              </Pressable>
            </View>
          </LinearGradient>
        </Animated.View>
      </PanGestureHandler>

      {/* Realtor Assistant Editor Window */}
      <GestureHandlerRootView style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, pointerEvents: "box-none" }}>
        <RealtorAssistantEditor
          visible={isEditorVisible}
          onClose={handleCloseEditor}
          onNewQuestion={handleNewQuestion}
          silentMode={silentMode}
          onSilentModeToggle={handleSilentModeToggle}
          editorText={editorText}
          onEditorTextChange={handleEditorTextChange}
          isAIUpdating={isAIUpdating}
          initialHeight={280}
        />
      </GestureHandlerRootView>
    </View>
  );
}
