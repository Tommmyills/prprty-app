import React from "react";
import { View, Pressable } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
  withSpring,
  Easing,
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface AIAssistantOrbProps {
  onPress?: () => void;
  size?: "sm" | "md" | "lg";
}

export function AIAssistantOrb({ onPress, size = "md" }: AIAssistantOrbProps) {
  const breathe = useSharedValue(1);
  const rotate = useSharedValue(0);
  const innerGlow = useSharedValue(0.5);
  const scale = useSharedValue(1);

  const sizeMap = {
    sm: { container: 44, icon: 20, glow: 60 },
    md: { container: 56, icon: 24, glow: 80 },
    lg: { container: 72, icon: 32, glow: 100 },
  };

  const dimensions = sizeMap[size];

  React.useEffect(() => {
    // Breathing animation
    breathe.value = withRepeat(
      withSequence(
        withTiming(1.1, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 2000, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );

    // Slow rotation
    rotate.value = withRepeat(
      withTiming(360, { duration: 20000, easing: Easing.linear }),
      -1,
      false
    );

    // Inner glow pulse
    innerGlow.value = withRepeat(
      withSequence(
        withTiming(0.8, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.5, { duration: 1500, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
  }, []);

  const breatheStyle = useAnimatedStyle(() => ({
    transform: [{ scale: breathe.value }],
  }));

  const rotateStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotate.value}deg` }],
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: innerGlow.value,
  }));

  const pressStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.9, { damping: 15, stiffness: 400 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 400 });
  };

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onPress?.();
  };

  return (
    <AnimatedPressable
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[
        pressStyle,
        {
          width: dimensions.container,
          height: dimensions.container,
          alignItems: "center",
          justifyContent: "center",
        },
      ]}
    >
      {/* Outer rotating glow ring */}
      <Animated.View
        style={[
          rotateStyle,
          {
            position: "absolute",
            width: dimensions.glow,
            height: dimensions.glow,
            borderRadius: dimensions.glow / 2,
          },
        ]}
      >
        <LinearGradient
          colors={["#D4AF37", "#00D4FF", "#A855F7", "#D4AF37"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            width: "100%",
            height: "100%",
            borderRadius: dimensions.glow / 2,
            opacity: 0.3,
          }}
        />
      </Animated.View>

      {/* Breathing glow */}
      <Animated.View
        style={[
          breatheStyle,
          glowStyle,
          {
            position: "absolute",
            width: dimensions.container + 16,
            height: dimensions.container + 16,
            borderRadius: (dimensions.container + 16) / 2,
            backgroundColor: "#D4AF37",
            shadowColor: "#D4AF37",
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0.6,
            shadowRadius: 20,
          },
        ]}
      />

      {/* Main orb */}
      <View
        style={{
          width: dimensions.container,
          height: dimensions.container,
          borderRadius: dimensions.container / 2,
          overflow: "hidden",
        }}
      >
        <LinearGradient
          colors={["#1a1a2e", "#0f0f1a", "#1a1a2e"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            width: "100%",
            height: "100%",
            alignItems: "center",
            justifyContent: "center",
            borderWidth: 1,
            borderColor: "rgba(212, 175, 55, 0.4)",
            borderRadius: dimensions.container / 2,
          }}
        >
          {/* Inner highlight */}
          <LinearGradient
            colors={["rgba(212, 175, 55, 0.3)", "transparent"]}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 0.5 }}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              height: "50%",
              borderTopLeftRadius: dimensions.container / 2,
              borderTopRightRadius: dimensions.container / 2,
            }}
          />

          <Ionicons name="sparkles" size={dimensions.icon} color="#D4AF37" />
        </LinearGradient>
      </View>
    </AnimatedPressable>
  );
}
