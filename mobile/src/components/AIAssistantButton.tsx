/**
 * Premium AI Assistant Floating Button
 * Features: 3D rotation, hologram shimmer, ambient glow pulse
 */

import React, { useEffect } from "react";
import { Pressable, View, Image } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  withDelay,
  interpolate,
  Easing,
  runOnJS,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

interface AIAssistantButtonProps {
  onPress: () => void;
  size?: number;
}

export function AIAssistantButton({ onPress, size = 60 }: AIAssistantButtonProps) {
  // Animation values
  const rotateY = useSharedValue(0);
  const rotateX = useSharedValue(0);
  const shimmerPosition = useSharedValue(-1);
  const glowPulse = useSharedValue(0.6);
  const pressScale = useSharedValue(1);
  const pressBrightness = useSharedValue(1);

  useEffect(() => {
    // Subtle 3D rotation - continuous gentle movement
    rotateY.value = withRepeat(
      withSequence(
        withTiming(8, { duration: 3000, easing: Easing.inOut(Easing.ease) }),
        withTiming(-8, { duration: 3000, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 3000, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );

    rotateX.value = withRepeat(
      withSequence(
        withTiming(5, { duration: 4000, easing: Easing.inOut(Easing.ease) }),
        withTiming(-5, { duration: 4000, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );

    // Hologram shimmer every 4 seconds
    const startShimmer = () => {
      shimmerPosition.value = -1;
      shimmerPosition.value = withTiming(2, { duration: 1000, easing: Easing.linear });
    };

    startShimmer();
    const shimmerInterval = setInterval(startShimmer, 4000);

    // Ambient glow pulse
    glowPulse.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.5, { duration: 2000, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );

    return () => clearInterval(shimmerInterval);
  }, []);

  // 3D transform style
  const containerStyle = useAnimatedStyle(() => ({
    transform: [
      { perspective: 800 },
      { rotateY: `${rotateY.value}deg` },
      { rotateX: `${rotateX.value}deg` },
      { scale: pressScale.value },
    ],
  }));

  // Glow pulse style
  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowPulse.value,
    transform: [{ scale: interpolate(glowPulse.value, [0.5, 1], [1, 1.2]) }],
  }));

  // Shimmer overlay style
  const shimmerStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: interpolate(shimmerPosition.value, [-1, 2], [-size * 2, size * 2]) }],
    opacity: interpolate(shimmerPosition.value, [-1, 0, 1, 2], [0, 0.6, 0.6, 0]),
  }));

  // Brightness on press
  const brightnessStyle = useAnimatedStyle(() => ({
    opacity: interpolate(pressBrightness.value, [1, 1.5], [0, 0.4]),
  }));

  const handlePressIn = () => {
    pressScale.value = withTiming(0.92, { duration: 100 });
    pressBrightness.value = withTiming(1.5, { duration: 100 });
  };

  const handlePressOut = () => {
    pressScale.value = withTiming(1, { duration: 200 });
    pressBrightness.value = withTiming(1, { duration: 300 });
  };

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    // Flash effect on press
    pressBrightness.value = withSequence(
      withTiming(2, { duration: 100 }),
      withTiming(1, { duration: 300 })
    );
    onPress();
  };

  return (
    <Pressable
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
    >
      {/* Ambient glow behind button */}
      <Animated.View
        style={[
          glowStyle,
          {
            position: "absolute",
            width: size * 1.8,
            height: size * 1.8,
            borderRadius: size,
            left: -(size * 0.4),
            top: -(size * 0.4),
          },
        ]}
      >
        <LinearGradient
          colors={["rgba(255, 184, 0, 0.4)", "rgba(168, 85, 247, 0.3)", "rgba(0, 212, 255, 0.2)"]}
          style={{
            width: "100%",
            height: "100%",
            borderRadius: size,
          }}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />
      </Animated.View>

      {/* Main button with 3D transform */}
      <Animated.View style={containerStyle}>
        <View
          style={{
            width: size,
            height: size,
            borderRadius: size / 2,
            overflow: "hidden",
          }}
        >
          {/* Glass background */}
          <LinearGradient
            colors={["rgba(30, 30, 50, 0.95)", "rgba(15, 15, 30, 0.98)"]}
            style={{
              width: "100%",
              height: "100%",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: size / 2,
              borderWidth: 1.5,
              borderColor: "rgba(255, 255, 255, 0.15)",
            }}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            {/* Inner glow ring */}
            <View
              style={{
                position: "absolute",
                width: size - 8,
                height: size - 8,
                borderRadius: (size - 8) / 2,
                borderWidth: 1,
                borderColor: "rgba(255, 184, 0, 0.3)",
              }}
            />

            {/* Portal/AI Icon - Now using custom image */}
            <View
              style={{
                width: size * 0.75,
                height: size * 0.75,
                alignItems: "center",
                justifyContent: "center",
                borderRadius: size * 0.375,
                overflow: "hidden",
              }}
            >
              <Image
                source={require("../../assets/image-1764988335.jpeg")}
                style={{
                  width: size * 0.75,
                  height: size * 0.75,
                  resizeMode: "cover",
                }}
              />
            </View>

            {/* Shimmer overlay */}
            <Animated.View
              style={[
                shimmerStyle,
                {
                  position: "absolute",
                  width: size * 0.3,
                  height: size * 2,
                  backgroundColor: "transparent",
                },
              ]}
            >
              <LinearGradient
                colors={[
                  "transparent",
                  "rgba(255, 255, 255, 0.3)",
                  "rgba(255, 255, 255, 0.5)",
                  "rgba(255, 255, 255, 0.3)",
                  "transparent",
                ]}
                style={{
                  width: "100%",
                  height: "100%",
                }}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              />
            </Animated.View>

            {/* Brightness flash overlay */}
            <Animated.View
              style={[
                brightnessStyle,
                {
                  position: "absolute",
                  width: "100%",
                  height: "100%",
                  backgroundColor: "#FFFFFF",
                  borderRadius: size / 2,
                },
              ]}
            />
          </LinearGradient>
        </View>
      </Animated.View>
    </Pressable>
  );
}
