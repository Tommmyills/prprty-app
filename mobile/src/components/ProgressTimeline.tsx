import React, { useState } from "react";
import { View, Text, ViewProps, Pressable } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  useSharedValue,
  withDelay,
  FadeInDown,
  FadeOutUp,
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { cn } from "../utils/cn";

interface TimelineNodeProps {
  label: string;
  date: string;
  status: "completed" | "current" | "upcoming" | "overdue";
  isLast?: boolean;
  index?: number;
  onToggleComplete?: () => void;
  details?: string;
}

export function TimelineNode({
  label,
  date,
  status,
  isLast = false,
  index = 0,
  onToggleComplete,
  details,
}: TimelineNodeProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const glowOpacity = useSharedValue(0.4);
  const pulseScale = useSharedValue(1);

  React.useEffect(() => {
    if (status === "current" || status === "overdue") {
      glowOpacity.value = withRepeat(
        withSequence(
          withTiming(0.8, { duration: 1000 }),
          withTiming(0.4, { duration: 1000 })
        ),
        -1,
        true
      );
      pulseScale.value = withRepeat(
        withSequence(
          withDelay(index * 100, withTiming(1.1, { duration: 1000 })),
          withTiming(1, { duration: 1000 })
        ),
        -1,
        true
      );
    }
  }, [status, index]);

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
  }));

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
  }));

  const getColors = () => {
    switch (status) {
      case "completed":
        return { primary: "#10B981", glow: "#10B98150" };
      case "current":
        return { primary: "#00D4FF", glow: "#00D4FF50" };
      case "upcoming":
        return { primary: "#6B7280", glow: "#6B728030" };
      case "overdue":
        return { primary: "#EF4444", glow: "#EF444450" };
    }
  };

  const colors = getColors();

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsExpanded(!isExpanded);
  };

  return (
    <View className="mb-4">
      <Pressable onPress={handlePress} className="flex-row items-start">
        {/* Node container */}
        <View className="items-center mr-4">
          {/* Glow ring */}
          <Animated.View
            style={[
              pulseStyle,
              {
                position: "absolute",
                width: 28,
                height: 28,
                borderRadius: 14,
                backgroundColor: colors.glow,
              },
            ]}
          />

          {/* Main node - now tappable */}
          <Animated.View
            style={[
              glowStyle,
              {
                width: 20,
                height: 20,
                borderRadius: 10,
                backgroundColor: colors.primary,
                shadowColor: colors.primary,
                shadowOffset: { width: 0, height: 0 },
                shadowOpacity: 0.8,
                shadowRadius: 8,
                elevation: 8,
                marginTop: 4,
              },
            ]}
          />

          {/* Connecting line */}
          {!isLast && (
            <View
              style={{
                width: 2,
                flex: 1,
                minHeight: isExpanded ? 80 : 40,
                backgroundColor:
                  status === "completed" ? "#10B98140" : "rgba(255,255,255,0.1)",
              }}
            />
          )}
        </View>

        {/* Content */}
        <View className="flex-1 pt-1">
          <View className="flex-row items-center justify-between">
            <View className="flex-1">
              <Text
                className={cn(
                  "font-semibold text-base mb-1",
                  status === "completed" && "text-neon-green",
                  status === "current" && "text-neon-blue",
                  status === "upcoming" && "text-white opacity-70",
                  status === "overdue" && "text-neon-red"
                )}
              >
                {label}
              </Text>
              <Text style={{ color: "rgba(255, 255, 255, 0.5)" }} className="text-sm">{date}</Text>
            </View>
            <Ionicons
              name={isExpanded ? "chevron-up" : "chevron-down"}
              size={20}
              color="rgba(255, 255, 255, 0.5)"
            />
          </View>
        </View>
      </Pressable>

      {/* Expanded Details Card */}
      {isExpanded && (
        <Animated.View
          entering={FadeInDown.springify()}
          exiting={FadeOutUp.springify()}
          style={{
            marginLeft: 36,
            marginTop: 12,
            backgroundColor: "rgba(255, 255, 255, 0.05)",
            borderRadius: 12,
            padding: 16,
            borderLeftWidth: 3,
            borderLeftColor: colors.primary,
          }}
        >
          {/* Status Badge */}
          <View className="flex-row items-center mb-3">
            <View
              style={{
                backgroundColor: `${colors.primary}20`,
                paddingHorizontal: 10,
                paddingVertical: 4,
                borderRadius: 6,
              }}
            >
              <Text style={{ color: colors.primary, fontSize: 12, fontWeight: "600" }}>
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </Text>
            </View>
          </View>

          {/* Deadline Info */}
          <View className="mb-3">
            <Text style={{ color: "rgba(255, 255, 255, 0.5)", fontSize: 12 }} className="uppercase tracking-wide mb-1">
              Deadline
            </Text>
            <Text style={{ color: "rgba(255, 255, 255, 0.9)" }} className="text-base font-medium">
              {date}
            </Text>
          </View>

          {/* Suggested Next Step */}
          <View className="mb-3">
            <Text style={{ color: "rgba(255, 255, 255, 0.5)", fontSize: 12 }} className="uppercase tracking-wide mb-1">
              Suggested Next Step
            </Text>
            <Text style={{ color: "rgba(255, 255, 255, 0.7)" }} className="text-sm">
              {details || `Complete ${label.toLowerCase()} and update all parties involved.`}
            </Text>
          </View>

          {/* Mark Complete Checkbox */}
          {status !== "completed" && onToggleComplete && (
            <Pressable
              onPress={() => {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                onToggleComplete();
              }}
              style={{
                flexDirection: "row",
                alignItems: "center",
                backgroundColor: "rgba(16, 185, 129, 0.1)",
                paddingVertical: 10,
                paddingHorizontal: 14,
                borderRadius: 8,
                borderWidth: 1,
                borderColor: "rgba(16, 185, 129, 0.3)",
              }}
            >
              <View
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: 6,
                  borderWidth: 2,
                  borderColor: "#10B981",
                  marginRight: 10,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Ionicons name="checkmark" size={14} color="#10B981" />
              </View>
              <Text style={{ color: "#10B981" }} className="font-medium">
                Mark as Completed
              </Text>
            </Pressable>
          )}

          {status === "completed" && (
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                backgroundColor: "rgba(16, 185, 129, 0.1)",
                paddingVertical: 10,
                paddingHorizontal: 14,
                borderRadius: 8,
              }}
            >
              <Ionicons name="checkmark-circle" size={20} color="#10B981" style={{ marginRight: 10 }} />
              <Text style={{ color: "#10B981" }} className="font-medium">
                Completed
              </Text>
            </View>
          )}
        </Animated.View>
      )}
    </View>
  );
}

interface ProgressTimelineProps extends ViewProps {
  nodes: Array<{
    id: string;
    label: string;
    date: string;
    status: "completed" | "current" | "upcoming" | "overdue";
    details?: string;
  }>;
  onToggleComplete?: (id: string) => void;
}

export function ProgressTimeline({ nodes, onToggleComplete, className, ...props }: ProgressTimelineProps) {
  return (
    <View className={cn("", className)} {...props}>
      {nodes.map((node, index) => (
        <TimelineNode
          key={node.id}
          label={node.label}
          date={node.date}
          status={node.status}
          details={node.details}
          isLast={index === nodes.length - 1}
          index={index}
          onToggleComplete={onToggleComplete ? () => onToggleComplete(node.id) : undefined}
        />
      ))}
    </View>
  );
}
