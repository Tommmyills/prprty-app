import React from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Dimensions,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import Animated, {
  FadeInDown,
  FadeInUp,
  FadeIn,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { GlassCard } from "../components";
import { useRealtorStore } from "../state/realtorStore";
import { RootStackParamList } from "../types/navigation";

const { width } = Dimensions.get("window");

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export function DashboardScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp>();

  const transactions = useRealtorStore((s) => s.transactions);
  const activeTransactionId = useRealtorStore((s) => s.activeTransactionId);

  const activeTransaction = transactions.find(
    (t) => t.id === activeTransactionId
  );

  // Use extracted nextRequiredAction or fallback to finding next deadline
  const nextActionFromExtraction = activeTransaction?.nextRequiredAction;
  const nextDeadline = activeTransaction?.deadlines.find(
    (d) => d.status === "current" || d.status === "overdue"
  );

  const nextAction = nextActionFromExtraction
    ? { label: nextActionFromExtraction, ...nextDeadline }
    : nextDeadline;

  const overdueCount = transactions.reduce(
    (acc, t) => acc + t.deadlines.filter((d) => d.status === "overdue").length,
    0
  );

  // Pulsing animation for alert badge
  const alertPulse = useSharedValue(1);
  React.useEffect(() => {
    if (overdueCount > 0) {
      alertPulse.value = withRepeat(
        withSequence(
          withTiming(1.2, { duration: 800 }),
          withTiming(1, { duration: 800 })
        ),
        -1,
        true
      );
    }
  }, [overdueCount]);

  const alertStyle = useAnimatedStyle(() => ({
    transform: [{ scale: alertPulse.value }],
  }));

  const handleCardPress = (action: () => void) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    action();
  };

  return (
    <View style={{ flex: 1 }}>
      {/* Midnight Glass Obsidian gradient background */}
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
          paddingTop: insets.top + 16,
          paddingBottom: insets.bottom + 100,
          paddingHorizontal: 20,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <Animated.View entering={FadeInDown.delay(100).springify()}>
          <View className="flex-row items-center justify-between mb-2">
            <View>
              <Text
                style={{ color: "#FFFFFF", letterSpacing: 2 }}
                className="text-sm font-semibold"
              >
                CLOSING ROOM
              </Text>
              <Text className="text-white text-3xl font-bold mt-1">
                Command Center
              </Text>
            </View>

            {/* Header Actions */}
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
              {/* Daily Digest Button */}
              <Pressable
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  navigation.navigate("DailyDigest");
                }}
                style={({ pressed }) => ({
                  opacity: pressed ? 0.6 : 1,
                  backgroundColor: "rgba(255, 184, 0, 0.15)",
                  borderRadius: 12,
                  padding: 10,
                  borderWidth: 1,
                  borderColor: "rgba(255, 184, 0, 0.3)",
                })}
              >
                <Ionicons name="sunny" size={20} color="#FFB800" />
              </Pressable>

              {/* Assistant Button - Opens separate Assistant page */}
              <Pressable
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  navigation.navigate("Assistant");
                }}
                style={({ pressed }) => ({
                  opacity: pressed ? 0.6 : 1,
                  backgroundColor: "rgba(255, 184, 0, 0.25)",
                  borderRadius: 12,
                  padding: 10,
                  borderWidth: 1,
                  borderColor: "rgba(255, 184, 0, 0.5)",
                })}
              >
                <Ionicons name="chatbubble-ellipses" size={20} color="#FFB800" />
              </Pressable>

              {/* Settings Button */}
              <Pressable
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  navigation.navigate("Settings");
                }}
                style={({ pressed }) => ({
                  opacity: pressed ? 0.6 : 1,
                  backgroundColor: "rgba(59, 130, 246, 0.15)",
                  borderRadius: 12,
                  padding: 10,
                  borderWidth: 1,
                  borderColor: "rgba(59, 130, 246, 0.3)",
                })}
              >
                <Ionicons name="settings" size={20} color="#3B82F6" />
              </Pressable>

              {/* Alert badge */}
              {overdueCount > 0 && (
                <Animated.View
                  style={[
                    alertStyle,
                    {
                      backgroundColor: "#EF4444",
                      paddingHorizontal: 8,
                      paddingVertical: 4,
                      borderRadius: 12,
                      shadowColor: "#EF4444",
                      shadowOffset: { width: 0, height: 0 },
                      shadowOpacity: 0.5,
                      shadowRadius: 8,
                    },
                  ]}
                >
                  <Text className="text-white font-semibold text-xs">
                    {overdueCount}
                  </Text>
                </Animated.View>
              )}
            </View>
          </View>

          {/* Status badge */}
          {activeTransaction && (
            <View className="flex-row items-center mt-3">
              <View
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: "#FFB800",
                  shadowColor: "#FFB800",
                  shadowOffset: { width: 0, height: 0 },
                  shadowOpacity: 0.8,
                  shadowRadius: 4,
                }}
              />
              <Text style={{ color: "rgba(255, 255, 255, 0.7)" }} className="text-sm ml-2">
                Under Contract
              </Text>
              <Text className="text-gray-600 mx-2">|</Text>
              <Text style={{ color: "#FFFFFF" }} className="text-sm font-medium">
                {activeTransaction.address}
              </Text>
            </View>
          )}
        </Animated.View>

        {/* HERO: Live Deal Guidance - PRIMARY ACTION */}
        <Animated.View entering={FadeInDown.delay(200).springify()} className="mt-6">
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              navigation.navigate("LiveDealGuidance");
            }}
            style={({ pressed }) => ({
              opacity: pressed ? 0.9 : 1,
              transform: [{ scale: pressed ? 0.98 : 1 }],
            })}
          >
            <LinearGradient
              colors={["rgba(245, 158, 11, 0.15)", "rgba(245, 158, 11, 0.05)", "rgba(0, 0, 0, 0.3)"]}
              locations={[0, 0.5, 1]}
              style={{
                borderRadius: 24,
                borderWidth: 2,
                borderColor: "rgba(245, 158, 11, 0.4)",
                padding: 24,
                shadowColor: "#F59E0B",
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 16,
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <View
                  style={{
                    width: 64,
                    height: 64,
                    borderRadius: 20,
                    backgroundColor: "rgba(245, 158, 11, 0.25)",
                    alignItems: "center",
                    justifyContent: "center",
                    shadowColor: "#F59E0B",
                    shadowOffset: { width: 0, height: 0 },
                    shadowOpacity: 0.5,
                    shadowRadius: 12,
                  }}
                >
                  <Ionicons name="videocam" size={32} color="#F59E0B" />
                </View>
                <View style={{ marginLeft: 16, flex: 1 }}>
                  <Text style={{ color: "#F59E0B", fontSize: 12, fontWeight: "700", letterSpacing: 1, marginBottom: 4 }}>
                    PRIMARY ACTION
                  </Text>
                  <Text style={{ color: "#FFFFFF", fontSize: 22, fontWeight: "800" }}>
                    Live Deal Guidance
                  </Text>
                  <Text style={{ color: "rgba(255, 255, 255, 0.6)", fontSize: 14, marginTop: 4 }}>
                    Works alongside your calls & meetings
                  </Text>
                </View>
                <View
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 12,
                    backgroundColor: "rgba(245, 158, 11, 0.2)",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Ionicons name="arrow-forward" size={20} color="#F59E0B" />
                </View>
              </View>
            </LinearGradient>
          </Pressable>
        </Animated.View>

        {/* Module Grid */}
        <View className="mt-8">
          <Text style={{ color: "rgba(255, 255, 255, 0.7)" }} className="text-sm mb-4 uppercase tracking-wide">
            Quick Actions
          </Text>

          {/* 2. Add / View Active Deal */}
          <Animated.View entering={FadeInDown.delay(300).springify()}>
            <GlassCard
              glowColor="#00D4FF"
              onPress={() =>
                handleCardPress(() => navigation.navigate("SavedDeals"))
              }
              className="mb-4"
            >
              <View className="flex-row items-center">
                <View
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 14,
                    backgroundColor: "rgba(0, 212, 255, 0.2)",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Ionicons name="folder-open" size={24} color="#00D4FF" />
                </View>
                <View className="ml-4 flex-1">
                  <Text className="text-white text-lg font-semibold">
                    Add / View Active Deal
                  </Text>
                  <Text style={{ color: "rgba(255, 255, 255, 0.7)" }} className="text-sm mt-1">
                    Save deal info for live negotiations
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#6B7280" />
              </View>
            </GlassCard>
          </Animated.View>

          {/* 3. Upload Contract Module */}
          <Animated.View entering={FadeInDown.delay(400).springify()}>
            <View style={{ position: "relative" }}>
              <GlassCard
                glowColor="#FFB800"
                onPress={() =>
                  handleCardPress(() => navigation.navigate("ContractUpload"))
                }
                className="mb-4"
              >
              <View className="flex-row items-center">
                <View
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 14,
                    backgroundColor: "rgba(212, 175, 55, 0.2)",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Ionicons name="document-text" size={24} color="#FFB800" />
                </View>
                <View className="ml-4 flex-1">
                  <Text className="text-white text-lg font-semibold">
                    Upload Contract
                  </Text>
                  <Text style={{ color: "rgba(255, 255, 255, 0.7)" }} className="text-sm mt-1">
                    AI extracts critical deadlines
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#6B7280" />
              </View>
            </GlassCard>
            </View>
          </Animated.View>

          {/* 4. Transaction Timeline Module */}
          <Animated.View entering={FadeInDown.delay(500).springify()}>
            <View style={{ position: "relative" }}>
              {/* Notification badge for overdue items */}
              {overdueCount > 0 && (
                <Animated.View
                  entering={FadeIn.delay(600)}
                  style={{
                    position: "absolute",
                    top: -8,
                    right: -8,
                    backgroundColor: "#EF4444",
                    borderRadius: 12,
                    minWidth: 24,
                    height: 24,
                    alignItems: "center",
                    justifyContent: "center",
                    paddingHorizontal: 6,
                    zIndex: 10,
                    shadowColor: "#EF4444",
                    shadowOffset: { width: 0, height: 0 },
                    shadowOpacity: 0.8,
                    shadowRadius: 8,
                  }}
                >
                  <Text className="text-white text-xs font-bold">
                    {overdueCount}
                  </Text>
                </Animated.View>
              )}
              <GlassCard
              glowColor="#00D4FF"
              onPress={() =>
                handleCardPress(() =>
                  navigation.navigate("TransactionDetail", {
                    transactionId: activeTransactionId!,
                  })
                )
              }
              className="mb-4"
            >
              <View className="flex-row items-center mb-4">
                <View
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 14,
                    backgroundColor: "rgba(0, 212, 255, 0.2)",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Ionicons name="git-branch" size={24} color="#00D4FF" />
                </View>
                <View className="ml-4 flex-1">
                  <Text className="text-white text-lg font-semibold">
                    Transaction Timeline
                  </Text>
                  <Text style={{ color: "rgba(255, 255, 255, 0.7)" }} className="text-sm mt-1">
                    Track every milestone
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#6B7280" />
              </View>

              {/* Mini timeline preview */}
              {activeTransaction && (
                <View className="mt-2 pt-4 border-t border-white/10">
                  <View className="flex-row items-center justify-between">
                    {activeTransaction.deadlines.slice(0, 4).map((d, i) => (
                      <View key={d.id} className="items-center flex-1">
                        <View
                          style={{
                            width: 12,
                            height: 12,
                            borderRadius: 6,
                            backgroundColor:
                              d.status === "completed"
                                ? "#10B981"
                                : d.status === "current"
                                ? "#FFB800"
                                : d.status === "overdue"
                                ? "#EF4444"
                                : "#374151",
                            shadowColor:
                              d.status === "completed"
                                ? "#10B981"
                                : d.status === "current"
                                ? "#FFB800"
                                : d.status === "overdue"
                                ? "#EF4444"
                                : "transparent",
                            shadowOffset: { width: 0, height: 0 },
                            shadowOpacity: 0.6,
                            shadowRadius: 4,
                          }}
                        />
                        {i < 3 && (
                          <View
                            style={{
                              position: "absolute",
                              left: "50%",
                              width: width / 4 - 30,
                              height: 2,
                              backgroundColor:
                                d.status === "completed"
                                  ? "#10B98150"
                                  : "rgba(255,255,255,0.1)",
                              top: 5,
                              marginLeft: 6,
                            }}
                          />
                        )}
                      </View>
                    ))}
                  </View>
                </View>
              )}
            </GlassCard>
            </View>
          </Animated.View>

          {/* 5. AI Email Generator Module */}
          <Animated.View entering={FadeInDown.delay(600).springify()}>
            <GlassCard
              glowColor="#10B981"
              onPress={() =>
                handleCardPress(() => navigation.navigate("EmailGenerator"))
              }
              className="mb-4"
            >
              <View className="flex-row items-center">
                <View
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 14,
                    backgroundColor: "rgba(16, 185, 129, 0.2)",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Ionicons name="mail" size={24} color="#10B981" />
                </View>
                <View className="ml-4 flex-1">
                  <Text className="text-white text-lg font-semibold">
                    AI Email Assistant
                  </Text>
                  <Text style={{ color: "rgba(255, 255, 255, 0.7)" }} className="text-sm mt-1">
                    Professional emails in seconds
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#6B7280" />
              </View>
            </GlassCard>
          </Animated.View>

          {/* 6. Weekly Summary Module */}
          <Animated.View entering={FadeInDown.delay(700).springify()}>
            <GlassCard
              glowColor="#A855F7"
              onPress={() =>
                handleCardPress(() => navigation.navigate("WeeklySummary"))
              }
              className="mb-4"
            >
              <View className="flex-row items-center">
                <View
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 14,
                    backgroundColor: "rgba(168, 85, 247, 0.2)",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Ionicons name="newspaper" size={24} color="#A855F7" />
                </View>
                <View className="ml-4 flex-1">
                  <Text className="text-white text-lg font-semibold">
                    Weekly Summary
                  </Text>
                  <Text style={{ color: "rgba(255, 255, 255, 0.7)" }} className="text-sm mt-1">
                    Client-ready updates
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#6B7280" />
              </View>
            </GlassCard>
          </Animated.View>
        </View>

        {/* Active Transactions List */}
        <View className="mt-8">
          <Text style={{ color: "rgba(255, 255, 255, 0.7)" }} className="text-sm mb-4 uppercase tracking-wide">
            Active Transactions
          </Text>

          {transactions
            .filter((t) => t.status === "active")
            .map((transaction, index) => {
              // Calculate status based on deadlines
              const hasOverdue = transaction.deadlines.some((d) => d.status === "overdue");
              const allCompleted = transaction.deadlines.every((d) => d.status === "completed");
              const statusColor = hasOverdue ? "#EF4444" : allCompleted ? "#10B981" : "#FFB800";
              const statusLabel = hasOverdue ? "Overdue" : allCompleted ? "Completed" : "Active";

              return (
                <Animated.View
                  key={transaction.id}
                  entering={FadeInUp.delay(700 + index * 100).springify()}
                >
                  <Pressable
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                      useRealtorStore.getState().setActiveTransaction(transaction.id);
                      navigation.navigate("TransactionDetail", { transactionId: transaction.id });
                    }}
                  >
                    <GlassCard
                      glowColor={statusColor}
                      intensity="medium"
                      className="mb-3"
                    >
                      <View className="flex-row items-start justify-between">
                        <View className="flex-1 mr-3">
                          <View className="flex-row items-center mb-2">
                            {/* Status Indicator with Pulse */}
                            <Animated.View
                              style={{
                                width: 10,
                                height: 10,
                                borderRadius: 5,
                                backgroundColor: statusColor,
                                marginRight: 8,
                                shadowColor: statusColor,
                                shadowOffset: { width: 0, height: 0 },
                                shadowOpacity: 0.8,
                                shadowRadius: 6,
                              }}
                            />
                            <Text
                              style={{
                                color: statusColor,
                                fontSize: 12,
                                fontWeight: "600",
                                textTransform: "uppercase",
                                letterSpacing: 0.5,
                              }}
                            >
                              {statusLabel}
                            </Text>
                          </View>
                          <Text className="text-white text-base font-semibold mb-1">
                            {transaction.address}
                          </Text>
                          <Text style={{ color: "rgba(255, 255, 255, 0.7)" }} className="text-sm">
                            {transaction.clientName} • $
                            {(transaction.price / 1000000).toFixed(2)}M
                          </Text>
                          {transaction.extractedAt && (
                            <View className="flex-row items-center mt-2">
                              <Ionicons name="sparkles" size={12} color="#FFB800" />
                              <Text style={{ color: "rgba(255, 184, 0, 0.8)" }} className="text-xs ml-1">
                                {transaction.deadlines.length} deadlines extracted
                              </Text>
                            </View>
                          )}
                        </View>
                        <Ionicons
                          name="chevron-forward"
                          size={20}
                          color="rgba(255, 255, 255, 0.5)"
                        />
                      </View>
                    </GlassCard>
                  </Pressable>
                </Animated.View>
              );
            })}
        </View>

        {/* Tagline */}
        <Animated.View
          entering={FadeInUp.delay(900).springify()}
          className="mt-10 items-center"
        >
          <Text className="text-gray-600 text-sm text-center italic">
            Every deadline organized. Every deal clean.
          </Text>
          <Text style={{ color: "rgba(255, 255, 255, 0.7)" }} className="text-sm text-center mt-1 font-medium">
            Total peace of mind.
          </Text>
        </Animated.View>
      </ScrollView>
    </View>
  );
}
