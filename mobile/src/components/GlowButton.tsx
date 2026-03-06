import React from "react";
import { View, Text, Pressable } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  FadeIn,
  FadeOut,
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { cn } from "../utils/cn";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface GlowButtonProps {
  title: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "success" | "danger";
  icon?: keyof typeof Ionicons.glyphMap;
  disabled?: boolean;
  loading?: boolean;
  size?: "sm" | "md" | "lg";
}

export function GlowButton({
  title,
  onPress,
  variant = "primary",
  icon,
  disabled = false,
  loading = false,
  size = "md",
}: GlowButtonProps) {
  const scale = useSharedValue(1);
  const glowIntensity = useSharedValue(0.3);

  const variantColors = {
    primary: {
      gradient: ["#6B21A8", "#FF6B35"], // Deep Purple to Sunset Orange
      text: "#FFFFFF",
      glow: "#FF6B35",
    },
    secondary: {
      gradient: ["rgba(255,255,255,0.1)", "rgba(255,255,255,0.05)"],
      text: "#FFFFFF",
      glow: "#A855F7",
    },
    success: {
      gradient: ["#10B981", "#059669"],
      text: "#FFFFFF",
      glow: "#10B981",
    },
    danger: {
      gradient: ["#EF4444", "#DC2626"],
      text: "#FFFFFF",
      glow: "#EF4444",
    },
  };

  const sizeClasses = {
    sm: "px-4 py-2",
    md: "px-6 py-3",
    lg: "px-8 py-4",
  };

  const colors = variantColors[variant];

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const glowStyle = useAnimatedStyle(() => ({
    shadowOpacity: glowIntensity.value,
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.96, { damping: 15, stiffness: 400 });
    glowIntensity.value = withTiming(0.6, { duration: 150 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 400 });
    glowIntensity.value = withTiming(0.3, { duration: 150 });
  };

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled || loading}
      style={[
        animatedStyle,
        glowStyle,
        {
          shadowColor: colors.glow,
          shadowOffset: { width: 0, height: 4 },
          shadowRadius: 16,
          elevation: 10,
          overflow: "hidden",
          borderRadius: 16,
        },
      ]}
      className={cn(
        "flex-row items-center justify-center rounded-2xl",
        sizeClasses[size]
      )}
    >
      {/* Gradient background with inner glow */}
      <LinearGradient
        colors={disabled ? ["rgba(107, 114, 128, 0.5)", "rgba(107, 114, 128, 0.3)"] as const : colors.gradient as any}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          borderRadius: 16,
        }}
      />

      {/* Inner glow effect for self-illumination */}
      {!disabled && (
        <View
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(255, 255, 255, 0.15)",
            borderRadius: 16,
          }}
        />
      )}

      {/* Content */}
      <View className="flex-row items-center justify-center" style={{ padding: size === "sm" ? 8 : size === "md" ? 12 : 16 }}>
        {loading ? (
          <Animated.View entering={FadeIn} exiting={FadeOut}>
            <Ionicons name="sync" size={20} color={colors.text} />
          </Animated.View>
        ) : (
          <>
            {icon && (
              <Ionicons
                name={icon}
                size={size === "sm" ? 16 : size === "md" ? 20 : 24}
                color={colors.text}
                style={{ marginRight: 8 }}
              />
            )}
            <Text
              style={{ color: colors.text }}
              className={cn(
                "font-semibold",
                size === "sm" && "text-sm",
                size === "md" && "text-base",
                size === "lg" && "text-lg"
              )}
            >
              {title}
            </Text>
          </>
        )}
      </View>
    </AnimatedPressable>
  );
}
