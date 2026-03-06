/**
 * Daily Digest Screen
 * Shows morning summary of today's and upcoming deadlines
 */

import React, { useMemo } from "react";
import { View, Text, ScrollView, Pressable } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import Animated, { FadeInDown, FadeInUp } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { GlassCard } from "../components";
import { useRealtorStore } from "../state/realtorStore";

function calculateDaysRemaining(dateString: string): number {
  const match = dateString.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (!match) return 999;

  const [, month, day, year] = match;
  const targetDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  targetDate.setHours(0, 0, 0, 0);

  return Math.floor((targetDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

export function DailyDigestScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const transactions = useRealtorStore((s) => s.transactions);

  // Collect all deadlines happening today or within next 3 days
  const upcomingDeadlines = useMemo(() => {
    const deadlines: Array<{
      transaction: any;
      deadline: any;
      daysRemaining: number;
    }> = [];

    for (const transaction of transactions) {
      if (transaction.status !== "active") continue;

      for (const deadline of transaction.deadlines) {
        if (deadline.status === "completed") continue;

        const daysRemaining = calculateDaysRemaining(deadline.date);
        if (daysRemaining >= 0 && daysRemaining <= 3) {
          deadlines.push({ transaction, deadline, daysRemaining });
        }
      }
    }

    // Sort by days remaining, then by property address
    deadlines.sort((a, b) => {
      if (a.daysRemaining !== b.daysRemaining) {
        return a.daysRemaining - b.daysRemaining;
      }
      return a.transaction.address.localeCompare(b.transaction.address);
    });

    return deadlines;
  }, [transactions]);

  const todayCount = upcomingDeadlines.filter((d) => d.daysRemaining === 0).length;
  const upcomingCount = upcomingDeadlines.filter((d) => d.daysRemaining > 0).length;

  const getDeadlineIcon = (type: string) => {
    switch (type) {
      case "inspection":
        return "search";
      case "appraisal":
        return "calculator";
      case "loan":
        return "cash";
      case "closing":
        return "home";
      default:
        return "calendar";
    }
  };

  const getDeadlineColor = (daysRemaining: number) => {
    if (daysRemaining === 0) return "#EF4444"; // Red for today
    if (daysRemaining === 1) return "#F97316"; // Orange for tomorrow
    return "#FFB800"; // Gold for 2-3 days
  };

  return (
    <View style={{ flex: 1 }}>
      {/* Background gradient */}
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
          paddingBottom: insets.bottom + 100,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <Animated.View entering={FadeInDown.delay(100).springify()}>
          <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 16 }}>
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
                marginRight: 12,
              }}
            >
              <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
            </Pressable>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <Ionicons name="sunny" size={20} color="#FFB800" />
                <Text
                  style={{
                    color: "#FFB800",
                    fontSize: 12,
                    fontWeight: "600",
                    marginLeft: 6,
                    textTransform: "uppercase",
                    letterSpacing: 1,
                  }}
                >
                  {new Date().toLocaleDateString("en-US", { weekday: "long" })}
                </Text>
              </View>
              <Text style={{ color: "#FFFFFF", fontSize: 24, fontWeight: "700", marginTop: 2 }}>
                Daily Digest
              </Text>
            </View>
          </View>
        </Animated.View>

        {/* Summary Cards */}
        <View
          style={{
            flexDirection: "row",
            marginTop: 24,
            gap: 12,
          }}
        >
          <Animated.View
            entering={FadeInUp.delay(200).springify()}
            style={{ flex: 1 }}
          >
            <GlassCard glowColor="#EF4444" intensity="medium" animated={false}>
              <View style={{ alignItems: "center", paddingVertical: 12 }}>
                <Text style={{ color: "#EF4444", fontSize: 36, fontWeight: "700" }}>
                  {todayCount}
                </Text>
                <Text
                  style={{
                    color: "rgba(255, 255, 255, 0.7)",
                    fontSize: 14,
                    marginTop: 4,
                  }}
                >
                  Due Today
                </Text>
              </View>
            </GlassCard>
          </Animated.View>

          <Animated.View
            entering={FadeInUp.delay(300).springify()}
            style={{ flex: 1 }}
          >
            <GlassCard glowColor="#FFB800" intensity="medium" animated={false}>
              <View style={{ alignItems: "center", paddingVertical: 12 }}>
                <Text style={{ color: "#FFB800", fontSize: 36, fontWeight: "700" }}>
                  {upcomingCount}
                </Text>
                <Text
                  style={{
                    color: "rgba(255, 255, 255, 0.7)",
                    fontSize: 14,
                    marginTop: 4,
                  }}
                >
                  Next 3 Days
                </Text>
              </View>
            </GlassCard>
          </Animated.View>
        </View>

        {/* Deadlines List */}
        {upcomingDeadlines.length === 0 ? (
          <Animated.View
            entering={FadeInUp.delay(400).springify()}
            style={{ marginTop: 32 }}
          >
            <GlassCard glowColor="#10B981" intensity="low" animated={false}>
              <View style={{ alignItems: "center", paddingVertical: 32 }}>
                <Ionicons name="checkmark-circle" size={64} color="#10B981" />
                <Text
                  style={{
                    color: "#FFFFFF",
                    fontSize: 20,
                    fontWeight: "600",
                    marginTop: 16,
                  }}
                >
                  All Clear!
                </Text>
                <Text
                  style={{
                    color: "rgba(255, 255, 255, 0.7)",
                    fontSize: 15,
                    marginTop: 8,
                    textAlign: "center",
                  }}
                >
                  No urgent deadlines in the next 3 days
                </Text>
              </View>
            </GlassCard>
          </Animated.View>
        ) : (
          <>
            <Animated.View
              entering={FadeInUp.delay(400).springify()}
              style={{ marginTop: 32, marginBottom: 16 }}
            >
              <Text
                style={{
                  color: "rgba(255, 255, 255, 0.5)",
                  fontSize: 12,
                  fontWeight: "600",
                  textTransform: "uppercase",
                  letterSpacing: 1,
                }}
              >
                Upcoming Deadlines
              </Text>
            </Animated.View>

            {upcomingDeadlines.map((item, index) => {
              const color = getDeadlineColor(item.daysRemaining);
              const icon = getDeadlineIcon(item.deadline.type);

              return (
                <Animated.View
                  key={`${item.transaction.id}-${item.deadline.id}`}
                  entering={FadeInUp.delay(500 + index * 50).springify()}
                  style={{ marginBottom: 12 }}
                >
                  <GlassCard glowColor={color} intensity="medium" animated={false}>
                    <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
                      {/* Icon */}
                      <View
                        style={{
                          width: 48,
                          height: 48,
                          borderRadius: 12,
                          backgroundColor: `${color}20`,
                          alignItems: "center",
                          justifyContent: "center",
                          marginRight: 14,
                        }}
                      >
                        <Ionicons name={icon as any} size={24} color={color} />
                      </View>

                      {/* Content */}
                      <View style={{ flex: 1 }}>
                        {/* Days remaining badge */}
                        <View
                          style={{
                            alignSelf: "flex-start",
                            backgroundColor: `${color}30`,
                            paddingHorizontal: 10,
                            paddingVertical: 4,
                            borderRadius: 12,
                            marginBottom: 8,
                          }}
                        >
                          <Text
                            style={{
                              color: color,
                              fontSize: 12,
                              fontWeight: "700",
                            }}
                          >
                            {item.daysRemaining === 0
                              ? "TODAY"
                              : item.daysRemaining === 1
                                ? "TOMORROW"
                                : `IN ${item.daysRemaining} DAYS`}
                          </Text>
                        </View>

                        {/* Deadline title */}
                        <Text
                          style={{
                            color: "#FFFFFF",
                            fontSize: 17,
                            fontWeight: "600",
                            marginBottom: 6,
                          }}
                        >
                          {item.deadline.label}
                        </Text>

                        {/* Property address */}
                        <Text
                          style={{
                            color: "rgba(255, 255, 255, 0.7)",
                            fontSize: 14,
                            marginBottom: 4,
                          }}
                        >
                          {item.transaction.address}
                        </Text>

                        {/* Client and date */}
                        <View
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            marginTop: 4,
                          }}
                        >
                          <Ionicons
                            name="person"
                            size={14}
                            color="rgba(255, 255, 255, 0.5)"
                          />
                          <Text
                            style={{
                              color: "rgba(255, 255, 255, 0.5)",
                              fontSize: 13,
                              marginLeft: 6,
                              marginRight: 12,
                            }}
                          >
                            {item.transaction.clientName}
                          </Text>
                          <Ionicons
                            name="calendar-outline"
                            size={14}
                            color="rgba(255, 255, 255, 0.5)"
                          />
                          <Text
                            style={{
                              color: "rgba(255, 255, 255, 0.5)",
                              fontSize: 13,
                              marginLeft: 6,
                            }}
                          >
                            {item.deadline.date}
                          </Text>
                        </View>
                      </View>
                    </View>
                  </GlassCard>
                </Animated.View>
              );
            })}
          </>
        )}
      </ScrollView>
    </View>
  );
}
