/**
 * ConversationHistoryModal
 * Displays saved conversation history with swipe-to-delete
 */

import React, { useCallback, useRef } from "react";
import {
  View,
  Text,
  Pressable,
  Modal,
  FlatList,
  Alert,
  Dimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
} from "react-native-reanimated";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import {
  SavedConversation,
  useConversationHistoryStore,
} from "../state/conversationHistoryStore";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const DELETE_THRESHOLD = -80;

interface ConversationItemProps {
  conversation: SavedConversation;
  onSelect: (conversation: SavedConversation) => void;
  onDelete: (id: string) => void;
}

function ConversationItem({
  conversation,
  onSelect,
  onDelete,
}: ConversationItemProps) {
  const translateX = useSharedValue(0);
  const itemHeight = useSharedValue(72);
  const opacity = useSharedValue(1);
  const isDeleting = useRef(false);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return date.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
    } else if (diffDays === 1) {
      return "Yesterday";
    } else if (diffDays < 7) {
      return date.toLocaleDateString([], { weekday: "short" });
    } else {
      return date.toLocaleDateString([], { month: "short", day: "numeric" });
    }
  };

  const handleDelete = useCallback(() => {
    if (isDeleting.current) return;
    isDeleting.current = true;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    itemHeight.value = withTiming(0, { duration: 200 });
    opacity.value = withTiming(0, { duration: 200 }, () => {
      runOnJS(onDelete)(conversation.id);
    });
  }, [conversation.id, onDelete, itemHeight, opacity]);

  const panGesture = Gesture.Pan()
    .activeOffsetX([-10, 10])
    .failOffsetY([-15, 15])
    .onUpdate((event) => {
      if (event.translationX < 0) {
        translateX.value = Math.max(event.translationX, -120);
      } else {
        translateX.value = Math.min(event.translationX * 0.3, 20);
      }
    })
    .onEnd((event) => {
      if (translateX.value < DELETE_THRESHOLD) {
        translateX.value = withTiming(-SCREEN_WIDTH, { duration: 200 });
        runOnJS(handleDelete)();
      } else {
        translateX.value = withSpring(0, { damping: 20 });
      }
    });

  const animatedItemStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const animatedContainerStyle = useAnimatedStyle(() => ({
    height: itemHeight.value,
    opacity: opacity.value,
    overflow: "hidden" as const,
  }));

  const animatedDeleteStyle = useAnimatedStyle(() => ({
    opacity: translateX.value < -20 ? 1 : 0,
  }));

  const handleLongPress = useCallback(() => {
    Alert.alert(
      "Delete Conversation",
      "Are you sure you want to delete this conversation?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: handleDelete,
        },
      ]
    );
  }, [handleDelete]);

  return (
    <Animated.View style={animatedContainerStyle}>
      <View style={{ position: "relative" }}>
        {/* Delete background */}
        <Animated.View
          style={[
            {
              position: "absolute",
              right: 0,
              top: 0,
              bottom: 0,
              width: 120,
              backgroundColor: "#EF4444",
              justifyContent: "center",
              alignItems: "flex-end",
              paddingRight: 20,
              borderRadius: 12,
            },
            animatedDeleteStyle,
          ]}
        >
          <Ionicons name="trash" size={24} color="#FFFFFF" />
        </Animated.View>

        {/* Swipeable item */}
        <GestureDetector gesture={panGesture}>
          <Animated.View style={animatedItemStyle}>
            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                onSelect(conversation);
              }}
              onLongPress={handleLongPress}
              delayLongPress={500}
              style={({ pressed }) => ({
                backgroundColor: pressed
                  ? "rgba(255, 255, 255, 0.08)"
                  : "rgba(255, 255, 255, 0.03)",
                borderRadius: 12,
                padding: 14,
                marginBottom: 8,
                borderWidth: 1,
                borderColor: "rgba(255, 255, 255, 0.06)",
              })}
            >
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  marginBottom: 4,
                }}
              >
                <Text
                  style={{
                    color: "#FFFFFF",
                    fontSize: 15,
                    fontWeight: "600",
                    flex: 1,
                    marginRight: 8,
                  }}
                  numberOfLines={1}
                >
                  {conversation.title}
                </Text>
                <Text
                  style={{
                    color: "rgba(255, 255, 255, 0.4)",
                    fontSize: 12,
                  }}
                >
                  {formatDate(conversation.updatedAt)}
                </Text>
              </View>
              {conversation.preview && (
                <Text
                  style={{
                    color: "rgba(255, 255, 255, 0.5)",
                    fontSize: 13,
                    lineHeight: 18,
                  }}
                  numberOfLines={1}
                >
                  {conversation.preview}
                </Text>
              )}
            </Pressable>
          </Animated.View>
        </GestureDetector>
      </View>
    </Animated.View>
  );
}

