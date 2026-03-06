/**
 * LiveDealGuidanceScreen - Camera-First Visual Guidance
 *
 * A silent, real-time assistant that works alongside calls, texts,
 * meetings, and in-person conversations.
 *
 * Features:
 * - Camera is LIVE VIEW ONLY (no photos captured, no shutter sounds)
 * - Camera occupies top 60-70% of screen
 * - Semi-transparent guidance panel at bottom (30-40%)
 * - Editable text output with copy/paste/select-all
 * - Silent by design - text-only guidance, no voice output
 * - Color-coded guidance tags (Strategy, Objection, Language)
 * - Text button to launch native SMS app
 * - Works alongside your phone - does not initiate calls
 */

import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  Pressable,
  TextInput,
  ScrollView,
  Dimensions,
  ActivityIndicator,
  Linking,
  Alert,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  Easing,
} from "react-native-reanimated";
import { CameraView, CameraType, useCameraPermissions } from "expo-camera";
import { Audio } from "expo-av";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as Clipboard from "expo-clipboard";
import { transcribeAudio } from "../api/transcribe-audio";
import { useDealContextStore } from "../state/dealContextStore";
import { RootStackParamList } from "../types/navigation";
import { ContactPickerSheet, ContactActionType } from "../components/ContactPickerSheet";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

// Guidance types with color coding
type GuidanceType = "strategy" | "objection" | "language" | "timing" | "rapport" | "context";

interface GuidanceItem {
  id: string;
  type: GuidanceType;
  content: string;
  timestamp: Date;
}

const GUIDANCE_COLORS: Record<GuidanceType, string> = {
  strategy: "#F59E0B", // Amber
  objection: "#EF4444", // Red
  language: "#10B981", // Green
  timing: "#3B82F6", // Blue
  rapport: "#A855F7", // Purple
  context: "#6B7280", // Gray
};

const GUIDANCE_LABELS: Record<GuidanceType, string> = {
  strategy: "Strategy",
  objection: "Objection",
  language: "Language",
  timing: "Timing",
  rapport: "Rapport",
  context: "Context",
};

const LIVE_GUIDANCE_SYSTEM_PROMPT = `You are a silent, real-time deal guidance assistant for real estate professionals. Your role is to help the user think, choose words, and navigate conversations during live calls, meetings, and negotiations - without speaking unless explicitly enabled.

## CORE PRINCIPLES
- You are invisible to screen sharing and external participants.
- You do not interrupt, dominate, or lead conversations.
- You provide concise, high-signal guidance only when helpful.
- The human user always remains in control.

## OBSERVATION MODE
- You continuously observe conversation context provided by the user (text, notes, optional audio transcription).
- You reason over deal context, prior messages, and professional norms.
- You do NOT invent facts or assume intent.
- If information is missing, you ask for clarification silently in text.

## COMMUNICATION STYLE
- Default output is silent, written guidance only.
- Guidance appears as short, actionable suggestions (1-2 sentences max).
- Tone is professional, calm, and non-aggressive.
- Avoid hype, pressure tactics, or manipulation.
- Favor trust-building language.

## WHAT YOU HELP WITH
- Choosing the right phrasing in sensitive moments
- Objection handling (price, timing, repairs, contingencies)
- Negotiation positioning (when to push, pause, or defer)
- Reassuring nervous clients
- Professional responses to agents, lenders, inspectors, contractors, city officials
- Drafting or refining messages the user can copy/paste

## WHAT YOU DO NOT DO
- You do not speak out loud in Live Deal Guidance mode.
- You do not role-play the other party unless explicitly asked.
- You do not provide legal advice.
- You do not pressure the user to take action.
- You do not generate long explanations unless requested.

## GUIDANCE TYPES (use these as response type)
- "strategy" - Tactical approach advice, negotiation positioning
- "objection" - How to handle resistance, price pushback, contingencies
- "language" - Exact words/phrases to use, phrasing suggestions
- "timing" - When to pause, wait, defer, or act
- "rapport" - Building connection, reassuring clients
- "context" - Background observation, clarifying questions

## EXAMPLE PROMPTS
- "Pause. Let them finish."
- "Acknowledge concern before responding."
- "Reframe price as long-term value."
- "Say: 'I hear you. Tell me more about that.'"
- "Mirror their body language."
- "Wait 3 seconds before responding."
- "Defer to attorney on liability question."
- "This is high-risk - advise caution."

## FAIL-SAFE BEHAVIOR
- If unsure, stay silent or ask a brief clarifying question.
- If the situation is high-risk, advise caution and neutrality.
- Never fabricate deal details.

## RESPONSE FORMAT
Respond with JSON:
{
  "type": "strategy" | "objection" | "language" | "timing" | "rapport" | "context",
  "content": "Your brief guidance here"
}

If there is nothing actionable to suggest, respond with: null

Your goal is to make the user sound confident, prepared, and professional - without anyone knowing AI assistance is being used.`;

