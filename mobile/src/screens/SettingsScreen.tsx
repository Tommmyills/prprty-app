/**
 * Settings Screen
 * Notification preferences and history viewer
 */

import React, { useState } from "react";
import { View, Text, ScrollView, Switch, Pressable } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeInDown, FadeInUp } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { GlassCard } from "../components";
import { useRealtorStore } from "../state/realtorStore";
import { scheduleDailyDigest, cancelAllNotifications } from "../services/notificationService";

export function SettingsScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const notificationPreferences = useRealtorStore((s) => s.notificationPreferences);
  const notificationHistory = useRealtorStore((s) => s.notificationHistory);
  const setNotificationPreferences = useRealtorStore((s) => s.setNotificationPreferences);
  const clearNotificationHistory = useRealtorStore((s) => s.clearNotificationHistory);

  const [isScheduling, setIsScheduling] = useState(false);

  const handleTogglePreference = async (key: keyof typeof notificationPreferences, value: boolean) => {
    setNotificationPreferences({ [key]: value });

    // If daily digest is enabled, schedule it
    if (key === "dailyDigestEnabled" && value) {
      setIsScheduling(true);
      const [hour, minute] = notificationPreferences.dailyDigestTime.split(":").map(Number);
      await scheduleDailyDigest(hour, minute);
      setIsScheduling(false);
    }

    // If all notifications are disabled, cancel all
    if (!value && key === "dailyDigestEnabled" && !notificationPreferences.threeDayRemindersEnabled && !notificationPreferences.overdueAlertsEnabled) {
      await cancelAllNotifications();
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return "Yesterday";
    return `${diffDays}d ago`;
  };

  const getNotificationTypeColor = (type: string) => {
    switch (type) {
      case "overdue":
        return "#EF4444";
      case "digest":
        return "#FFB800";
      case "reminder":
        return "#3B82F6";
      default:
        return "#6B7280";
    }
  };

  const getNotificationTypeIcon = (type: string) => {
    switch (type) {
      case "overdue":
        return "alert-circle";
      case "digest":
        return "sunny";
      case "reminder":
        return "notifications";
      default:
        return "information-circle";
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#050510" }}>
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
          <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 8 }}>
            <Ionicons name="settings" size={24} color="#3B82F6" />
            <Text
              style={{
                color: "#3B82F6",
                fontSize: 14,
                fontWeight: "600",
                marginLeft: 8,
                textTransform: "uppercase",
                letterSpacing: 1,
              }}
            >
              NOTIFICATION SETTINGS
            </Text>
          </View>
          <Text style={{ color: "#FFFFFF", fontSize: 28, fontWeight: "700" }}>
            Alert Preferences
          </Text>
          <Text style={{ color: "rgba(255, 255, 255, 0.7)", fontSize: 16, marginTop: 4 }}>
            Customize your deadline notifications
          </Text>
        </Animated.View>

        {/* Notification Preferences */}
        <Animated.View
          entering={FadeInUp.delay(200).springify()}
          style={{ marginTop: 32 }}
        >
          <Text
            style={{
              color: "rgba(255, 255, 255, 0.5)",
              fontSize: 12,
              fontWeight: "600",
              textTransform: "uppercase",
              letterSpacing: 1,
              marginBottom: 16,
            }}
          >
            Notification Types
          </Text>

          <GlassCard glowColor="#3B82F6" intensity="low" animated={false}>
            {/* Daily Digest Toggle */}
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                paddingVertical: 16,
                borderBottomWidth: 1,
                borderBottomColor: "rgba(255, 255, 255, 0.1)",
              }}
            >
              <View style={{ flex: 1, marginRight: 16 }}>
                <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 4 }}>
                  <Ionicons name="sunny" size={20} color="#FFB800" />
                  <Text
                    style={{
                      color: "#FFFFFF",
                      fontSize: 17,
                      fontWeight: "600",
                      marginLeft: 10,
                    }}
                  >
                    Daily Digest
                  </Text>
                </View>
                <Text
                  style={{
                    color: "rgba(255, 255, 255, 0.6)",
                    fontSize: 14,
                    marginLeft: 30,
                  }}
                >
                  Morning summary at {notificationPreferences.dailyDigestTime}
                </Text>
              </View>
              <Switch
                value={notificationPreferences.dailyDigestEnabled}
                onValueChange={(value) => handleTogglePreference("dailyDigestEnabled", value)}
                trackColor={{ false: "#374151", true: "#3B82F6" }}
                thumbColor={notificationPreferences.dailyDigestEnabled ? "#FFFFFF" : "#9CA3AF"}
                disabled={isScheduling}
              />
            </View>

            {/* 3-Day Reminders Toggle */}
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                paddingVertical: 16,
                borderBottomWidth: 1,
                borderBottomColor: "rgba(255, 255, 255, 0.1)",
              }}
            >
              <View style={{ flex: 1, marginRight: 16 }}>
                <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 4 }}>
                  <Ionicons name="notifications" size={20} color="#3B82F6" />
                  <Text
                    style={{
                      color: "#FFFFFF",
                      fontSize: 17,
                      fontWeight: "600",
                      marginLeft: 10,
                    }}
                  >
                    3-Day Reminders
                  </Text>
                </View>
                <Text
                  style={{
                    color: "rgba(255, 255, 255, 0.6)",
                    fontSize: 14,
                    marginLeft: 30,
                  }}
                >
                  Alerts for deadlines within 3 days
                </Text>
              </View>
              <Switch
                value={notificationPreferences.threeDayRemindersEnabled}
                onValueChange={(value) => handleTogglePreference("threeDayRemindersEnabled", value)}
                trackColor={{ false: "#374151", true: "#3B82F6" }}
                thumbColor={notificationPreferences.threeDayRemindersEnabled ? "#FFFFFF" : "#9CA3AF"}
              />
            </View>

            {/* Overdue Alerts Toggle */}
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                paddingVertical: 16,
              }}
            >
              <View style={{ flex: 1, marginRight: 16 }}>
                <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 4 }}>
                  <Ionicons name="alert-circle" size={20} color="#EF4444" />
                  <Text
                    style={{
                      color: "#FFFFFF",
                      fontSize: 17,
                      fontWeight: "600",
                      marginLeft: 10,
                    }}
                  >
                    Overdue Alerts
                  </Text>
                </View>
                <Text
                  style={{
                    color: "rgba(255, 255, 255, 0.6)",
                    fontSize: 14,
                    marginLeft: 30,
                  }}
                >
                  Urgent notifications for missed deadlines
                </Text>
              </View>
              <Switch
                value={notificationPreferences.overdueAlertsEnabled}
                onValueChange={(value) => handleTogglePreference("overdueAlertsEnabled", value)}
                trackColor={{ false: "#374151", true: "#3B82F6" }}
                thumbColor={notificationPreferences.overdueAlertsEnabled ? "#FFFFFF" : "#9CA3AF"}
              />
            </View>
          </GlassCard>
        </Animated.View>

        {/* Notification History */}
        <Animated.View
          entering={FadeInUp.delay(300).springify()}
          style={{ marginTop: 32 }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 16,
            }}
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
              Recent Notifications ({notificationHistory.length})
            </Text>
            {notificationHistory.length > 0 && (
              <Pressable
                onPress={clearNotificationHistory}
                style={({ pressed }) => ({
                  opacity: pressed ? 0.6 : 1,
                })}
              >
                <Text
                  style={{
                    color: "#3B82F6",
                    fontSize: 14,
                    fontWeight: "600",
                  }}
                >
                  Clear All
                </Text>
              </Pressable>
            )}
          </View>

          {notificationHistory.length === 0 ? (
            <GlassCard glowColor="#6B7280" intensity="low" animated={false}>
              <View style={{ alignItems: "center", paddingVertical: 32 }}>
                <Ionicons name="notifications-off" size={48} color="#6B7280" />
                <Text
                  style={{
                    color: "rgba(255, 255, 255, 0.7)",
                    fontSize: 16,
                    marginTop: 12,
                    textAlign: "center",
                  }}
                >
                  No notifications yet
                </Text>
                <Text
                  style={{
                    color: "rgba(255, 255, 255, 0.5)",
                    fontSize: 14,
                    marginTop: 4,
                    textAlign: "center",
                  }}
                >
                  Deadline alerts will appear here
                </Text>
              </View>
            </GlassCard>
          ) : (
            <View style={{ gap: 12 }}>
              {notificationHistory.map((notification, index) => {
                const color = getNotificationTypeColor(notification.type);
                const icon = getNotificationTypeIcon(notification.type);

                return (
                  <Animated.View
                    key={notification.id}
                    entering={FadeInUp.delay(400 + index * 50).springify()}
                  >
                    <GlassCard glowColor={color} intensity="low" animated={false}>
                      <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
                        {/* Icon */}
                        <View
                          style={{
                            width: 40,
                            height: 40,
                            borderRadius: 10,
                            backgroundColor: `${color}20`,
                            alignItems: "center",
                            justifyContent: "center",
                            marginRight: 12,
                          }}
                        >
                          <Ionicons name={icon as any} size={20} color={color} />
                        </View>

                        {/* Content */}
                        <View style={{ flex: 1 }}>
                          <View
                            style={{
                              flexDirection: "row",
                              alignItems: "center",
                              justifyContent: "space-between",
                              marginBottom: 4,
                            }}
                          >
                            <Text
                              style={{
                                color: "#FFFFFF",
                                fontSize: 15,
                                fontWeight: "600",
                                flex: 1,
                              }}
                            >
                              {notification.title}
                            </Text>
                            <Text
                              style={{
                                color: "rgba(255, 255, 255, 0.5)",
                                fontSize: 12,
                                marginLeft: 8,
                              }}
                            >
                              {formatTimestamp(notification.timestamp)}
                            </Text>
                          </View>
                          <Text
                            style={{
                              color: "rgba(255, 255, 255, 0.7)",
                              fontSize: 14,
                            }}
                          >
                            {notification.body}
                          </Text>
                        </View>
                      </View>
                    </GlassCard>
                  </Animated.View>
                );
              })}
            </View>
          )}
        </Animated.View>
      </ScrollView>
    </View>
  );
}
