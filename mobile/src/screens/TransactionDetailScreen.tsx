import React from "react";
import { View, Text, ScrollView, Pressable } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRoute, RouteProp, useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  FadeInDown,
  FadeInUp,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { GlassCard, ProgressTimeline, GlowButton } from "../components";
import { useRealtorStore, Deadline } from "../state/realtorStore";
import { RootStackParamList } from "../types/navigation";

type RouteProps = RouteProp<RootStackParamList, "TransactionDetail">;

// Map deadline status to transaction phase
const getTransactionPhase = (deadlines: Deadline[]) => {
  const currentDeadline = deadlines.find(
    (d) => d.status === "current" || d.status === "overdue"
  );

  if (!currentDeadline) {
    const allCompleted = deadlines.every((d) => d.status === "completed");
    if (allCompleted) return "Clear To Close";
    return "Under Contract";
  }

  switch (currentDeadline.type) {
    case "inspection":
      return "Inspection Period";
    case "appraisal":
      return "Appraisal Phase";
    case "loan":
      return "Financing Phase";
    case "closing":
      return "Clear To Close";
    default:
      return "Under Contract";
  }
};

export function TransactionDetailScreen() {
  const route = useRoute<RouteProps>();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { transactionId } = route.params;

  const transactions = useRealtorStore((s) => s.transactions);
  const updateDeadlineStatus = useRealtorStore((s) => s.updateDeadlineStatus);

  const transaction = transactions.find((t) => t.id === transactionId);

  // Pulse animation for status
  const statusPulse = useSharedValue(1);
  React.useEffect(() => {
    statusPulse.value = withRepeat(
      withSequence(
        withTiming(1.02, { duration: 1500 }),
        withTiming(1, { duration: 1500 })
      ),
      -1,
      true
    );
  }, []);

  const statusStyle = useAnimatedStyle(() => ({
    transform: [{ scale: statusPulse.value }],
  }));

  if (!transaction) {
    return (
      <View className="flex-1 bg-transparent items-center justify-center">
        <Text className="text-white text-lg">Transaction not found</Text>
      </View>
    );
  }

  const completedCount = transaction.deadlines.filter(
    (d) => d.status === "completed"
  ).length;
  const progress = (completedCount / transaction.deadlines.length) * 100;
  const currentPhase = getTransactionPhase(transaction.deadlines);

  const handleMarkComplete = (deadlineId: string) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    updateDeadlineStatus(transactionId, deadlineId, "completed");
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

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingTop: insets.top + 20,
          paddingBottom: insets.bottom + 40,
        }}
        showsVerticalScrollIndicator={false}
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
          <Text className="text-white opacity-70 text-sm uppercase tracking-wide">
            Milestone Map
          </Text>
          <Text className="text-white text-2xl font-bold mt-2">
            {transaction.address}
          </Text>
          <Text style={{ color: "#FFB800" }} className="text-base mt-1">
            {transaction.clientName} • $
            {(transaction.price / 1000000).toFixed(2)}M
          </Text>
        </Animated.View>

        {/* Current Status Panel */}
        <Animated.View
          entering={FadeInDown.delay(150).springify()}
          className="mt-6"
        >
          <GlassCard glowColor="#FFB800" intensity="high" animated={false}>
            <View className="flex-row items-center justify-between">
              <View>
                <Text className="text-white opacity-70 text-sm uppercase tracking-wide">
                  Current Status
                </Text>
                <Animated.View style={statusStyle}>
                  <Text
                    style={{ color: "#FFB800" }}
                    className="text-xl font-bold mt-1"
                  >
                    {currentPhase}
                  </Text>
                </Animated.View>
              </View>
              <View
                style={{
                  width: 12,
                  height: 12,
                  borderRadius: 6,
                  backgroundColor: "#FFB800",
                  shadowColor: "#FFB800",
                  shadowOffset: { width: 0, height: 0 },
                  shadowOpacity: 0.8,
                  shadowRadius: 8,
                }}
              />
            </View>
          </GlassCard>
        </Animated.View>

        {/* Progress Bar */}
        <Animated.View
          entering={FadeInDown.delay(200).springify()}
          className="mt-4"
        >
          <GlassCard glowColor="#00D4FF" intensity="low" animated={false}>
            <View className="flex-row items-center justify-between mb-3">
              <Text className="text-white opacity-70 text-sm">Overall Progress</Text>
              <Text className="text-neon-blue text-lg font-bold">
                {Math.round(progress)}%
              </Text>
            </View>

            {/* Progress track */}
            <View
              style={{
                height: 8,
                borderRadius: 4,
                backgroundColor: "rgba(255,255,255,0.1)",
                overflow: "hidden",
              }}
            >
              <Animated.View
                style={{
                  height: "100%",
                  width: `${progress}%`,
                  borderRadius: 4,
                  backgroundColor: "#00D4FF",
                  shadowColor: "#00D4FF",
                  shadowOffset: { width: 0, height: 0 },
                  shadowOpacity: 0.8,
                  shadowRadius: 8,
                }}
              />
            </View>

            <View className="flex-row items-center justify-between mt-3">
              <Text className="text-gray-500 text-sm">
                {completedCount} of {transaction.deadlines.length} completed
              </Text>
              <View className="flex-row items-center">
                <View
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: 4,
                    backgroundColor: "#10B981",
                    marginRight: 4,
                  }}
                />
                <Text className="text-gray-500 text-sm">On track</Text>
              </View>
            </View>
          </GlassCard>
        </Animated.View>

        {/* Contract Summary - Show if available */}
        {transaction.summary && (
          <Animated.View
            entering={FadeInUp.delay(250).springify()}
            className="mt-6"
          >
            <GlassCard glowColor="#A855F7" intensity="medium" animated={false}>
              <View className="flex-row items-center mb-3">
                <Ionicons name="document-text" size={18} color="#A855F7" />
                <Text
                  style={{ color: "#FFFFFF", letterSpacing: 1 }}
                  className="text-sm ml-2 uppercase font-semibold"
                >
                  Contract Summary
                </Text>
              </View>
              <Text style={{ color: "rgba(255, 255, 255, 0.9)" }} className="text-base leading-6">
                {transaction.summary}
              </Text>
              {transaction.hasOverdue && (
                <View className="flex-row items-center mt-3 pt-3 border-t border-white/10">
                  <Ionicons name="alert-circle" size={16} color="#EF4444" />
                  <Text style={{ color: "#EF4444" }} className="text-sm ml-2 font-semibold">
                    ⚠️ Contains overdue deadlines
                  </Text>
                </View>
              )}
              {transaction.extractedAt && (
                <View className="flex-row items-center mt-3 pt-3 border-t border-white/10">
                  <Ionicons name="sparkles" size={14} color="#FFB800" />
                  <Text style={{ color: "rgba(255, 184, 0, 0.8)" }} className="text-xs ml-2">
                    AI-extracted on {new Date(transaction.extractedAt).toLocaleDateString()}
                  </Text>
                </View>
              )}
            </GlassCard>
          </Animated.View>
        )}

        {/* Timeline */}
        <Animated.View
          entering={FadeInUp.delay(300).springify()}
          className="mt-8"
        >
          <Text className="text-white opacity-70 text-sm mb-4 uppercase tracking-wide">
            Milestone Timeline
          </Text>

          <GlassCard glowColor="#A855F7" intensity="low" animated={false}>
            <ProgressTimeline
              nodes={transaction.deadlines}
              onToggleComplete={handleMarkComplete}
            />
          </GlassCard>
        </Animated.View>

        {/* Current Action */}
        {transaction.deadlines.find(
          (d) => d.status === "current" || d.status === "overdue"
        ) && (
          <Animated.View
            entering={FadeInUp.delay(400).springify()}
            className="mt-8"
          >
            <Text className="text-white opacity-70 text-sm mb-4 uppercase tracking-wide">
              Required Action
            </Text>

            {transaction.deadlines
              .filter((d) => d.status === "current" || d.status === "overdue")
              .map((deadline) => (
                <GlassCard
                  key={deadline.id}
                  glowColor={
                    deadline.status === "overdue" ? "#EF4444" : "#FFB800"
                  }
                  intensity="high"
                  animated={false}
                  className="mb-3"
                >
                  <View className="flex-row items-start justify-between">
                    <View className="flex-1">
                      <View className="flex-row items-center mb-2">
                        <Ionicons
                          name={
                            deadline.status === "overdue"
                              ? "alert-circle"
                              : "time"
                          }
                          size={18}
                          color={
                            deadline.status === "overdue"
                              ? "#EF4444"
                              : "#FFB800"
                          }
                        />
                        <Text
                          style={{
                            color:
                              deadline.status === "overdue"
                                ? "#EF4444"
                                : "#FFB800",
                          }}
                          className="ml-2 text-sm font-semibold uppercase"
                        >
                          {deadline.status === "overdue" ? "Overdue" : "Current"}
                        </Text>
                      </View>
                      <Text className="text-white text-lg font-semibold">
                        {deadline.label}
                      </Text>
                      <Text className="text-white opacity-70 text-sm mt-1">
                        Due: {deadline.date}
                      </Text>
                    </View>
                  </View>

                  <View className="mt-4">
                    <GlowButton
                      title="Mark Complete"
                      onPress={() => handleMarkComplete(deadline.id)}
                      variant="success"
                      icon="checkmark-circle"
                      size="md"
                    />
                  </View>
                </GlassCard>
              ))}
          </Animated.View>
        )}
      </ScrollView>
    </View>
  );
}
