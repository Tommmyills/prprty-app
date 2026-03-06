import React from "react";
import { View, Text, Pressable, Modal } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  FadeIn,
  FadeOut,
  SlideInDown,
  SlideOutDown,
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { cn } from "../utils/cn";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface Option {
  label: string;
  value: string;
  icon?: keyof typeof Ionicons.glyphMap;
}

interface NeonDropdownProps {
  label: string;
  options: Option[];
  selectedValue: string;
  onSelect: (value: string) => void;
  glowColor?: string;
}

export function NeonDropdown({
  label,
  options,
  selectedValue,
  onSelect,
  glowColor = "#00D4FF",
}: NeonDropdownProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const scale = useSharedValue(1);

  const selectedOption = options.find((o) => o.value === selectedValue);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.98, { damping: 15, stiffness: 400 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 400 });
  };

  return (
    <>
      <View className="mb-4">
        <Text className="text-gray-400 text-sm mb-2">{label}</Text>
        <AnimatedPressable
          onPress={() => setIsOpen(true)}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          style={[
            animatedStyle,
            {
              backgroundColor: "rgba(15, 15, 25, 0.9)",
              borderWidth: 1,
              borderColor: "rgba(255, 255, 255, 0.1)",
              shadowColor: glowColor,
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.2,
              shadowRadius: 8,
              elevation: 4,
            },
          ]}
          className="flex-row items-center justify-between px-4 py-4 rounded-xl"
        >
          <View className="flex-row items-center">
            {selectedOption?.icon && (
              <Ionicons
                name={selectedOption.icon}
                size={20}
                color={glowColor}
                style={{ marginRight: 12 }}
              />
            )}
            <Text className="text-white text-base">
              {selectedOption?.label || "Select..."}
            </Text>
          </View>
          <Ionicons name="chevron-down" size={20} color="#6B7280" />
        </AnimatedPressable>
      </View>

      <Modal
        visible={isOpen}
        transparent
        animationType="none"
        onRequestClose={() => setIsOpen(false)}
      >
        <Pressable
          className="flex-1 justify-end bg-black/60"
          onPress={() => setIsOpen(false)}
        >
          <Animated.View
            entering={SlideInDown.springify().damping(18)}
            exiting={SlideOutDown.springify().damping(18)}
            style={{
              backgroundColor: "#0A0A0F",
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              borderWidth: 1,
              borderColor: "rgba(255, 255, 255, 0.1)",
            }}
          >
            {/* Handle bar */}
            <View className="items-center pt-3 pb-2">
              <View className="w-10 h-1 rounded-full bg-gray-600" />
            </View>

            {/* Header */}
            <View className="px-5 py-3 border-b border-white/10">
              <Text className="text-white text-lg font-semibold">{label}</Text>
            </View>

            {/* Options */}
            <View className="px-5 py-4 pb-10">
              {options.map((option, index) => {
                const isSelected = option.value === selectedValue;
                return (
                  <Pressable
                    key={option.value}
                    onPress={() => {
                      onSelect(option.value);
                      setIsOpen(false);
                    }}
                    style={[
                      {
                        backgroundColor: isSelected
                          ? `${glowColor}20`
                          : "transparent",
                        borderWidth: isSelected ? 1 : 0,
                        borderColor: isSelected ? glowColor : "transparent",
                      },
                    ]}
                    className="flex-row items-center px-4 py-4 rounded-xl mb-2"
                  >
                    {option.icon && (
                      <Ionicons
                        name={option.icon}
                        size={20}
                        color={isSelected ? glowColor : "#9CA3AF"}
                        style={{ marginRight: 12 }}
                      />
                    )}
                    <Text
                      className={cn(
                        "text-base flex-1",
                        isSelected ? "text-white font-semibold" : "text-gray-400"
                      )}
                    >
                      {option.label}
                    </Text>
                    {isSelected && (
                      <Ionicons name="checkmark" size={20} color={glowColor} />
                    )}
                  </Pressable>
                );
              })}
            </View>
          </Animated.View>
        </Pressable>
      </Modal>
    </>
  );
}
