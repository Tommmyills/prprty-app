import React, { useState } from "react";
import { View, Text, TextInput, Pressable, Modal } from "react-native";
import Animated, { FadeIn, FadeOut, FadeInDown } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { GlassCard } from "./GlassCard";
import { Deadline } from "../state/realtorStore";

interface ExtractedDatesDisplayProps {
  deadlines: Deadline[];
  onUpdate: (deadlines: Deadline[]) => void;
  editable?: boolean;
}

export function ExtractedDatesDisplay({
  deadlines,
  onUpdate,
  editable = true,
}: ExtractedDatesDisplayProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState("");
  const [editDate, setEditDate] = useState("");

  const handleEdit = (deadline: Deadline) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setEditingId(deadline.id);
    setEditLabel(deadline.label);
    setEditDate(deadline.date);
  };

  const handleSave = () => {
    if (!editingId) return;

    const updated = deadlines.map((d) =>
      d.id === editingId
        ? { ...d, label: editLabel, date: editDate }
        : d
    );
    onUpdate(updated);
    setEditingId(null);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const handleDelete = (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const updated = deadlines.filter((d) => d.id !== id);
    onUpdate(updated);
  };

  const getIconForType = (type: Deadline["type"]) => {
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

  const getColorForType = (type: Deadline["type"]) => {
    switch (type) {
      case "inspection":
        return "#00D4FF";
      case "appraisal":
        return "#10B981";
      case "loan":
        return "#F97316";
      case "closing":
        return "#D4AF37";
      default:
        return "#A855F7";
    }
  };

  return (
    <View>
      <View className="flex-row items-center justify-between mb-4">
        <Text style={{ color: "rgba(255, 255, 255, 0.7)" }} className="text-sm uppercase tracking-wide">
          Extracted Critical Dates ({deadlines.length})
        </Text>
        {editable && (
          <View className="flex-row items-center">
            <Ionicons name="pencil" size={14} color="#9CA3AF" />
            <Text style={{ color: "rgba(255, 255, 255, 0.7)" }} className="text-xs ml-1">Tap to edit</Text>
          </View>
        )}
      </View>

      <GlassCard glowColor="#00D4FF" intensity="low" animated={false}>
        {deadlines.map((deadline, index) => (
          <Animated.View
            key={deadline.id}
            entering={FadeInDown.delay(index * 50).springify()}
          >
            <Pressable
              onPress={() => editable && handleEdit(deadline)}
              onLongPress={() => editable && handleDelete(deadline.id)}
              className={`flex-row items-center justify-between py-3 ${
                index < deadlines.length - 1 ? "border-b border-white/10" : ""
              }`}
            >
              <View className="flex-row items-center flex-1">
                {/* Animated icon container that lights up */}
                <Animated.View
                  entering={FadeIn.delay(index * 50 + 100)}
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    backgroundColor: `${getColorForType(deadline.type)}20`,
                    alignItems: "center",
                    justifyContent: "center",
                    shadowColor: getColorForType(deadline.type),
                    shadowOffset: { width: 0, height: 0 },
                    shadowOpacity: 0.5,
                    shadowRadius: 8,
                  }}
                >
                  <Ionicons
                    name={getIconForType(deadline.type) as any}
                    size={18}
                    color={getColorForType(deadline.type)}
                  />
                </Animated.View>
                <View className="ml-3 flex-1">
                  <Text className="text-white text-base font-medium">
                    {deadline.label}
                  </Text>
                  <Text style={{ color: "rgba(255, 255, 255, 0.7)" }} className="text-sm mt-1">
                    {deadline.date}
                  </Text>
                </View>
              </View>

              {editable && (
                <Ionicons name="chevron-forward" size={16} color="#6B7280" />
              )}
            </Pressable>
          </Animated.View>
        ))}
      </GlassCard>

      {/* Edit Modal */}
      <Modal
        visible={editingId !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setEditingId(null)}
      >
        <Pressable
          onPress={() => setEditingId(null)}
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.8)",
            justifyContent: "center",
            alignItems: "center",
            paddingHorizontal: 20,
          }}
        >
          <Pressable
            onPress={(e) => e.stopPropagation()}
            style={{ width: "100%", maxWidth: 400 }}
          >
            <Animated.View entering={FadeIn} exiting={FadeOut}>
              <GlassCard glowColor="#D4AF37" intensity="high" animated={false}>
                <View className="flex-row items-center justify-between mb-4">
                  <Text className="text-white text-lg font-semibold">
                    Edit Deadline
                  </Text>
                  <Pressable onPress={() => setEditingId(null)}>
                    <Ionicons name="close" size={24} color="#9CA3AF" />
                  </Pressable>
                </View>

                <Text style={{ color: "rgba(255, 255, 255, 0.7)" }} className="text-sm mb-2">Label</Text>
                <TextInput
                  value={editLabel}
                  onChangeText={setEditLabel}
                  placeholder="e.g., Inspection Due"
                  placeholderTextColor="#6B7280"
                  style={{
                    backgroundColor: "rgba(255,255,255,0.05)",
                    borderWidth: 1,
                    borderColor: "rgba(255,255,255,0.1)",
                    borderRadius: 8,
                    paddingHorizontal: 12,
                    paddingVertical: 10,
                    color: "#FFFFFF",
                    fontSize: 16,
                    marginBottom: 16,
                  }}
                />

                <Text style={{ color: "rgba(255, 255, 255, 0.7)" }} className="text-sm mb-2">Date</Text>
                <TextInput
                  value={editDate}
                  onChangeText={setEditDate}
                  placeholder="e.g., Feb 15, 2024"
                  placeholderTextColor="#6B7280"
                  style={{
                    backgroundColor: "rgba(255,255,255,0.05)",
                    borderWidth: 1,
                    borderColor: "rgba(255,255,255,0.1)",
                    borderRadius: 8,
                    paddingHorizontal: 12,
                    paddingVertical: 10,
                    color: "#FFFFFF",
                    fontSize: 16,
                    marginBottom: 20,
                  }}
                />

                <Pressable
                  onPress={handleSave}
                  style={{
                    borderRadius: 12,
                    paddingVertical: 14,
                    alignItems: "center",
                    overflow: "hidden",
                  }}
                >
                  <LinearGradient
                    colors={["#6B21A8", "#FF6B35"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                    }}
                  />
                  <Text
                    style={{ color: "#FFFFFF" }}
                    className="font-semibold text-base"
                  >
                    Save Changes
                  </Text>
                </Pressable>
              </GlassCard>
            </Animated.View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}
