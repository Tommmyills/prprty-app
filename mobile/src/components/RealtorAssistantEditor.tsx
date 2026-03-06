/**
 * RealtorAssistantEditor
 * Floating editable text window for the Realtor Assistant
 * Features: New Question, Silent Mode, Clear controls
 * Freely resizable - stays wherever you drag it
 * Supports progressive expansion: swipe left to expand full-screen, swipe right to collapse
 * Keyboard-aware: Adjusts position and scroll when keyboard appears
 */

import React, { useRef, useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  Dimensions,
  ScrollView,
  Keyboard,
  Platform,
  NativeSyntheticEvent,
  TextInputSelectionChangeEventData,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
  interpolate,
  useAnimatedKeyboard,
} from "react-native-reanimated";
import {
  Gesture,
  GestureDetector,
} from "react-native-gesture-handler";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

// Window height limits for compact mode
const MAX_HEIGHT = SCREEN_HEIGHT * 0.75;
const MIN_HEIGHT = 80;
const DEFAULT_HEIGHT = SCREEN_HEIGHT * 0.55;

// Swipe threshold for expand/collapse
const SWIPE_THRESHOLD = 80;
const SWIPE_VELOCITY_THRESHOLD = 500;

interface RealtorAssistantEditorProps {
  visible: boolean;
  onClose: () => void;
  onNewQuestion: () => void;
  silentMode: boolean;
  onSilentModeToggle: () => void;
  editorText: string;
  onEditorTextChange: (text: string) => void;
  isAIUpdating?: boolean;
  initialHeight?: number;
  onOpenHistory?: () => void;
}

