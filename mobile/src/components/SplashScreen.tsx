import React, { useEffect } from "react";
import { View, Image, StyleSheet } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  Easing,
  runOnJS,
} from "react-native-reanimated";

const ICON_SIZE = 120;

interface SplashScreenProps {
  onFinish?: () => void;
  isLoading?: boolean;
}

export function SplashScreen({ onFinish, isLoading = false }: SplashScreenProps) {
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.9);
  const containerOpacity = useSharedValue(1);

  useEffect(() => {
    // Fade in and scale up
    opacity.value = withTiming(1, { duration: 500, easing: Easing.out(Easing.cubic) });
    scale.value = withTiming(1, { duration: 500, easing: Easing.out(Easing.cubic) });

    // Auto-dismiss with fade out
    if (onFinish && !isLoading) {
      const timer = setTimeout(() => {
        containerOpacity.value = withTiming(0, { duration: 300, easing: Easing.in(Easing.cubic) }, (finished) => {
          if (finished && onFinish) {
            runOnJS(onFinish)();
          }
        });
      }, 1700);
      return () => clearTimeout(timer);
    }
  }, [onFinish, isLoading]);

  const iconStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  const containerStyle = useAnimatedStyle(() => ({
    opacity: containerOpacity.value,
  }));

  return (
    <Animated.View style={[styles.container, containerStyle]}>
      <Animated.View style={[styles.iconWrapper, iconStyle]}>
        <Image
          source={require("../../assets/image-1764988335.jpeg")}
          style={styles.icon}
          resizeMode="cover"
        />
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#000000",
  },
  iconWrapper: {
    width: ICON_SIZE,
    height: ICON_SIZE,
    borderRadius: ICON_SIZE / 2,
    overflow: "hidden",
  },
  icon: {
    width: ICON_SIZE,
    height: ICON_SIZE,
  },
});
