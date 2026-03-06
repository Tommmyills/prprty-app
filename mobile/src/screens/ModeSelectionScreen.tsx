/**
 * ModeSelectionScreen - Choose how you're using the app
 * Shows after tapping "Start Live Negotiation" - before any recording or AI action
 */

import React from "react";
import { View, Text, Pressable } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import Animated, { FadeInUp } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { RootStackParamList, NegotiationMode } from "../types/navigation";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface ModeOption {
  id: NegotiationMode;
  title: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  features: string[];
}

const MODE_OPTIONS: ModeOption[] = [
  {
    id: "on-call",
    title: "On a Call",
    description: "Silent guidance while you talk",
    icon: "call",
    color: "#10B981",
    features: ["Text-only AI", "No interruptions", "Push-to-talk mic"],
  },
  {
    id: "in-person",
    title: "In Person / Meeting",
    description: "Real-time support in the room",
    icon: "people",
    color: "#3B82F6",
    features: ["Tap-to-listen", "Text responses", "Optional voice"],
  },
  {
    id: "writing",
    title: "Writing / Preparing",
    description: "Draft messages and scripts",
    icon: "create",
    color: "#A855F7",
    features: ["No microphone", "Full text editor", "Copy & paste"],
  },
];

export function ModeSelectionScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp>();

  const handleSelectMode = (mode: NegotiationMode) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    navigation.navigate("LiveCoaching", { mode });
  };

  const handleGoBack = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigation.goBack();
  };

  const handleGoHome = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigation.navigate("Dashboard");
  };

  return (
    <View className="flex-1 bg-[#0A0A0F]">
      <LinearGradient
        colors={["#0A0A0F", "#0F0F1A", "#0A0A0F"]}
        style={{ flex: 1 }}
      >
        {/* Header */}
        <View
          style={{ paddingTop: insets.top + 12 }}
          className="px-5 pb-4"
        >
          <View className="flex-row items-center justify-between">
            <Pressable
              onPress={handleGoBack}
              className="w-10 h-10 rounded-full bg-white/5 items-center justify-center"
            >
              <Ionicons name="chevron-back" size={22} color="rgba(255, 255, 255, 0.6)" />
            </Pressable>
            <View className="flex-1 mx-4">
              <Text className="text-white/40 text-xs uppercase tracking-wider">
                Negotiation Mode
              </Text>
              <Text className="text-white text-xl font-bold mt-1">
                How are you using this?
              </Text>
            </View>
            {/* Home button */}
            <Pressable
              onPress={handleGoHome}
              className="w-10 h-10 rounded-full bg-white/5 items-center justify-center"
            >
              <Ionicons name="grid" size={18} color="rgba(212, 175, 55, 0.8)" />
            </Pressable>
          </View>
        </View>

        {/* Mode Options */}
        <View className="flex-1 px-5 pt-4">
          {MODE_OPTIONS.map((option, index) => (
            <Animated.View
              key={option.id}
              entering={FadeInUp.delay(100 + index * 100).duration(400)}
            >
              <Pressable
                onPress={() => handleSelectMode(option.id)}
                style={({ pressed }) => ({
                  opacity: pressed ? 0.8 : 1,
                  transform: [{ scale: pressed ? 0.98 : 1 }],
                })}
                className="mb-4"
              >
                <LinearGradient
                  colors={[`${option.color}15`, `${option.color}08`, "rgba(0,0,0,0.3)"]}
                  locations={[0, 0.5, 1]}
                  style={{
                    borderRadius: 20,
                    borderWidth: 1,
                    borderColor: `${option.color}30`,
                    padding: 20,
                  }}
                >
                  <View className="flex-row items-start">
                    {/* Icon */}
                    <View
                      style={{
                        width: 56,
                        height: 56,
                        borderRadius: 16,
                        backgroundColor: `${option.color}20`,
                        alignItems: "center",
                        justifyContent: "center",
                        marginRight: 16,
                      }}
                    >
                      <Ionicons name={option.icon} size={28} color={option.color} />
                    </View>

                    {/* Content */}
                    <View className="flex-1">
                      <Text className="text-white text-lg font-bold mb-1">
                        {option.title}
                      </Text>
                      <Text className="text-white/50 text-sm mb-3">
                        {option.description}
                      </Text>

                      {/* Features */}
                      <View className="flex-row flex-wrap">
                        {option.features.map((feature, idx) => (
                          <View
                            key={idx}
                            style={{
                              backgroundColor: `${option.color}15`,
                              borderRadius: 8,
                              paddingHorizontal: 10,
                              paddingVertical: 4,
                              marginRight: 8,
                              marginBottom: 6,
                            }}
                          >
                            <Text style={{ color: option.color, fontSize: 11, fontWeight: "600" }}>
                              {feature}
                            </Text>
                          </View>
                        ))}
                      </View>
                    </View>

                    {/* Arrow */}
                    <View className="justify-center">
                      <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.3)" />
                    </View>
                  </View>
                </LinearGradient>
              </Pressable>
            </Animated.View>
          ))}

          {/* Info note */}
          <Animated.View
            entering={FadeInUp.delay(500).duration(400)}
            className="mt-4 px-4"
          >
            <View
              style={{
                backgroundColor: "rgba(255, 184, 0, 0.08)",
                borderRadius: 12,
                padding: 14,
                borderWidth: 1,
                borderColor: "rgba(255, 184, 0, 0.15)",
              }}
            >
              <View className="flex-row items-start">
                <Ionicons name="shield-checkmark" size={18} color="#FFB800" style={{ marginTop: 1 }} />
                <Text className="text-white/60 text-sm ml-3 flex-1 leading-5">
                  Your conversations stay private. AI guidance appears as text you can edit, copy, and use however you need.
                </Text>
              </View>
            </View>
          </Animated.View>
        </View>

        {/* Bottom safe area */}
        <View style={{ height: insets.bottom + 20 }} />
      </LinearGradient>
    </View>
  );
}