export function RealtorAssistantEditor({
  visible,
  onClose,
  onNewQuestion,
  silentMode,
  onSilentModeToggle,
  editorText,
  onEditorTextChange,
  isAIUpdating = false,
  initialHeight,
  onOpenHistory,
}: RealtorAssistantEditorProps) {
  const insets = useSafeAreaInsets();
  const textInputRef = useRef<TextInput>(null);
  const scrollViewRef = useRef<ScrollView>(null);
  const [showSilentModeTooltip, setShowSilentModeTooltip] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  // Use custom initial height or default
  const defaultHeight = initialHeight || DEFAULT_HEIGHT;

  // Animation values
  const windowHeight = useSharedValue(defaultHeight);
  const startHeight = useSharedValue(defaultHeight);
  const expansionProgress = useSharedValue(0); // 0 = compact, 1 = expanded
  const horizontalSwipeX = useSharedValue(0);

  // Keyboard animation using reanimated
  const keyboard = useAnimatedKeyboard();

  // Track keyboard visibility with native Keyboard API for state updates
  useEffect(() => {
    const showSub = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow",
      (e) => {
        setKeyboardHeight(e.endCoordinates.height);
      }
    );
    const hideSub = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide",
      () => {
        setKeyboardHeight(0);
      }
    );

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  // Handle text selection change to scroll cursor into view
  const handleSelectionChange = useCallback(
    (event: NativeSyntheticEvent<TextInputSelectionChangeEventData>) => {
      // When keyboard is visible and user selects text or moves cursor,
      // ensure the cursor area is visible by scrolling if needed
      if (keyboardHeight > 0 && scrollViewRef.current) {
        // Small delay to let layout settle
        setTimeout(() => {
          scrollViewRef.current?.scrollToEnd({ animated: true });
        }, 100);
      }
    },
    [keyboardHeight]
  );

  // Reset when visible changes
  useEffect(() => {
    if (visible) {
      windowHeight.value = withSpring(defaultHeight, { damping: 20, stiffness: 200 });
      expansionProgress.value = 0;
      setIsExpanded(false);
    }
  }, [visible, defaultHeight]);

  // Handle expansion state change
  const handleExpand = () => {
    setIsExpanded(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    expansionProgress.value = withSpring(1, {
      damping: 20,
      stiffness: 180,
      mass: 0.8,
    });
  };

  const handleCollapse = () => {
    setIsExpanded(false);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    expansionProgress.value = withSpring(0, {
      damping: 20,
      stiffness: 180,
      mass: 0.8,
    });
  };

  // Pan gesture for resizing (only in compact mode) - only on drag handle
  const panGesture = Gesture.Pan()
    .enabled(!isExpanded)
    .onStart(() => {
      startHeight.value = windowHeight.value;
    })
    .onUpdate((event) => {
      // Dragging up (negative Y) increases height, dragging down decreases
      const newHeight = startHeight.value - event.translationY;
      // Clamp between min and max
      windowHeight.value = Math.max(MIN_HEIGHT, Math.min(MAX_HEIGHT, newHeight));
    })
    .onEnd(() => {
      runOnJS(Haptics.impactAsync)(Haptics.ImpactFeedbackStyle.Light);
    });

  // Horizontal swipe gesture for expand/collapse
  const horizontalSwipeGesture = Gesture.Pan()
    .activeOffsetX([-15, 15])
    .failOffsetY([-20, 20])
    .onStart(() => {
      horizontalSwipeX.value = 0;
    })
    .onUpdate((event) => {
      horizontalSwipeX.value = event.translationX;
    })
    .onEnd((event) => {
      const shouldExpand = !isExpanded &&
        (event.translationX < -SWIPE_THRESHOLD || event.velocityX < -SWIPE_VELOCITY_THRESHOLD);
      const shouldCollapse = isExpanded &&
        (event.translationX > SWIPE_THRESHOLD || event.velocityX > SWIPE_VELOCITY_THRESHOLD);

      if (shouldExpand) {
        runOnJS(handleExpand)();
      } else if (shouldCollapse) {
        runOnJS(handleCollapse)();
      }

      horizontalSwipeX.value = withTiming(0, { duration: 200 });
    });

  // Animated styles for the container
  const containerAnimatedStyle = useAnimatedStyle(() => {
    const height = interpolate(
      expansionProgress.value,
      [0, 1],
      [windowHeight.value, SCREEN_HEIGHT]
    );

    const marginHorizontal = interpolate(
      expansionProgress.value,
      [0, 1],
      [12, 0]
    );

    // When keyboard is visible, reduce bottom margin to move window up
    // For expanded mode, we use keyboard.height directly for smooth animation
    const baseMarginBottom = insets.bottom > 0 ? insets.bottom : 12;
    const marginBottom = interpolate(
      expansionProgress.value,
      [0, 1],
      [baseMarginBottom + keyboard.height.value, keyboard.height.value]
    );

    const borderRadius = interpolate(
      expansionProgress.value,
      [0, 1],
      [20, 0]
    );

    return {
      height,
      marginHorizontal,
      marginBottom,
      borderRadius,
    };
  });

  // Animated style for swipe feedback
  const swipeFeedbackStyle = useAnimatedStyle(() => {
    const translateX = interpolate(
      horizontalSwipeX.value,
      [-100, 0, 100],
      [-20, 0, 20]
    );

    return {
      transform: [{ translateX }],
    };
  });

  // Animated style for expand hint indicator
  const expandHintStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      horizontalSwipeX.value,
      [-80, -20, 0],
      [1, 0.3, 0]
    );

    return {
      opacity: isExpanded ? 0 : opacity,
    };
  });

  // Animated style for collapse hint indicator
  const collapseHintStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      horizontalSwipeX.value,
      [0, 20, 80],
      [0, 0.3, 1]
    );

    return {
      opacity: isExpanded ? opacity : 0,
    };
  });

  const handleClear = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onEditorTextChange("");
    textInputRef.current?.focus();
  };

  const handleNewQuestionPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onNewQuestion();
  };

  const handleSilentModePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onSilentModeToggle();
  };

  const handleSilentModeLongPress = () => {
    setShowSilentModeTooltip(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setTimeout(() => setShowSilentModeTooltip(false), 2000);
  };

  const handleClosePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (isExpanded) {
      handleCollapse();
    } else {
      onClose();
    }
  };

  const handleHistoryPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onOpenHistory?.();
  };

  if (!visible) return null;

  return (
    <View
      style={{
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 100000,
      }}
    >
      <Animated.View
        style={[
          {
            backgroundColor: "#1A1A2E",
            borderWidth: 1,
            borderColor: "rgba(255, 184, 0, 0.3)",
            shadowColor: "#FFB800",
            shadowOffset: { width: 0, height: -4 },
            shadowOpacity: 0.15,
            shadowRadius: 12,
            elevation: 10,
            overflow: "hidden",
          },
          containerAnimatedStyle,
        ]}
      >
        <GestureDetector gesture={horizontalSwipeGesture}>
          <Animated.View style={[{ flex: 1 }, swipeFeedbackStyle]}>
            {/* Drag Handle - Only this area is draggable for resize (compact mode only) */}
            {!isExpanded && (
              <GestureDetector gesture={panGesture}>
                <Animated.View
                  style={{
                    alignItems: "center",
                    paddingVertical: 12,
                    borderBottomWidth: 1,
                    borderBottomColor: "rgba(255, 255, 255, 0.1)",
                  }}
                >
                  <View
                    style={{
                      width: 40,
                      height: 5,
                      backgroundColor: "rgba(255, 255, 255, 0.4)",
                      borderRadius: 3,
                    }}
                  />
                  {/* Minimized title bar */}
                  <View style={{ flexDirection: "row", alignItems: "center", marginTop: 6 }}>
                    <Ionicons name="document-text" size={16} color="#FFB800" />
                    <Text style={{ color: "#FFB800", marginLeft: 8, fontSize: 14, fontWeight: "500" }}>
                      Assistant Editor
                    </Text>
                    {silentMode && (
                      <View style={{ marginLeft: 8, backgroundColor: "rgba(59, 130, 246, 0.2)", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                        <Text style={{ color: "#3B82F6", fontSize: 10 }}>SILENT</Text>
                      </View>
                    )}
                  </View>
                </Animated.View>
              </GestureDetector>
            )}

            {/* Expanded mode header */}
            {isExpanded && (
              <View
                style={{
                  paddingTop: insets.top > 0 ? insets.top : 20,
                  paddingHorizontal: 20,
                  paddingBottom: 16,
                  borderBottomWidth: 1,
                  borderBottomColor: "rgba(255, 255, 255, 0.1)",
                  backgroundColor: "rgba(0, 0, 0, 0.2)",
                }}
              >
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                  <View style={{ flexDirection: "row", alignItems: "center" }}>
                    <Ionicons name="chatbubbles" size={24} color="#FFB800" />
                    <Text style={{ color: "#FFFFFF", marginLeft: 12, fontSize: 18, fontWeight: "600" }}>
                      Assistant
                    </Text>
                    {silentMode && (
                      <View style={{ marginLeft: 10, backgroundColor: "rgba(59, 130, 246, 0.2)", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 }}>
                        <Text style={{ color: "#3B82F6", fontSize: 11, fontWeight: "500" }}>SILENT</Text>
                      </View>
                    )}
                  </View>

                  <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                    {isAIUpdating && (
                      <View style={{ backgroundColor: "rgba(139, 92, 246, 0.2)", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 }}>
                        <Text style={{ color: "#8B5CF6", fontSize: 12 }}>AI typing...</Text>
                      </View>
                    )}
                    <Pressable
                      onPress={handleHistoryPress}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      style={({ pressed }) => ({
                        width: 40,
                        height: 40,
                        borderRadius: 20,
                        backgroundColor: pressed ? "rgba(255, 255, 255, 0.15)" : "rgba(255, 255, 255, 0.08)",
                        alignItems: "center",
                        justifyContent: "center",
                      })}
                    >
                      <Ionicons name="time-outline" size={22} color="#9CA3AF" />
                    </Pressable>
                    <Pressable
                      onPress={handleClosePress}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      style={({ pressed }) => ({
                        width: 40,
                        height: 40,
                        borderRadius: 20,
                        backgroundColor: pressed ? "rgba(255, 255, 255, 0.15)" : "rgba(255, 255, 255, 0.08)",
                        alignItems: "center",
                        justifyContent: "center",
                      })}
                    >
                      <Ionicons name="chevron-down" size={24} color="#9CA3AF" />
                    </Pressable>
                  </View>
                </View>

                {/* Swipe hint */}
                <Text style={{ color: "rgba(255, 255, 255, 0.3)", fontSize: 11, marginTop: 8 }}>
                  Swipe right to minimize
                </Text>
              </View>
            )}

            {/* Content Area - Buttons and Editor */}
            <View style={{ flex: 1 }}>
              {/* Header with History and Close Buttons (compact mode only) */}
              {!isExpanded && (
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    paddingHorizontal: 16,
                    paddingVertical: 8,
                  }}
                >
                  <View style={{ flexDirection: "row", alignItems: "center" }}>
                    {isAIUpdating && (
                      <View style={{ backgroundColor: "rgba(139, 92, 246, 0.2)", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 }}>
                        <Text style={{ color: "#8B5CF6", fontSize: 11 }}>AI typing...</Text>
                      </View>
                    )}
                  </View>

                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    {/* History Button */}
                    <Pressable
                      onPress={handleHistoryPress}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      style={({ pressed }) => ({
                        width: 32,
                        height: 32,
                        borderRadius: 16,
                        backgroundColor: pressed ? "rgba(255, 255, 255, 0.2)" : "rgba(255, 255, 255, 0.1)",
                        alignItems: "center",
                        justifyContent: "center",
                      })}
                    >
                      <Ionicons name="time-outline" size={18} color="#9CA3AF" />
                    </Pressable>

                    {/* Close Button */}
                    <Pressable
                      onPress={handleClosePress}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      style={({ pressed }) => ({
                        width: 32,
                        height: 32,
                        borderRadius: 16,
                        backgroundColor: pressed ? "rgba(255, 255, 255, 0.2)" : "rgba(255, 255, 255, 0.1)",
                        alignItems: "center",
                        justifyContent: "center",
                      })}
                    >
                      <Ionicons name="close" size={18} color="#9CA3AF" />
                    </Pressable>
                  </View>
                </View>
              )}

              {/* Control Buttons */}
              <View
                style={{
                  flexDirection: "row",
                  paddingHorizontal: isExpanded ? 20 : 16,
                  paddingVertical: isExpanded ? 12 : 0,
                  paddingBottom: 10,
                  gap: 8,
                }}
              >
                {/* New Question Button */}
                <Pressable
                  onPress={handleNewQuestionPress}
                  hitSlop={{ top: 5, bottom: 5, left: 5, right: 5 }}
                  style={({ pressed }) => ({
                    flex: 1.5,
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: pressed
                      ? "rgba(255, 184, 0, 0.3)"
                      : "rgba(255, 184, 0, 0.15)",
                    paddingVertical: isExpanded ? 14 : 12,
                    borderRadius: 10,
                    borderWidth: 1,
                    borderColor: "rgba(255, 184, 0, 0.4)",
                  })}
                >
                  <Ionicons
                    name="add-circle"
                    size={isExpanded ? 18 : 16}
                    color="#FFB800"
                  />
                  <Text
                    style={{
                      color: "#FFB800",
                      fontSize: isExpanded ? 14 : 13,
                      fontWeight: "600",
                      marginLeft: 6,
                    }}
                  >
                    New Question
                  </Text>
                </Pressable>

                {/* Silent Mode Button */}
                <Pressable
                  onPress={handleSilentModePress}
                  onLongPress={handleSilentModeLongPress}
                  hitSlop={{ top: 5, bottom: 5, left: 5, right: 5 }}
                  style={({ pressed }) => ({
                    flex: 1,
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: silentMode
                      ? "rgba(59, 130, 246, 0.25)"
                      : pressed
                        ? "rgba(255, 255, 255, 0.15)"
                        : "rgba(255, 255, 255, 0.08)",
                    paddingVertical: isExpanded ? 14 : 12,
                    borderRadius: 10,
                    borderWidth: silentMode ? 1 : 0,
                    borderColor: "rgba(59, 130, 246, 0.5)",
                  })}
                >
                  <Ionicons
                    name={silentMode ? "volume-mute" : "volume-high"}
                    size={isExpanded ? 18 : 16}
                    color={silentMode ? "#3B82F6" : "#9CA3AF"}
                  />
                  <Text
                    style={{
                      color: silentMode ? "#3B82F6" : "#9CA3AF",
                      fontSize: isExpanded ? 14 : 13,
                      fontWeight: "500",
                      marginLeft: 6,
                    }}
                  >
                    {silentMode ? "Silent" : "Voice"}
                  </Text>
                </Pressable>

                {/* Clear Button */}
                <Pressable
                  onPress={handleClear}
                  hitSlop={{ top: 5, bottom: 5, left: 5, right: 5 }}
                  style={({ pressed }) => ({
                    flex: 0.8,
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: pressed ? "rgba(255, 255, 255, 0.15)" : "rgba(255, 255, 255, 0.08)",
                    paddingVertical: isExpanded ? 14 : 12,
                    borderRadius: 10,
                  })}
                >
                  <Ionicons name="trash-outline" size={isExpanded ? 18 : 16} color="#9CA3AF" />
                  <Text
                    style={{
                      color: "#9CA3AF",
                      fontSize: isExpanded ? 14 : 13,
                      fontWeight: "500",
                      marginLeft: 6,
                    }}
                  >
                    Clear
                  </Text>
                </Pressable>
              </View>

              {/* Tooltip */}
              {showSilentModeTooltip && (
                <View
                  style={{
                    position: "absolute",
                    top: 80,
                    left: 16,
                    right: 16,
                    backgroundColor: "rgba(0, 0, 0, 0.9)",
                    padding: 12,
                    borderRadius: 8,
                    zIndex: 100,
                  }}
                >
                  <Text style={{ color: "#FFFFFF", fontSize: 13 }}>
                    Silent Mode: Text-only responses, no voice output
                  </Text>
                </View>
              )}

              {/* Editable Text Area */}
              <View
                style={{
                  flex: 1,
                  marginHorizontal: isExpanded ? 20 : 16,
                  marginBottom: isExpanded ? 0 : 12,
                  backgroundColor: "rgba(255, 255, 255, 0.05)",
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: "rgba(255, 255, 255, 0.1)",
                }}
              >
                <ScrollView
                  ref={scrollViewRef}
                  style={{ flex: 1 }}
                  keyboardShouldPersistTaps="handled"
                  keyboardDismissMode="none"
                  showsVerticalScrollIndicator={true}
                  scrollEventThrottle={16}
                  nestedScrollEnabled={true}
                  automaticallyAdjustKeyboardInsets={false}
                  contentContainerStyle={{
                    flexGrow: 1,
                    paddingBottom: keyboardHeight > 0 ? 20 : 0,
                  }}
                >
                  <TextInput
                    ref={textInputRef}
                    value={editorText}
                    onChangeText={onEditorTextChange}
                    placeholder="AI suggestions will appear here. You can edit, copy, or type freely..."
                    placeholderTextColor="rgba(255, 255, 255, 0.3)"
                    multiline
                    textAlignVertical="top"
                    selectionColor="#FFB800"
                    selectTextOnFocus={false}
                    contextMenuHidden={false}
                    scrollEnabled={false}
                    dataDetectorTypes={["link", "phoneNumber"]}
                    autoCorrect={false}
                    spellCheck={false}
                    onSelectionChange={handleSelectionChange}
                    style={{
                      flex: 1,
                      color: "#FFFFFF",
                      fontSize: isExpanded ? 16 : 15,
                      lineHeight: isExpanded ? 26 : 22,
                      padding: isExpanded ? 18 : 14,
                      minHeight: isExpanded ? 300 : 200,
                    }}
                  />
                </ScrollView>
              </View>

              {/* Status Bar */}
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  paddingHorizontal: isExpanded ? 20 : 16,
                  paddingBottom: isExpanded ? (keyboardHeight > 0 ? 12 : (insets.bottom > 0 ? insets.bottom : 20)) : 10,
                  paddingTop: isExpanded ? 12 : 0,
                }}
              >
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  {silentMode && (
                    <View style={{ flexDirection: "row", alignItems: "center" }}>
                      <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: "#3B82F6" }} />
                      <Text style={{ color: "#3B82F6", fontSize: 11, marginLeft: 4 }}>Silent Mode - Text only</Text>
                    </View>
                  )}
                  {!silentMode && !isExpanded && (
                    <Text style={{ color: "rgba(255, 255, 255, 0.25)", fontSize: 10 }}>
                      ← Swipe left to expand
                    </Text>
                  )}
                </View>
                <Text style={{ color: "rgba(255, 255, 255, 0.3)", fontSize: 11 }}>
                  {editorText.length} chars
                </Text>
              </View>
            </View>

            {/* Expand hint indicator (shows when swiping left in compact mode) */}
            <Animated.View
              style={[
                {
                  position: "absolute",
                  right: 8,
                  top: "50%",
                  marginTop: -20,
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  backgroundColor: "rgba(255, 184, 0, 0.3)",
                  alignItems: "center",
                  justifyContent: "center",
                },
                expandHintStyle,
              ]}
              pointerEvents="none"
            >
              <Ionicons name="expand" size={20} color="#FFB800" />
            </Animated.View>

            {/* Collapse hint indicator (shows when swiping right in expanded mode) */}
            <Animated.View
              style={[
                {
                  position: "absolute",
                  left: 8,
                  top: "50%",
                  marginTop: -20,
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  backgroundColor: "rgba(255, 184, 0, 0.3)",
                  alignItems: "center",
                  justifyContent: "center",
                },
                collapseHintStyle,
              ]}
              pointerEvents="none"
            >
              <Ionicons name="contract" size={20} color="#FFB800" />
            </Animated.View>
          </Animated.View>
        </GestureDetector>
      </Animated.View>
    </View>
  );
}
