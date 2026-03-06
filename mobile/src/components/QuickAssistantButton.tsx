/**
 * Quick Assistant Button with Record control
 * Small floating icon with single record/stop button
 * Icon and glow fade in together for smooth appearance
 */

import React, { useState, useRef, useEffect } from "react";
import { View, Text, Pressable, Image } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withSequence,
  withDelay,
  Easing,
  cancelAnimation,
  interpolate,
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Audio } from "expo-av";
import { transcribeAudio } from "../api/transcribe-audio";
import {
  AssistantMessage,
  AIProvider,
} from "../services/multiAIAssistant";
import { sendToHomepageAgent, AgentMessage } from "../services/homepageAgent";
import { speakThroughSpeaker, stopSpeakerAudio } from "../services/speakerAudio";

interface QuickAssistantButtonProps {
  onShowChat: (messages: AssistantMessage[]) => void;
  onOpenAssistant: () => void;
  messages: AssistantMessage[];
  setMessages: React.Dispatch<React.SetStateAction<AssistantMessage[]>>;
  selectedProvider: AIProvider;
  silentMode?: boolean;
}

// Status messages in sequence (after "Processing…")
const STATUS_SEQUENCE = ["Working", "Thinking", "Preparing", "Ready soon"];
const STATUS_INTERVAL_MS = 4000; // 4 seconds between each status