export function LiveDealGuidanceScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp>();
  const scrollViewRef = useRef<ScrollView>(null);
  const textInputRef = useRef<TextInput>(null);

  // Camera state - LIVE VIEW ONLY, no photo capture
  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState<CameraType>("front");
  const [permissionRequested, setPermissionRequested] = useState(false);

  // Guidance state
  const [guidanceItems, setGuidanceItems] = useState<GuidanceItem[]>([]);
  const [workspaceText, setWorkspaceText] = useState("");
  const [isPaused, setIsPaused] = useState(false);
  const [isMicEnabled, setIsMicEnabled] = useState(false);
  const [isListening, setIsListening] = useState(false);

  // Audio recording (optional, off by default)
  const recordingRef = useRef<Audio.Recording | null>(null);
  const isRecordingRef = useRef(false);

  // Deal context
  const getDealContextForAI = useDealContextStore((s) => s.getContextForAI);
  const activeDealContextId = useDealContextStore((s) => s.activeDealContextId);
  const dealContexts = useDealContextStore((s) => s.dealContexts);
  const activeDealContext = activeDealContextId
    ? dealContexts.find((ctx) => ctx.id === activeDealContextId) || null
    : null;

  // Get client phone from active deal context
  const clientPhone = activeDealContext?.clientPhone || "";

  // Contact picker state
  const [showContactPicker, setShowContactPicker] = useState(false);
  const [contactAction, setContactAction] = useState<ContactActionType>("call");

  // Animation for listening indicator
  const pulseScale = useSharedValue(1);
  const pulseOpacity = useSharedValue(0.5);

  useEffect(() => {
    if (isListening) {
      pulseScale.value = withRepeat(
        withSequence(
          withTiming(1.2, { duration: 800, easing: Easing.inOut(Easing.ease) }),
          withTiming(1, { duration: 800, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        false
      );
      pulseOpacity.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 800, easing: Easing.inOut(Easing.ease) }),
          withTiming(0.4, { duration: 800, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        false
      );
    } else {
      pulseScale.value = withTiming(1, { duration: 200 });
      pulseOpacity.value = withTiming(0.5, { duration: 200 });
    }
  }, [isListening]);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
    opacity: pulseOpacity.value,
  }));

  // Request camera permission on mount - automatically trigger native dialog
  useEffect(() => {
    const requestCameraPermission = async () => {
      if (!permission) return;

      if (!permission.granted && !permissionRequested) {
        setPermissionRequested(true);
        const result = await requestPermission();

        // If permission was denied and can't ask again, offer to open settings
        if (!result.granted && !result.canAskAgain) {
          Alert.alert(
            "Camera Permission Required",
            "Camera access is needed for Live Deal Guidance. Please enable it in Settings.",
            [
              { text: "Cancel", style: "cancel", onPress: () => navigation.goBack() },
              { text: "Open Settings", onPress: () => Linking.openSettings() },
            ]
          );
        }
      }
    };

    requestCameraPermission();
  }, [permission, permissionRequested]);

  // Handle mic toggle - no automatic listening
  useEffect(() => {
    if (isMicEnabled) {
      startAudioListening();
    } else {
      stopAudioListening();
    }
    return () => {
      stopAudioListening();
    };
  }, [isMicEnabled]);

  const startAudioListening = async () => {
    try {
      const { status, canAskAgain } = await Audio.requestPermissionsAsync();

      if (status !== "granted") {
        setIsMicEnabled(false);

        // If can't ask again, offer to open settings
        if (!canAskAgain) {
          Alert.alert(
            "Microphone Permission Required",
            "Microphone access is needed for audio transcription. Please enable it in Settings.",
            [
              { text: "Cancel", style: "cancel" },
              { text: "Open Settings", onPress: () => Linking.openSettings() },
            ]
          );
        }
        return;
      }

      setIsListening(true);
      isRecordingRef.current = true;
      startAudioLoop();
    } catch (error) {
      console.log("[LiveDealGuidance] Audio start error:", error);
      setIsMicEnabled(false);
    }
  };

  const stopAudioListening = async () => {
    isRecordingRef.current = false;
    setIsListening(false);

    if (recordingRef.current) {
      try {
        const status = await recordingRef.current.getStatusAsync();
        if (status.isRecording || status.isDoneRecording) {
          await recordingRef.current.stopAndUnloadAsync();
        }
      } catch (e) {
        // Ignore
      }
      recordingRef.current = null;
    }
  };

  const startAudioLoop = async () => {
    const recordAndProcess = async () => {
      if (!isRecordingRef.current) return;

      try {
        if (recordingRef.current) {
          try {
            await recordingRef.current.stopAndUnloadAsync();
          } catch (e) {
            // Ignore
          }
          recordingRef.current = null;
        }

        await Audio.setAudioModeAsync({
          allowsRecordingIOS: true,
          playsInSilentModeIOS: true,
        });

        const { recording } = await Audio.Recording.createAsync(
          Audio.RecordingOptionsPresets.HIGH_QUALITY
        );
        recordingRef.current = recording;

        await new Promise((resolve) => setTimeout(resolve, 6000));

        if (!isRecordingRef.current) {
          if (recordingRef.current) {
            await recordingRef.current.stopAndUnloadAsync();
            recordingRef.current = null;
          }
          return;
        }

        let uri: string | null = null;
        try {
          await recording.stopAndUnloadAsync();
          uri = recording.getURI();
        } catch (e) {
          uri = recording.getURI();
        }
        recordingRef.current = null;

        if (uri && !isPaused) {
          await processAudio(uri);
        }

        if (isRecordingRef.current) {
          recordAndProcess();
        }
      } catch (error) {
        console.log("[LiveDealGuidance] Audio loop error:", error);
        if (isRecordingRef.current) {
          await new Promise((resolve) => setTimeout(resolve, 2000));
          recordAndProcess();
        }
      }
    };

    recordAndProcess();
  };

  const processAudio = async (uri: string) => {
    try {
      const transcription = await transcribeAudio(uri);

      if (!transcription || transcription.trim().length < 5) {
        return;
      }

      // Get guidance based on transcription
      await getGuidanceFromAudio(transcription);
    } catch (error) {
      console.log("[LiveDealGuidance] Audio processing error:", error);
    }
  };

  const getGuidanceFromAudio = async (transcription: string) => {
    const apiKey = process.env.EXPO_PUBLIC_VIBECODE_ANTHROPIC_API_KEY;
    if (!apiKey) return;

    const dealContext = getDealContextForAI();

    try {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 150,
          system: LIVE_GUIDANCE_SYSTEM_PROMPT + (dealContext ? `\n\nDeal Context:\n${dealContext}` : ""),
          messages: [
            {
              role: "user",
              content: `I just heard this in my conversation:\n\n"${transcription}"\n\nProvide brief guidance on what I should say or do next.`,
            },
          ],
        }),
      });

      if (!response.ok) return;

      const data = await response.json();
      const text = data.content?.[0]?.text;

      if (text && text !== "null") {
        try {
          const parsed = JSON.parse(text);
          if (parsed?.type && parsed?.content) {
            addGuidance(parsed.type as GuidanceType, parsed.content);
          }
        } catch {
          if (text.length > 5 && !text.toLowerCase().includes("null")) {
            addGuidance("language", text);
          }
        }
      }
    } catch (error) {
      console.log("[LiveDealGuidance] Audio guidance error:", error);
    }
  };

  const addGuidance = (type: GuidanceType, content: string) => {
    if (isPaused) return;

    const newItem: GuidanceItem = {
      id: Date.now().toString(),
      type,
      content,
      timestamp: new Date(),
    };

    setGuidanceItems((prev) => [...prev, newItem]);

    // Append to workspace text
    setWorkspaceText((prev) => {
      const separator = prev.trim() ? "\n\n" : "";
      return prev + separator + content;
    });

    // Auto-scroll to bottom
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  // Toolbar handlers
  const handlePause = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsPaused(!isPaused);
  };

  const handleRecenter = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setGuidanceItems([]);
  };

  const handleClear = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setWorkspaceText("");
    setGuidanceItems([]);
  };

  const handleToggleMic = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsMicEnabled(!isMicEnabled);
  };

  const handleCopyText = async () => {
    if (workspaceText.trim()) {
      await Clipboard.setStringAsync(workspaceText);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  };

  const toggleCameraFacing = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setFacing((current) => (current === "back" ? "front" : "back"));
  };

  // Communication handlers - open contact picker with appropriate action
  const handlePhoneCallPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setContactAction("call");
    setShowContactPicker(true);
  };

  const handleVideoCallPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setContactAction("video");
    setShowContactPicker(true);
  };

  const handleText = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setContactAction("text");
    setShowContactPicker(true);
  };

  const handleEmail = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setContactAction("email");
    setShowContactPicker(true);
  };

  // Camera panel height (60-70% of screen)
  const cameraHeight = SCREEN_HEIGHT * 0.58;

  if (!permission) {
    return (
      <View className="flex-1 bg-[#0A0A0F] items-center justify-center">
        <ActivityIndicator color="#F59E0B" size="large" />
        <Text className="text-white/60 mt-4">Requesting camera permission...</Text>
      </View>
    );
  }

  if (!permission.granted) {
    // Show a screen that lets user go to settings if permission was denied
    const handleOpenSettings = () => {
      Linking.openSettings();
    };

    const handleRetryPermission = async () => {
      if (permission.canAskAgain) {
        await requestPermission();
      } else {
        handleOpenSettings();
      }
    };

    return (
      <View className="flex-1 bg-[#0A0A0F] items-center justify-center px-6">
        <Ionicons name="camera-outline" size={64} color="rgba(255, 255, 255, 0.3)" />
        <Text className="text-white text-lg font-semibold mt-4 text-center">
          Camera Access Required
        </Text>
        <Text className="text-white/50 text-center mt-2">
          Live Deal Guidance needs camera access to provide visual context guidance.
        </Text>
        <Pressable
          onPress={handleRetryPermission}
          style={{
            backgroundColor: "#F59E0B",
            paddingHorizontal: 24,
            paddingVertical: 14,
            borderRadius: 12,
            marginTop: 24,
          }}
        >
          <Text className="text-black font-semibold">
            {permission.canAskAgain ? "Grant Permission" : "Open Settings"}
          </Text>
        </Pressable>
        <Pressable
          onPress={() => navigation.goBack()}
          className="mt-4"
        >
          <Text className="text-white/50">Go Back</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#0A0A0F" }}>
      {/* Camera View - Top 60% - LIVE VIEW ONLY */}
      <View style={{ height: cameraHeight, position: "relative" }}>
        <CameraView
          style={{ flex: 1 }}
          facing={facing}
        />

        {/* Camera Overlay UI */}
        <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}>
          {/* Top Bar - Safe area */}
          <View
            style={{
              paddingTop: insets.top + 8,
              paddingHorizontal: 16,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            {/* Back Button */}
            <Pressable
              onPress={() => {
                stopAudioListening();
                navigation.goBack();
              }}
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: "rgba(0, 0, 0, 0.5)",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
            </Pressable>

            {/* Title */}
            <View style={{ alignItems: "center" }}>
              <Text style={{ color: "#FFFFFF", fontSize: 14, fontWeight: "600" }}>
                Live Deal Guidance
              </Text>
              <Text style={{ color: "rgba(255, 255, 255, 0.6)", fontSize: 11, marginTop: 2 }}>
                Use during calls & meetings
              </Text>
            </View>

            {/* Camera Flip */}
            <Pressable
              onPress={toggleCameraFacing}
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: "rgba(0, 0, 0, 0.5)",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Ionicons name="camera-reverse" size={22} color="#FFFFFF" />
            </Pressable>
          </View>

          {/* Status Indicator */}
          <View style={{ position: "absolute", bottom: 16, left: 0, right: 0, alignItems: "center" }}>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                backgroundColor: "rgba(0, 0, 0, 0.6)",
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 20,
              }}
            >
              {isListening ? (
                <Animated.View style={[pulseStyle]}>
                  <View
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: 4,
                      backgroundColor: "#10B981",
                      marginRight: 8,
                    }}
                  />
                </Animated.View>
              ) : (
                <View
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: 4,
                    backgroundColor: isPaused ? "#F59E0B" : "#10B981",
                    marginRight: 8,
                  }}
                />
              )}
              <Text style={{ color: "#FFFFFF", fontSize: 12 }}>
                {isPaused ? "Paused" : isListening ? "Listening..." : "Live View"}
              </Text>
              {isMicEnabled && (
                <View style={{ flexDirection: "row", alignItems: "center", marginLeft: 8 }}>
                  <View style={{ width: 1, height: 12, backgroundColor: "rgba(255, 255, 255, 0.3)", marginRight: 8 }} />
                  <Ionicons name="mic" size={14} color="#10B981" />
                </View>
              )}
            </View>
          </View>

          {/* Deal Context Badge */}
          {activeDealContext && (
            <View style={{ position: "absolute", top: insets.top + 56, left: 16 }}>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  backgroundColor: "rgba(0, 212, 255, 0.2)",
                  paddingHorizontal: 10,
                  paddingVertical: 4,
                  borderRadius: 12,
                }}
              >
                <Ionicons name="folder" size={12} color="#00D4FF" />
                <Text style={{ color: "#00D4FF", fontSize: 11, marginLeft: 4, fontWeight: "500" }} numberOfLines={1}>
                  {activeDealContext.dealName}
                </Text>
              </View>
            </View>
          )}

          {/* Quick Action Buttons - Phone Call, Video Call, Text, Email */}
          <View style={{ position: "absolute", top: insets.top + 56, right: 16, gap: 8 }}>
            {/* Phone Call Button */}
            <Pressable
              onPress={handlePhoneCallPress}
              style={({ pressed }) => ({
                width: 44,
                height: 44,
                borderRadius: 22,
                backgroundColor: pressed ? "rgba(34, 197, 94, 0.5)" : "rgba(34, 197, 94, 0.3)",
                alignItems: "center",
                justifyContent: "center",
                borderWidth: 1,
                borderColor: "rgba(34, 197, 94, 0.6)",
                shadowColor: "#22C55E",
                shadowOffset: { width: 0, height: 0 },
                shadowOpacity: 0.4,
                shadowRadius: 8,
              })}
            >
              <Ionicons name="call" size={24} color="#22C55E" />
            </Pressable>

            {/* Video Call Button */}
            <Pressable
              onPress={handleVideoCallPress}
              style={({ pressed }) => ({
                width: 44,
                height: 44,
                borderRadius: 22,
                backgroundColor: pressed ? "rgba(16, 185, 129, 0.5)" : "rgba(16, 185, 129, 0.3)",
                alignItems: "center",
                justifyContent: "center",
                borderWidth: 1,
                borderColor: "rgba(16, 185, 129, 0.6)",
                shadowColor: "#10B981",
                shadowOffset: { width: 0, height: 0 },
                shadowOpacity: 0.4,
                shadowRadius: 8,
              })}
            >
              <Ionicons name="videocam" size={24} color="#10B981" />
            </Pressable>

            {/* Text Button */}
            <Pressable
              onPress={handleText}
              style={({ pressed }) => ({
                width: 44,
                height: 44,
                borderRadius: 22,
                backgroundColor: pressed ? "rgba(59, 130, 246, 0.5)" : "rgba(59, 130, 246, 0.3)",
                alignItems: "center",
                justifyContent: "center",
                borderWidth: 1,
                borderColor: "rgba(59, 130, 246, 0.6)",
                shadowColor: "#3B82F6",
                shadowOffset: { width: 0, height: 0 },
                shadowOpacity: 0.4,
                shadowRadius: 8,
              })}
            >
              <Ionicons name="chatbubble" size={22} color="#3B82F6" />
            </Pressable>

            {/* Email Button */}
            <Pressable
              onPress={handleEmail}
              style={({ pressed }) => ({
                width: 44,
                height: 44,
                borderRadius: 22,
                backgroundColor: pressed ? "rgba(168, 85, 247, 0.5)" : "rgba(168, 85, 247, 0.3)",
                alignItems: "center",
                justifyContent: "center",
                borderWidth: 1,
                borderColor: "rgba(168, 85, 247, 0.6)",
                shadowColor: "#A855F7",
                shadowOffset: { width: 0, height: 0 },
                shadowOpacity: 0.4,
                shadowRadius: 8,
              })}
            >
              <Ionicons name="mail" size={22} color="#A855F7" />
            </Pressable>
          </View>
        </View>
      </View>

      {/* Guidance Panel - Bottom 40% */}
      <BlurView
        intensity={80}
        tint="dark"
        style={{
          flex: 1,
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
          marginTop: -24,
          overflow: "hidden",
        }}
      >
        <LinearGradient
          colors={["rgba(15, 15, 26, 0.95)", "rgba(10, 10, 15, 0.98)"]}
          style={{
            flex: 1,
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            borderTopWidth: 1,
            borderLeftWidth: 1,
            borderRightWidth: 1,
            borderColor: "rgba(245, 158, 11, 0.2)",
          }}
        >
          {/* Handle */}
          <View style={{ alignItems: "center", paddingTop: 10, paddingBottom: 8 }}>
            <View
              style={{
                width: 36,
                height: 4,
                borderRadius: 2,
                backgroundColor: "rgba(245, 158, 11, 0.3)",
              }}
            />
          </View>

          {/* Guidance History */}
          <View style={{ flex: 1, paddingHorizontal: 16 }}>
            {/* Recent Guidance Tags */}
            {guidanceItems.length > 0 && (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={{ maxHeight: 32, marginBottom: 8 }}
                contentContainerStyle={{ gap: 8 }}
              >
                {guidanceItems.slice(-5).map((item) => (
                  <View
                    key={item.id}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      backgroundColor: `${GUIDANCE_COLORS[item.type]}20`,
                      paddingHorizontal: 10,
                      paddingVertical: 4,
                      borderRadius: 12,
                      borderWidth: 1,
                      borderColor: `${GUIDANCE_COLORS[item.type]}40`,
                    }}
                  >
                    <View
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: 3,
                        backgroundColor: GUIDANCE_COLORS[item.type],
                        marginRight: 6,
                      }}
                    />
                    <Text style={{ color: GUIDANCE_COLORS[item.type], fontSize: 11, fontWeight: "600" }}>
                      {GUIDANCE_LABELS[item.type]}
                    </Text>
                  </View>
                ))}
              </ScrollView>
            )}

            {/* Editable Workspace */}
            <View
              style={{
                flex: 1,
                backgroundColor: "rgba(255, 255, 255, 0.03)",
                borderRadius: 16,
                borderWidth: 1,
                borderColor: "rgba(255, 255, 255, 0.08)",
                marginBottom: 8,
              }}
            >
              <ScrollView
                ref={scrollViewRef}
                style={{ flex: 1 }}
                contentContainerStyle={{ padding: 14 }}
                showsVerticalScrollIndicator={false}
                keyboardDismissMode="interactive"
              >
                <TextInput
                  ref={textInputRef}
                  value={workspaceText}
                  onChangeText={setWorkspaceText}
                  placeholder="Guidance appears here. Tap to edit, copy, or paste..."
                  placeholderTextColor="rgba(255, 255, 255, 0.25)"
                  multiline
                  textAlignVertical="top"
                  selectionColor="#F59E0B"
                  style={{
                    color: "#FFFFFF",
                    fontSize: 15,
                    lineHeight: 22,
                    minHeight: 80,
                  }}
                />
              </ScrollView>

              {/* Copy button */}
              {workspaceText.trim() && (
                <Pressable
                  onPress={handleCopyText}
                  style={{
                    position: "absolute",
                    top: 8,
                    right: 8,
                    width: 32,
                    height: 32,
                    borderRadius: 8,
                    backgroundColor: "rgba(245, 158, 11, 0.15)",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Ionicons name="copy-outline" size={16} color="#F59E0B" />
                </Pressable>
              )}
            </View>
          </View>

          {/* Bottom Toolbar */}
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-around",
              alignItems: "center",
              paddingVertical: 12,
              paddingHorizontal: 12,
              paddingBottom: insets.bottom + 12,
              borderTopWidth: 1,
              borderTopColor: "rgba(255, 255, 255, 0.06)",
            }}
          >
            {/* Pause */}
            <Pressable
              onPress={handlePause}
              style={{
                alignItems: "center",
                paddingVertical: 8,
                paddingHorizontal: 12,
                backgroundColor: isPaused ? "rgba(245, 158, 11, 0.15)" : "rgba(255, 255, 255, 0.05)",
                borderRadius: 12,
                borderWidth: 1,
                borderColor: isPaused ? "rgba(245, 158, 11, 0.3)" : "rgba(255, 255, 255, 0.08)",
              }}
            >
              <Ionicons
                name={isPaused ? "play" : "pause"}
                size={18}
                color={isPaused ? "#F59E0B" : "rgba(255, 255, 255, 0.7)"}
              />
              <Text
                style={{
                  color: isPaused ? "#F59E0B" : "rgba(255, 255, 255, 0.5)",
                  fontSize: 9,
                  marginTop: 3,
                  fontWeight: "500",
                }}
              >
                {isPaused ? "Resume" : "Pause"}
              </Text>
            </Pressable>

            {/* Re-Center */}
            <Pressable
              onPress={handleRecenter}
              style={{
                alignItems: "center",
                paddingVertical: 8,
                paddingHorizontal: 12,
                backgroundColor: "rgba(255, 255, 255, 0.05)",
                borderRadius: 12,
                borderWidth: 1,
                borderColor: "rgba(255, 255, 255, 0.08)",
              }}
            >
              <Ionicons name="refresh" size={18} color="rgba(255, 255, 255, 0.7)" />
              <Text style={{ color: "rgba(255, 255, 255, 0.5)", fontSize: 9, marginTop: 3, fontWeight: "500" }}>
                Re-Center
              </Text>
            </Pressable>

            {/* Clear */}
            <Pressable
              onPress={handleClear}
              style={{
                alignItems: "center",
                paddingVertical: 8,
                paddingHorizontal: 12,
                backgroundColor: "rgba(255, 255, 255, 0.05)",
                borderRadius: 12,
                borderWidth: 1,
                borderColor: "rgba(255, 255, 255, 0.08)",
              }}
            >
              <Ionicons name="trash-outline" size={18} color="rgba(255, 255, 255, 0.7)" />
              <Text style={{ color: "rgba(255, 255, 255, 0.5)", fontSize: 9, marginTop: 3, fontWeight: "500" }}>
                Clear
              </Text>
            </Pressable>

            {/* Toggle Mic */}
            <Pressable
              onPress={handleToggleMic}
              style={{
                alignItems: "center",
                paddingVertical: 8,
                paddingHorizontal: 12,
                backgroundColor: isMicEnabled ? "rgba(16, 185, 129, 0.15)" : "rgba(255, 255, 255, 0.05)",
                borderRadius: 12,
                borderWidth: 1,
                borderColor: isMicEnabled ? "rgba(16, 185, 129, 0.3)" : "rgba(255, 255, 255, 0.08)",
              }}
            >
              <Ionicons
                name={isMicEnabled ? "mic" : "mic-off"}
                size={18}
                color={isMicEnabled ? "#10B981" : "rgba(255, 255, 255, 0.4)"}
              />
              <Text
                style={{
                  color: isMicEnabled ? "#10B981" : "rgba(255, 255, 255, 0.4)",
                  fontSize: 9,
                  marginTop: 3,
                  fontWeight: "500",
                }}
              >
                {isMicEnabled ? "Mic On" : "Mic Off"}
              </Text>
            </Pressable>
          </View>
        </LinearGradient>
      </BlurView>

      {/* Contact Picker Sheet */}
      <ContactPickerSheet
        visible={showContactPicker}
        onClose={() => setShowContactPicker(false)}
        actionType={contactAction}
      />
    </View>
  );
}
