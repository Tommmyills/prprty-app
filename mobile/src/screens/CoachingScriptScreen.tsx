import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TextInput,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeInDown, FadeInUp } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { GlassCard, GlowButton } from "../components";
import { sendCoachingRequest } from "../api/coaching-webhook";

export function CoachingScriptScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [scriptRequest, setScriptRequest] = useState("");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<"idle" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const handleSubmit = async () => {
    if (!name.trim() || !phone.trim() || !scriptRequest.trim()) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setSubmitStatus("error");
      setErrorMessage("Please fill in all required fields");
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Keyboard.dismiss();
    setIsSubmitting(true);
    setSubmitStatus("idle");

    const result = await sendCoachingRequest({
      name: name.trim(),
      phone: phone.trim(),
      scriptRequest: scriptRequest.trim(),
      notes: notes.trim(),
      timestamp: new Date().toISOString(),
    });

    setIsSubmitting(false);

    if (result.success) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setSubmitStatus("success");
      // Clear form on success
      setName("");
      setPhone("");
      setScriptRequest("");
      setNotes("");
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setSubmitStatus("error");
      setErrorMessage(result.error || "Failed to submit request");
    }
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

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{
            paddingHorizontal: 20,
            paddingTop: insets.top + 20,
            paddingBottom: insets.bottom + 40,
          }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
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
              <Ionicons name="megaphone" size={20} color="#10B981" />
              <Text
                style={{ color: "#10B981", letterSpacing: 1 }}
                className="text-sm ml-2 uppercase font-semibold"
              >
                Realtor Coaching
              </Text>
            </View>
            <Text className="text-white text-2xl font-bold">Get Your Script</Text>
            <Text style={{ color: "rgba(255, 255, 255, 0.6)" }} className="text-base mt-2">
              Request a personalized coaching script
            </Text>
          </Animated.View>

          {/* Form */}
          <Animated.View
            entering={FadeInDown.delay(200).springify()}
            className="mt-6"
          >
            <GlassCard glowColor="#10B981" intensity="low" animated={false}>
              {/* Name Input */}
              <View className="mb-5">
                <Text style={{ color: "rgba(255, 255, 255, 0.7)" }} className="text-sm mb-2 uppercase tracking-wide">
                  Your Name *
                </Text>
                <TextInput
                  value={name}
                  onChangeText={setName}
                  placeholder="Enter your name"
                  placeholderTextColor="rgba(255, 255, 255, 0.3)"
                  style={{
                    backgroundColor: "rgba(255, 255, 255, 0.05)",
                    borderWidth: 1,
                    borderColor: "rgba(255, 255, 255, 0.1)",
                    borderRadius: 12,
                    paddingHorizontal: 16,
                    paddingVertical: 14,
                    color: "#FFFFFF",
                    fontSize: 16,
                  }}
                />
              </View>

              {/* Phone Input */}
              <View className="mb-5">
                <Text style={{ color: "rgba(255, 255, 255, 0.7)" }} className="text-sm mb-2 uppercase tracking-wide">
                  Phone Number *
                </Text>
                <TextInput
                  value={phone}
                  onChangeText={setPhone}
                  placeholder="Enter your phone number"
                  placeholderTextColor="rgba(255, 255, 255, 0.3)"
                  keyboardType="phone-pad"
                  style={{
                    backgroundColor: "rgba(255, 255, 255, 0.05)",
                    borderWidth: 1,
                    borderColor: "rgba(255, 255, 255, 0.1)",
                    borderRadius: 12,
                    paddingHorizontal: 16,
                    paddingVertical: 14,
                    color: "#FFFFFF",
                    fontSize: 16,
                  }}
                />
              </View>

              {/* Script Request Input */}
              <View className="mb-5">
                <Text style={{ color: "rgba(255, 255, 255, 0.7)" }} className="text-sm mb-2 uppercase tracking-wide">
                  Script Request *
                </Text>
                <TextInput
                  value={scriptRequest}
                  onChangeText={setScriptRequest}
                  placeholder="What type of script do you need?"
                  placeholderTextColor="rgba(255, 255, 255, 0.3)"
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                  style={{
                    backgroundColor: "rgba(255, 255, 255, 0.05)",
                    borderWidth: 1,
                    borderColor: "rgba(255, 255, 255, 0.1)",
                    borderRadius: 12,
                    paddingHorizontal: 16,
                    paddingVertical: 14,
                    color: "#FFFFFF",
                    fontSize: 16,
                    minHeight: 100,
                  }}
                />
              </View>

              {/* Notes Input */}
              <View>
                <Text style={{ color: "rgba(255, 255, 255, 0.7)" }} className="text-sm mb-2 uppercase tracking-wide">
                  Additional Notes
                </Text>
                <TextInput
                  value={notes}
                  onChangeText={setNotes}
                  placeholder="Any additional details..."
                  placeholderTextColor="rgba(255, 255, 255, 0.3)"
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                  style={{
                    backgroundColor: "rgba(255, 255, 255, 0.05)",
                    borderWidth: 1,
                    borderColor: "rgba(255, 255, 255, 0.1)",
                    borderRadius: 12,
                    paddingHorizontal: 16,
                    paddingVertical: 14,
                    color: "#FFFFFF",
                    fontSize: 16,
                    minHeight: 100,
                  }}
                />
              </View>
            </GlassCard>
          </Animated.View>

          {/* Submit Button */}
          <Animated.View
            entering={FadeInDown.delay(300).springify()}
            className="mt-6"
          >
            <GlowButton
              title={isSubmitting ? "Submitting..." : "Get Coaching Script"}
              onPress={handleSubmit}
              variant="primary"
              icon={isSubmitting ? "sync" : "send"}
              loading={isSubmitting}
              size="lg"
            />
          </Animated.View>

          {/* Success Message */}
          {submitStatus === "success" && (
            <Animated.View
              entering={FadeInUp.springify()}
              className="mt-6"
            >
              <GlassCard glowColor="#10B981" intensity="high" animated={false}>
                <View className="flex-row items-center">
                  <View
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 22,
                      backgroundColor: "rgba(16, 185, 129, 0.2)",
                      alignItems: "center",
                      justifyContent: "center",
                      marginRight: 14,
                    }}
                  >
                    <Ionicons name="checkmark-circle" size={24} color="#10B981" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-white text-lg font-semibold">
                      Request Submitted!
                    </Text>
                    <Text style={{ color: "rgba(255, 255, 255, 0.7)" }} className="text-sm mt-1">
                      Your coaching script request has been sent successfully.
                    </Text>
                  </View>
                </View>
              </GlassCard>
            </Animated.View>
          )}

          {/* Error Message */}
          {submitStatus === "error" && (
            <Animated.View
              entering={FadeInUp.springify()}
              className="mt-6"
            >
              <GlassCard glowColor="#EF4444" intensity="high" animated={false}>
                <View className="flex-row items-center">
                  <View
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 22,
                      backgroundColor: "rgba(239, 68, 68, 0.2)",
                      alignItems: "center",
                      justifyContent: "center",
                      marginRight: 14,
                    }}
                  >
                    <Ionicons name="alert-circle" size={24} color="#EF4444" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-white text-lg font-semibold">
                      Error
                    </Text>
                    <Text style={{ color: "rgba(255, 255, 255, 0.7)" }} className="text-sm mt-1">
                      {errorMessage}
                    </Text>
                  </View>
                  <Pressable
                    onPress={() => setSubmitStatus("idle")}
                    style={{
                      padding: 8,
                    }}
                  >
                    <Ionicons name="close" size={20} color="rgba(255, 255, 255, 0.5)" />
                  </Pressable>
                </View>
              </GlassCard>
            </Animated.View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