export function QuickAssistantButton({
  onShowChat,
  onOpenAssistant,
  messages,
  setMessages,
  selectedProvider,
  silentMode = false,
}: QuickAssistantButtonProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusText, setStatusText] = useState("Processing…");
  const [isSpeaking, setIsSpeaking] = useState(false);
  const recordingRef = useRef<Audio.Recording | null>(null);
  const statusTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const statusIndexRef = useRef(0);

  // Pulsing animation for recording
  const pulseScale = useSharedValue(1);

  // Breathing glow animation - always on, more intense when active
  const glowBreath = useSharedValue(0);
  const glowFadeIn = useSharedValue(0); // Glow fades in AFTER icon loads
  const baseGlowOpacity = useSharedValue(1); // Always visible
  const recordingIntensity = useSharedValue(0); // Extra intensity when active

  // Track if assistant is active (recording, processing, OR speaking)
  const isAssistantActive = isRecording || isProcessing || isSpeaking;

  // Initialize audio mode on mount and cleanup on unmount
  useEffect(() => {
    const initAudio = async () => {
      try {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: true,
          playsInSilentModeIOS: true,
          staysActiveInBackground: false,
          shouldDuckAndroid: true,
          playThroughEarpieceAndroid: false,
        });
      } catch (error) {
        console.log("[QuickAssistant] Audio init error:", error);
      }
    };
    initAudio();

    // Glow fades in AFTER icon loads (500ms delay)
    glowFadeIn.value = withDelay(500, withTiming(1, { duration: 600, easing: Easing.out(Easing.cubic) }));

    // Cleanup on unmount
    return () => {
      if (recordingRef.current) {
        recordingRef.current.stopAndUnloadAsync().catch(() => {});
        recordingRef.current = null;
      }
      if (statusTimerRef.current) {
        clearTimeout(statusTimerRef.current);
      }
    };
  }, []);

  // Start status messages when processing begins - step-based progression
  useEffect(() => {
    if (isProcessing) {
      // Reset to initial state - show "Processing…" immediately
      setStatusText("Processing…");
      statusIndexRef.current = 0;

      // Step-based progression: after 4 seconds, start showing status sequence
      const showNextStatus = () => {
        if (statusIndexRef.current < STATUS_SEQUENCE.length) {
          // Show current status
          setStatusText(STATUS_SEQUENCE[statusIndexRef.current]);
          statusIndexRef.current += 1;

          // Schedule next status after 4 seconds (if not at "Ready soon")
          if (statusIndexRef.current < STATUS_SEQUENCE.length) {
            statusTimerRef.current = setTimeout(showNextStatus, STATUS_INTERVAL_MS);
          }
          // "Ready soon" stays visible indefinitely until speech starts
        }
      };

      // Wait 4 seconds after "Processing…" before showing first status
      statusTimerRef.current = setTimeout(showNextStatus, STATUS_INTERVAL_MS);
    } else {
      // Clear any pending timers when processing stops
      if (statusTimerRef.current) {
        clearTimeout(statusTimerRef.current);
        statusTimerRef.current = null;
      }
      // Reset status text for next time
      setStatusText("Processing…");
      statusIndexRef.current = 0;
    }

    return () => {
      if (statusTimerRef.current) {
        clearTimeout(statusTimerRef.current);
      }
    };
  }, [isProcessing]);

  // Star twinkle animation - irregular timing
  const starBrightness = useSharedValue(0);
  const starBlur = useSharedValue(0);

  // Start the breathing glow animation on mount (always running)
  useEffect(() => {
    // Breathing glow - slow organic cycle (always on)
    glowBreath.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 2500, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: 2500, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      false
    );
  }, []);

  // Increase intensity when assistant is active (recording, processing, OR speaking)
  useEffect(() => {
    if (isAssistantActive) {
      // Boost intensity when active
      recordingIntensity.value = withTiming(1, { duration: 400 });

      // Star twinkle - irregular pattern
      starBrightness.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 600, easing: Easing.out(Easing.quad) }),
          withTiming(0.3, { duration: 800, easing: Easing.inOut(Easing.sin) }),
          withDelay(200, withTiming(0.9, { duration: 400, easing: Easing.out(Easing.quad) })),
          withTiming(0.5, { duration: 1000, easing: Easing.inOut(Easing.sin) }),
          withDelay(100, withTiming(0.7, { duration: 300, easing: Easing.out(Easing.quad) })),
          withTiming(0.2, { duration: 700, easing: Easing.in(Easing.quad) })
        ),
        -1,
        false
      );

      // Star blur variation
      starBlur.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 700, easing: Easing.inOut(Easing.sin) }),
          withTiming(0.4, { duration: 900, easing: Easing.inOut(Easing.sin) }),
          withTiming(0.8, { duration: 500, easing: Easing.inOut(Easing.sin) }),
          withTiming(0.2, { duration: 1100, easing: Easing.inOut(Easing.sin) })
        ),
        -1,
        false
      );
    } else {
      // Reduce intensity when not active
      cancelAnimation(starBrightness);
      cancelAnimation(starBlur);
      recordingIntensity.value = withTiming(0, { duration: 500 });
      starBrightness.value = withTiming(0, { duration: 200 });
      starBlur.value = withTiming(0, { duration: 200 });
    }
  }, [isAssistantActive]);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
  }));

  // Outer aura glow - breathing effect (always visible, more intense when recording)
  const auraStyle = useAnimatedStyle(() => {
    // Base breathing intensity
    const baseIntensity = interpolate(glowBreath.value, [0, 1], [0.25, 0.5]);
    // Extra intensity when recording
    const activeBoost = interpolate(recordingIntensity.value, [0, 1], [0, 0.4]);
    const blurRadius = interpolate(glowBreath.value, [0, 1], [25, 45]);
    const activeBlurBoost = interpolate(recordingIntensity.value, [0, 1], [0, 15]);

    return {
      opacity: glowFadeIn.value * baseGlowOpacity.value * (baseIntensity + activeBoost),
      shadowRadius: blurRadius + activeBlurBoost,
    };
  });

  // Inner soft glow layer (always visible)
  const innerGlowStyle = useAnimatedStyle(() => {
    const baseIntensity = interpolate(glowBreath.value, [0, 1], [0.2, 0.45]);
    const activeBoost = interpolate(recordingIntensity.value, [0, 1], [0, 0.35]);

    return {
      opacity: glowFadeIn.value * baseGlowOpacity.value * (baseIntensity + activeBoost),
    };
  });

  // Icon fade in style - icon shows immediately (no fade needed, it's always there)
  const iconFadeStyle = useAnimatedStyle(() => ({
    opacity: 1,
  }));

  // Star flare style (only when recording)
  const starStyle = useAnimatedStyle(() => {
    const brightness = interpolate(starBrightness.value, [0, 1], [0.2, 1]);
    const blur = interpolate(starBlur.value, [0, 1], [2, 6]);

    return {
      opacity: recordingIntensity.value * brightness,
      shadowRadius: blur,
      shadowOpacity: brightness * 0.9,
    };
  });

  // Micro glint (subtle secondary sparkle - only when recording)
  const glintStyle = useAnimatedStyle(() => {
    const glint = interpolate(starBrightness.value, [0, 0.5, 1], [0, 0.8, 0.3]);

    return {
      opacity: recordingIntensity.value * glint * 0.6,
    };
  });

  // Start recording
  const startRecording = async () => {
    // Prevent multiple simultaneous recording attempts
    if (isRecording || isProcessing) {
      console.log("[QuickAssistant] Already recording or processing");
      return;
    }

    try {
      // Clean up any existing recording first
      if (recordingRef.current) {
        try {
          const status = await recordingRef.current.getStatusAsync();
          if (status.isRecording) {
            await recordingRef.current.stopAndUnloadAsync();
          } else if (status.isDoneRecording) {
            await recordingRef.current.stopAndUnloadAsync();
          }
        } catch (e) {
          // Recording might already be unloaded, that's fine
          console.log("[QuickAssistant] Cleanup warning:", e);
        }
        recordingRef.current = null;
      }

      const { status } = await Audio.requestPermissionsAsync();
      if (status !== "granted") {
        console.log("[QuickAssistant] Microphone permission denied");
        return;
      }

      // Stop any playing audio first
      await stopSpeakerAudio();

      // Reset audio mode completely first
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });

      // Small delay
      await new Promise(resolve => setTimeout(resolve, 100));

      // Now set for recording
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });

      // Small delay to ensure audio mode is fully applied on iOS
      await new Promise(resolve => setTimeout(resolve, 150));

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      recordingRef.current = recording;
      setIsRecording(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

      // Start pulse animation
      pulseScale.value = withRepeat(
        withSequence(
          withTiming(1.03, { duration: 800, easing: Easing.inOut(Easing.sin) }),
          withTiming(1, { duration: 800, easing: Easing.inOut(Easing.sin) })
        ),
        -1,
        false
      );

      // Open chat window
      onShowChat(messages);
    } catch (error) {
      console.error("[QuickAssistant] Recording error:", error);
      // Reset state on error
      setIsRecording(false);
      recordingRef.current = null;
    }
  };

  // Stop recording and process
  const stopRecording = async () => {
    if (!recordingRef.current) return;

    try {
      setIsRecording(false);
      setIsProcessing(true);
      pulseScale.value = withTiming(1);
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
        setIsProcessing(false);
        return;
      }

      // Transcribe
      const transcription = await transcribeAudio(uri);

      if (transcription && transcription.trim()) {
        // Add user message
        const userMsg: AssistantMessage = {
          id: Date.now().toString(),
          role: "user",
          content: transcription.trim(),
          timestamp: new Date(),
        };
        const newMessages = [...messages, userMsg];
        setMessages(newMessages);

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

        // Set speaking state to hide status text immediately before speech starts
        setIsSpeaking(true);
        setIsProcessing(false);

        // Speak response through speaker only if not in silent mode
        if (!silentMode) {
          await speakThroughSpeaker(response.content);
        }
        setIsSpeaking(false);

        // Make sure chat is visible
        onShowChat([...newMessages, response]);
      } else {
        setIsProcessing(false);
      }
    } catch (error) {
      console.error("[QuickAssistant] Error:", error);
      setIsRecording(false);
      setIsProcessing(false);
      setIsSpeaking(false);
    }
  };

  // Toggle recording
  const handleRecord = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const size = 77; // Avatar size
  const micSize = 28; // Smaller mic button

  // Generate ultra-smooth gradient with 25 layers for seamless aura
  // Using exponential opacity falloff for natural light diffusion - no visible rings
  const generateSmoothGlow = () => {
    const layers = [];
    const numLayers = 25;
    const maxRadius = 130; // How far the glow extends

    for (let i = 0; i < numLayers; i++) {
      const progress = i / (numLayers - 1); // 0 to 1
      // Exponential falloff - bright center, smoothly fading to nothing
      const opacity = Math.pow(1 - progress, 3) * 0.4;
      const layerSize = size + (maxRadius * progress);

      layers.push({
        size: layerSize,
        opacity: opacity,
      });
    }
    return layers.reverse(); // Render outer layers first
  };

  const glowLayers = generateSmoothGlow();

  return (
    <View style={{ alignItems: "center" }}>
      {/* Main button container */}
      <View
        style={{
          width: size,
          height: size,
          alignItems: "center",
        }}
      >
        {/* Seamless radial aura - 25 layers with exponential falloff */}
        {glowLayers.map((layer, index) => (
          <Animated.View
            key={index}
            style={[
              auraStyle,
              {
                position: "absolute",
                width: layer.size,
                height: layer.size,
                left: (size - layer.size) / 2,
                top: (size - layer.size) / 2,
                borderRadius: layer.size / 2,
                backgroundColor: `rgba(255, 60, 150, ${layer.opacity})`,
              },
            ]}
          />
        ))}

        {/* Avatar without border ring - brightness lowered 15% */}
        <Animated.View style={[pulseStyle, iconFadeStyle]}>
          <View
            style={{
              width: size,
              height: size,
              borderRadius: size / 2,
              overflow: "hidden",
              opacity: 0.85,
            }}
          >
            <Image
              source={require("../../assets/image-1764988335.jpeg")}
              style={{
                width: size,
                height: size,
                resizeMode: "cover",
              }}
            />
          </View>
        </Animated.View>

        {/* Record/Stop button - positioned at 2:30 o'clock (upper right) */}
        <Pressable
          onPress={handleRecord}
          disabled={isProcessing}
          style={{
            position: "absolute",
            top: 2,
            right: -2,
            width: micSize,
            height: micSize,
            borderRadius: micSize / 2,
            backgroundColor: isRecording
              ? "rgba(0, 0, 0, 0.6)"
              : "transparent",
            alignItems: "center",
            justifyContent: "center",
            opacity: isProcessing ? 0.7 : 1,
          }}
        >
          {isRecording ? (
            <View
              style={{
                width: 10,
                height: 10,
                backgroundColor: "#FFFFFF",
                borderRadius: 2,
              }}
            />
          ) : (
            <Ionicons
              name={isProcessing ? "hourglass" : "mic"}
              size={14}
              color="rgba(255, 200, 220, 0.9)"
            />
          )}
        </Pressable>
      </View>

      {/* Status text - always visible while processing, hide only when speaking */}
      {(isRecording || isProcessing) && !isSpeaking && (
        <Text
          style={{
            color: isRecording ? "#EF4444" : "#FFB800",
            fontSize: 10,
            marginTop: 4,
          }}
        >
          {isRecording ? "Tap to send" : statusText}
        </Text>
      )}
    </View>
  );
}
