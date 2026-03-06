/**
 * AI Assistant Panel
 * Simple voice chat - record, get response with text AND voice
 */

import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  FadeIn,
  FadeOut,
  SlideInDown,
  SlideOutDown,
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Audio } from "expo-av";
import { transcribeAudio } from "../api/transcribe-audio";
import { sendToAssistant, AssistantMessage } from "../services/realtorAssistant";
import { speakThroughSpeaker, stopSpeakerAudio } from "../services/speakerAudio";

interface AIAssistantPanelProps {
  visible: boolean;
  onClose: () => void;
}

export function AIAssistantPanel({ visible, onClose }: AIAssistantPanelProps) {
  const insets = useSafeAreaInsets();
  const scrollViewRef = useRef<ScrollView>(null);

  const [messages, setMessages] = useState<AssistantMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const recordingRef = useRef<Audio.Recording | null>(null);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages.length]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopSpeakerAudio();
      if (recordingRef.current) {
        recordingRef.current.stopAndUnloadAsync();
      }
    };
  }, []);

  const handleClose = () => {
    stopSpeakerAudio();
    if (recordingRef.current) {
      recordingRef.current.stopAndUnloadAsync();
      recordingRef.current = null;
    }
    setIsRecording(false);
    setIsTranscribing(false);
    setIsSpeaking(false);
    onClose();
  };

  // Speak text using shared speaker audio service (includes formatting sanitization)
  const speakText = async (text: string) => {
    setIsSpeaking(true);
    try {
      await speakThroughSpeaker(text);
    } finally {
      setIsSpeaking(false);
    }
  };

  const stopSpeaking = () => {
    stopSpeakerAudio();
    setIsSpeaking(false);
  };

  // Start recording
  const startRecording = async () => {
    try {
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== "granted") return;

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      recordingRef.current = recording;
      setIsRecording(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    } catch (error) {
      console.error("[Assistant] Recording error:", error);
    }
  };

  // Stop recording and send
  const stopRecording = async () => {
    if (!recordingRef.current) return;

    try {
      setIsRecording(false);
      setIsTranscribing(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      await recordingRef.current.stopAndUnloadAsync();
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
      });

      const uri = recordingRef.current.getURI();
      recordingRef.current = null;

      if (!uri) {
        setIsTranscribing(false);
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
        setMessages((prev) => [...prev, userMsg]);
        setIsTranscribing(false);
        setIsLoading(true);

        // Get AI response
        const response = await sendToAssistant(transcription.trim(), messages);
        setMessages((prev) => [...prev, response]);
        setIsLoading(false);

        // Speak the response
        speakText(response.content);
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

  const handleRecordPress = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  if (!visible) return null;

  return (
    <Animated.View
      entering={FadeIn.duration(200)}
      exiting={FadeOut.duration(200)}
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0, 0, 0, 0.7)",
        zIndex: 10000,
      }}
    >
      <Pressable style={{ flex: 1 }} onPress={handleClose} />

      <Animated.View
        entering={SlideInDown.springify().damping(20)}
        exiting={SlideOutDown.springify().damping(20)}
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: "70%",
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
          overflow: "hidden",
        }}
      >
        <LinearGradient colors={["#1A1A2E", "#0F0F1A"]} style={{ flex: 1 }}>
          {/* Header */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              paddingHorizontal: 20,
              paddingTop: 16,
              paddingBottom: 12,
              borderBottomWidth: 1,
              borderBottomColor: "rgba(255, 255, 255, 0.1)",
            }}
          >
            <Text style={{ color: "#FFFFFF", fontSize: 18, fontWeight: "600" }}>
              Assistant
            </Text>

            <View style={{ flexDirection: "row", alignItems: "center" }}>
              {isSpeaking && (
                <Pressable
                  onPress={stopSpeaking}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    backgroundColor: "rgba(139, 92, 246, 0.2)",
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                    borderRadius: 16,
                    marginRight: 12,
                  }}
                >
                  <Ionicons name="volume-high" size={16} color="#8B5CF6" />
                  <Text style={{ color: "#8B5CF6", marginLeft: 6, fontSize: 12 }}>
                    Tap to stop
                  </Text>
                </Pressable>
              )}
              <Pressable onPress={handleClose}>
                <Ionicons name="close" size={24} color="#9CA3AF" />
              </Pressable>
            </View>
          </View>

          {/* Messages */}
          <ScrollView
            ref={scrollViewRef}
            style={{ flex: 1 }}
            contentContainerStyle={{ padding: 16, paddingBottom: 20 }}
            showsVerticalScrollIndicator={false}
          >
            {messages.length === 0 && !isLoading && !isTranscribing && (
              <View style={{ alignItems: "center", paddingTop: 80 }}>
                <View
                  style={{
                    width: 80,
                    height: 80,
                    borderRadius: 40,
                    backgroundColor: "rgba(139, 92, 246, 0.15)",
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: 20,
                  }}
                >
                  <Ionicons name="mic" size={36} color="#8B5CF6" />
                </View>
                <Text
                  style={{
                    color: "#FFFFFF",
                    fontSize: 18,
                    fontWeight: "600",
                    marginBottom: 8,
                  }}
                >
                  Tap to Talk
                </Text>
                <Text
                  style={{
                    color: "rgba(255, 255, 255, 0.5)",
                    fontSize: 14,
                    textAlign: "center",
                    paddingHorizontal: 40,
                  }}
                >
                  Press the record button below and speak your question
                </Text>
              </View>
            )}

            {messages.map((msg) => (
              <View
                key={msg.id}
                style={{
                  alignItems: msg.role === "user" ? "flex-end" : "flex-start",
                  marginBottom: 12,
                }}
              >
                <View
                  style={{
                    backgroundColor:
                      msg.role === "user" ? "#FFB800" : "rgba(255, 255, 255, 0.1)",
                    borderRadius: 16,
                    borderTopRightRadius: msg.role === "user" ? 4 : 16,
                    borderTopLeftRadius: msg.role === "user" ? 16 : 4,
                    padding: 12,
                    maxWidth: "85%",
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
              </View>
            ))}

            {isTranscribing && (
              <View style={{ alignItems: "flex-end", marginBottom: 12 }}>
                <View
                  style={{
                    backgroundColor: "rgba(255, 184, 0, 0.2)",
                    borderRadius: 16,
                    padding: 12,
                    flexDirection: "row",
                    alignItems: "center",
                  }}
                >
                  <ActivityIndicator color="#FFB800" size="small" />
                  <Text style={{ color: "#FFB800", marginLeft: 8 }}>
                    Processing...
                  </Text>
                </View>
              </View>
            )}

            {isLoading && (
              <View style={{ alignItems: "flex-start", marginBottom: 12 }}>
                <View
                  style={{
                    backgroundColor: "rgba(255, 255, 255, 0.1)",
                    borderRadius: 16,
                    padding: 12,
                    flexDirection: "row",
                    alignItems: "center",
                  }}
                >
                  <ActivityIndicator color="#8B5CF6" size="small" />
                  <Text style={{ color: "rgba(255, 255, 255, 0.6)", marginLeft: 8 }}>
                    Thinking...
                  </Text>
                </View>
              </View>
            )}
          </ScrollView>

          {/* Record Button */}
          <View
            style={{
              paddingHorizontal: 20,
              paddingTop: 16,
              paddingBottom: insets.bottom + 20,
              alignItems: "center",
              borderTopWidth: 1,
              borderTopColor: "rgba(255, 255, 255, 0.1)",
            }}
          >
            <Pressable
              onPress={handleRecordPress}
              disabled={isLoading || isTranscribing}
              style={{
                width: 72,
                height: 72,
                borderRadius: 36,
                backgroundColor: isRecording ? "#EF4444" : "#8B5CF6",
                alignItems: "center",
                justifyContent: "center",
                shadowColor: isRecording ? "#EF4444" : "#8B5CF6",
                shadowOffset: { width: 0, height: 0 },
                shadowOpacity: 0.6,
                shadowRadius: 20,
                opacity: isLoading || isTranscribing ? 0.5 : 1,
              }}
            >
              <Ionicons
                name={isRecording ? "stop" : "mic"}
                size={32}
                color="#FFFFFF"
              />
            </Pressable>
            <Text
              style={{
                color: "rgba(255, 255, 255, 0.5)",
                fontSize: 13,
                marginTop: 12,
              }}
            >
              {isRecording
                ? "Tap to send"
                : isTranscribing
                ? "Processing voice..."
                : isLoading
                ? "Getting response..."
                : "Tap to record"}
            </Text>
          </View>
        </LinearGradient>
      </Animated.View>
    </Animated.View>
  );
}