interface ConversationHistoryModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectConversation: (conversation: SavedConversation) => void;
}

export function ConversationHistoryModal({
  visible,
  onClose,
  onSelectConversation,
}: ConversationHistoryModalProps) {
  const insets = useSafeAreaInsets();
  const conversations = useConversationHistoryStore((s) => s.conversations);
  const deleteConversation = useConversationHistoryStore(
    (s) => s.deleteConversation
  );

  const handleDelete = useCallback(
    (id: string) => {
      deleteConversation(id);
    },
    [deleteConversation]
  );

  const handleSelect = useCallback(
    (conversation: SavedConversation) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onSelectConversation(conversation);
      onClose();
    },
    [onSelectConversation, onClose]
  );

  const handleClose = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onClose();
  }, [onClose]);

  const renderItem = useCallback(
    ({ item }: { item: SavedConversation }) => (
      <ConversationItem
        conversation={item}
        onSelect={handleSelect}
        onDelete={handleDelete}
      />
    ),
    [handleSelect, handleDelete]
  );

  const keyExtractor = useCallback((item: SavedConversation) => item.id, []);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View
        style={{
          flex: 1,
          backgroundColor: "#0F0F1A",
          paddingTop: insets.top > 0 ? insets.top : 20,
        }}
      >
        {/* Header */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            paddingHorizontal: 20,
            paddingBottom: 16,
            borderBottomWidth: 1,
            borderBottomColor: "rgba(255, 255, 255, 0.08)",
          }}
        >
          <Text
            style={{
              color: "#FFFFFF",
              fontSize: 20,
              fontWeight: "700",
            }}
          >
            Conversation History
          </Text>
          <Pressable
            onPress={handleClose}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            style={({ pressed }) => ({
              width: 36,
              height: 36,
              borderRadius: 18,
              backgroundColor: pressed
                ? "rgba(255, 255, 255, 0.15)"
                : "rgba(255, 255, 255, 0.08)",
              alignItems: "center",
              justifyContent: "center",
            })}
          >
            <Ionicons name="close" size={20} color="#FFFFFF" />
          </Pressable>
        </View>

        {/* Content */}
        {conversations.length === 0 ? (
          <View
            style={{
              flex: 1,
              alignItems: "center",
              justifyContent: "center",
              paddingHorizontal: 40,
            }}
          >
            <Ionicons
              name="chatbubbles-outline"
              size={48}
              color="rgba(255, 255, 255, 0.2)"
            />
            <Text
              style={{
                color: "rgba(255, 255, 255, 0.4)",
                fontSize: 16,
                textAlign: "center",
                marginTop: 16,
              }}
            >
              No conversations yet
            </Text>
            <Text
              style={{
                color: "rgba(255, 255, 255, 0.25)",
                fontSize: 14,
                textAlign: "center",
                marginTop: 8,
              }}
            >
              Your assistant conversations will appear here automatically
            </Text>
          </View>
        ) : (
          <FlatList
            data={conversations}
            renderItem={renderItem}
            keyExtractor={keyExtractor}
            contentContainerStyle={{
              padding: 16,
              paddingBottom: insets.bottom + 20,
            }}
            showsVerticalScrollIndicator={false}
          />
        )}

        {/* Swipe hint */}
        {conversations.length > 0 && (
          <View
            style={{
              paddingHorizontal: 20,
              paddingBottom: insets.bottom > 0 ? insets.bottom : 20,
              alignItems: "center",
            }}
          >
            <Text
              style={{
                color: "rgba(255, 255, 255, 0.25)",
                fontSize: 12,
              }}
            >
              Swipe left to delete
            </Text>
          </View>
        )}
      </View>
    </Modal>
  );
}
