import React from "react";
import { View, ViewProps, Pressable } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  interpolate,
} from "react-native-reanimated";
import { cn } from "../utils/cn";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface GlassCardProps extends ViewProps {
  children: React.ReactNode;
  glowColor?: string;
  intensity?: "low" | "medium" | "high";
  onPress?: () => void;
  animated?: boolean;
}

export function GlassCard({
  children,
  glowColor = "#00D4FF",
  intensity = "medium",
  onPress,
  animated = true,
  className,
  style,
  ...props
}: GlassCardProps) {
  const scale = useSharedValue(1);
  const glowOpacity = useSharedValue(0.3);

  const intensityMap = {
    low: 0.15,
    medium: 0.25,
    high: 0.4,
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
  }));

  const handlePressIn = () => {
    if (animated) {
      scale.value = withSpring(0.98, { damping: 15, stiffness: 400 });
      glowOpacity.value = withSpring(0.5, { damping: 15, stiffness: 400 });
    }
  };

  const handlePressOut = () => {
    if (animated) {
      scale.value = withSpring(1, { damping: 15, stiffness: 400 });
      glowOpacity.value = withSpring(intensityMap[intensity], { damping: 15, stiffness: 400 });
    }
  };

  const Container = onPress ? AnimatedPressable : Animated.View;

  return (
    <Container
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[animatedStyle, style]}
      className={cn("relative overflow-hidden rounded-3xl", className)}
      {...props}
    >
      {/* Outer glow effect */}
      <Animated.View
        style={[
          glowStyle,
          {
            position: "absolute",
            top: -2,
            left: -2,
            right: -2,
            bottom: -2,
            borderRadius: 26,
            shadowColor: glowColor,
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0.8,
            shadowRadius: 20,
            elevation: 20,
          },
        ]}
      />

      {/* Glass background with Midnight Glass aesthetic */}
      <BlurView
        intensity={20}
        tint="dark"
        style={{
          borderRadius: 24,
          overflow: "hidden",
          backgroundColor: "rgba(255, 255, 255, 0.08)",
          borderWidth: 1,
          borderColor: "rgba(255, 255, 255, 0.1)",
        }}
      >
        {/* Gradient border overlay - Top-Left White to Bottom-Right Transparent */}
        <LinearGradient
          colors={["rgba(255, 255, 255, 0.2)", "transparent"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            borderRadius: 24,
            borderWidth: 1,
            borderColor: "transparent",
          }}
        />

        {/* Soft diffuse shadow overlay */}
        <View
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.4)",
            borderRadius: 24,
          }}
        />

        {/* Content */}
        <View className="p-5">{children}</View>
      </BlurView>
    </Container>
  );
}
