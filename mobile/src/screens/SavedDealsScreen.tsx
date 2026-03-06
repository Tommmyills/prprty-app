/**
 * Saved Deals Screen
 * Lists all saved deal contexts with ability to view, edit, delete, and set active
 */

import React, { useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Modal,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import Animated, { FadeInDown, FadeIn } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useDealContextStore, DealContext } from "../state/dealContextStore";
import { RootStackParamList } from "../types/navigation";
import { GlassCard } from "../components";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export function SavedDealsScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp>();

  const dealContexts = useDealContextStore((s) => s.dealContexts);
  const activeDealContextId = useDealContextStore((s) => s.activeDealContextId);
  const setActiveDealContext = useDealContextStore((s) => s.setActiveDealContext);
  const deleteDealContext = useDealContextStore((s) => s.deleteDealContext);
  const initializeDemoIfNeeded = useDealContextStore((s) => s.initializeDemoIfNeeded);

  const [deleteModalVisible, setDeleteModalVisible] = React.useState(false);
  const [dealToDelete, setDealToDelete] = React.useState<DealContext | null>(null);

  // Initialize demo data if needed
  useEffect(() => {
    initializeDemoIfNeeded();
  }, []);

  const handleSetActive = (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (activeDealContextId === id) {
      // Deselect if already active
      setActiveDealContext(null);
    } else {
      setActiveDealContext(id);
    }
  };

  const handleEdit = (contextId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigation.navigate("DealContextMemory", { contextId });
  };

  const handleDelete = (deal: DealContext) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setDealToDelete(deal);
    setDeleteModalVisible(true);
  };

  const confirmDelete = () => {
    if (dealToDelete) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      deleteDealContext(dealToDelete.id);
      setDeleteModalVisible(false);
      setDealToDelete(null);
    }
  };

  const handleAddNew = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigation.navigate("DealContextMemory", {});
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <View className="flex-1 bg-[#0A0A0F]">
      <LinearGradient
        colors={["#0A0A0F", "#0F0F1A", "#0A0A0F"]}
        style={{ flex: 1 }}
      >
        {/* Header */}
        <View
          style={{ paddingTop: insets.top + 8 }}
          className="px-5 pb-4 border-b border-white/10"
        >
          <View className="flex-row items-center justify-between">
            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                navigation.goBack();
              }}
              className="w-10 h-10 rounded-full bg-white/10 items-center justify-center"
            >
              <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
            </Pressable>

            <Text className="text-white text-lg font-bold">
              Saved Deals
            </Text>

            <Pressable
              onPress={handleAddNew}
              className="w-10 h-10 rounded-full bg-[#00D4FF]/20 items-center justify-center"
            >
              <Ionicons name="add" size={24} color="#00D4FF" />
            </Pressable>
          </View>

          {/* Active Deal Indicator */}
          {activeDealContextId && (
            <Animated.View
              entering={FadeIn.delay(200)}
              className="mt-3 flex-row items-center"
            >
              <View
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: "#10B981",
                  shadowColor: "#10B981",
                  shadowOffset: { width: 0, height: 0 },
                  shadowOpacity: 0.8,
                  shadowRadius: 4,
                }}
              />
              <Text className="text-white/70 text-sm ml-2">
                Active deal selected for Live Guidance
              </Text>
            </Animated.View>
          )}
        </View>

        <ScrollView
          className="flex-1"
          contentContainerStyle={{
            padding: 20,
            paddingBottom: insets.bottom + 100
          }}
          showsVerticalScrollIndicator={false}
        >
          {dealContexts.length === 0 ? (
            <Animated.View
              entering={FadeInDown.delay(200)}
              className="items-center justify-center py-20"
            >
              <View
                style={{
                  width: 80,
                  height: 80,
                  borderRadius: 40,
                  backgroundColor: "rgba(0, 212, 255, 0.1)",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: 20,
                }}
              >
                <Ionicons name="folder-open-outline" size={40} color="#00D4FF" />
              </View>
              <Text className="text-white text-xl font-semibold text-center mb-2">
                No Saved Deals Yet
              </Text>
              <Text className="text-white/60 text-center mb-6 px-8">
                Add a deal to save notes, emails, and context for use during live negotiations
              </Text>
              <Pressable
                onPress={handleAddNew}
                style={({ pressed }) => ({
                  backgroundColor: pressed ? "rgba(0, 212, 255, 0.8)" : "#00D4FF",
                  borderRadius: 12,
                  paddingVertical: 14,
                  paddingHorizontal: 24,
                  flexDirection: "row",
                  alignItems: "center",
                })}
              >
                <Ionicons name="add" size={20} color="#000000" />
                <Text className="text-black font-semibold ml-2">
                  Add Your First Deal
                </Text>
              </Pressable>
            </Animated.View>
          ) : (
            <>
              {/* Info text */}
              <Animated.View entering={FadeInDown.delay(100)}>
                <Text className="text-white/50 text-sm mb-4">
                  Tap a deal to set it as active for Live Deal Guidance.
                  The active deal provides context to the AI during negotiations.
                </Text>
              </Animated.View>

              {/* Deal List */}
              {dealContexts.map((deal, index) => {
                const isActive = deal.id === activeDealContextId;
                const isDemo = deal.isDemo === true;

                return (
                  <Animated.View
                    key={deal.id}
                    entering={FadeInDown.delay(150 + index * 50)}
                  >
                    <Pressable
                      onPress={() => handleSetActive(deal.id)}
                      style={({ pressed }) => ({
                        opacity: pressed ? 0.9 : 1,
                        transform: [{ scale: pressed ? 0.98 : 1 }],
                      })}
                    >
                      <GlassCard
                        glowColor={isActive ? "#10B981" : isDemo ? "#A855F7" : "#00D4FF"}
                        intensity={isActive ? "high" : "low"}
                        className="mb-3"
                      >
                        <View className="flex-row items-start">
                          {/* Active Indicator / Checkbox */}
                          <View
                            style={{
                              width: 28,
                              height: 28,
                              borderRadius: 14,
                              backgroundColor: isActive
                                ? "#10B981"
                                : "rgba(255, 255, 255, 0.1)",
                              borderWidth: isActive ? 0 : 2,
                              borderColor: "rgba(255, 255, 255, 0.2)",
                              alignItems: "center",
                              justifyContent: "center",
                              marginRight: 12,
                              marginTop: 2,
                            }}
                          >
                            {isActive && (
                              <Ionicons name="checkmark" size={18} color="#FFFFFF" />
                            )}
                          </View>

                          {/* Deal Info */}
                          <View className="flex-1">
                            <View className="flex-row items-center mb-1">
                              {isDemo && (
                                <View
                                  className="px-2 py-0.5 rounded mr-2"
                                  style={{ backgroundColor: "rgba(168, 85, 247, 0.3)" }}
                                >
                                  <Text className="text-[#A855F7] text-xs font-semibold">
                                    DEMO
                                  </Text>
                                </View>
                              )}
                              {isActive && (
                                <View
                                  className="px-2 py-0.5 rounded mr-2"
                                  style={{ backgroundColor: "rgba(16, 185, 129, 0.3)" }}
                                >
                                  <Text className="text-[#10B981] text-xs font-semibold">
                                    ACTIVE
                                  </Text>
                                </View>
                              )}
                            </View>

                            <Text className="text-white text-base font-semibold mb-1">
                              {deal.dealName}
                            </Text>

                            {deal.address && (
                              <Text className="text-white/60 text-sm mb-1">
                                {deal.address}
                              </Text>
                            )}

                            <Text className="text-white/40 text-xs">
                              Created {formatDate(deal.createdAt)}
                            </Text>

                            {/* Content indicators */}
                            <View className="flex-row items-center mt-2 flex-wrap" style={{ gap: 8 }}>
                              {deal.notes && (
                                <View className="flex-row items-center">
                                  <Ionicons name="document-text" size={12} color="#FFB800" />
                                  <Text className="text-white/50 text-xs ml-1">Notes</Text>
                                </View>
                              )}
                              {deal.pastedText && (
                                <View className="flex-row items-center">
                                  <Ionicons name="mail" size={12} color="#3B82F6" />
                                  <Text className="text-white/50 text-xs ml-1">Email</Text>
                                </View>
                              )}
                              {deal.fileUrls.length > 0 && (
                                <View className="flex-row items-center">
                                  <Ionicons name="attach" size={12} color="#A855F7" />
                                  <Text className="text-white/50 text-xs ml-1">
                                    {deal.fileUrls.length} file{deal.fileUrls.length > 1 ? "s" : ""}
                                  </Text>
                                </View>
                              )}
                            </View>
                          </View>

                          {/* Action Buttons */}
                          <View className="flex-row" style={{ gap: 8 }}>
                            <Pressable
                              onPress={() => handleEdit(deal.id)}
                              hitSlop={8}
                              style={{
                                width: 36,
                                height: 36,
                                borderRadius: 10,
                                backgroundColor: "rgba(59, 130, 246, 0.15)",
                                alignItems: "center",
                                justifyContent: "center",
                              }}
                            >
                              <Ionicons name="pencil" size={16} color="#3B82F6" />
                            </Pressable>
                            <Pressable
                              onPress={() => handleDelete(deal)}
                              hitSlop={8}
                              style={{
                                width: 36,
                                height: 36,
                                borderRadius: 10,
                                backgroundColor: "rgba(239, 68, 68, 0.15)",
                                alignItems: "center",
                                justifyContent: "center",
                              }}
                            >
                              <Ionicons name="trash-outline" size={16} color="#EF4444" />
                            </Pressable>
                          </View>
                        </View>
                      </GlassCard>
                    </Pressable>
                  </Animated.View>
                );
              })}

              {/* Add New Button at bottom */}
              <Animated.View entering={FadeInDown.delay(300 + dealContexts.length * 50)}>
                <Pressable
                  onPress={handleAddNew}
                  style={({ pressed }) => ({
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: pressed
                      ? "rgba(0, 212, 255, 0.2)"
                      : "rgba(0, 212, 255, 0.1)",
                    borderWidth: 1,
                    borderColor: "rgba(0, 212, 255, 0.3)",
                    borderRadius: 14,
                    paddingVertical: 16,
                    marginTop: 8,
                    borderStyle: "dashed",
                  })}
                >
                  <Ionicons name="add-circle" size={22} color="#00D4FF" />
                  <Text className="text-[#00D4FF] font-semibold ml-2">
                    Add New Deal
                  </Text>
                </Pressable>
              </Animated.View>
            </>
          )}
        </ScrollView>

        {/* Delete Confirmation Modal */}
        <Modal
          visible={deleteModalVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setDeleteModalVisible(false)}
        >
          <Pressable
            className="flex-1 bg-black/70 justify-center items-center px-6"
            onPress={() => setDeleteModalVisible(false)}
          >
            <Pressable
              onPress={(e) => e.stopPropagation()}
              className="bg-[#1A1A2E] w-full rounded-2xl p-6 border border-white/10"
            >
              <View className="items-center mb-4">
                <View className="w-16 h-16 rounded-full bg-red-500/20 items-center justify-center mb-4">
                  <Ionicons name="trash" size={32} color="#EF4444" />
                </View>
                <Text className="text-white text-xl font-bold text-center">
                  Delete Deal?
                </Text>
                <Text className="text-white/60 text-center mt-2">
                  This will permanently delete {dealToDelete?.dealName} and cannot be undone.
                </Text>
              </View>

              <View className="flex-row mt-4" style={{ gap: 12 }}>
                <Pressable
                  onPress={() => setDeleteModalVisible(false)}
                  className="flex-1 bg-white/10 rounded-xl py-4 items-center"
                >
                  <Text className="text-white font-semibold">Cancel</Text>
                </Pressable>
                <Pressable
                  onPress={confirmDelete}
                  className="flex-1 bg-red-500 rounded-xl py-4 items-center"
                >
                  <Text className="text-white font-semibold">Delete</Text>
                </Pressable>
              </View>
            </Pressable>
          </Pressable>
        </Modal>
      </LinearGradient>
    </View>
  );
}
