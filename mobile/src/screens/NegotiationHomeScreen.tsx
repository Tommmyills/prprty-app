/**
 * NegotiationHomeScreen - Negotiation Launchpad
 * A premium, visually striking homepage with deep glass aesthetic.
 *
 * Layout:
 * 1. Header with dark glass aesthetic
 * 2. Optional guidance banner (informative only)
 * 3. Start Live Negotiation - single hero action
 * 4. Quick actions: Call, Text, Email
 * 5. Deal Context card (optional)
 * 6. Prep/Notes tray (subtle, non-blocking)
 */

import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  Pressable,
  TextInput,
  Keyboard,
  ScrollView,
  Dimensions,
  Image,
  Platform,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withRepeat,
  withTiming,
  withSequence,
  withDelay,
  Easing,
  runOnJS,
  interpolate,
} from "react-native-reanimated";
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from "react-native-gesture-handler";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import { RootStackParamList } from "../types/navigation";
import { useDealMemoryStore } from "../state/dealMemoryStore";
import { useDealContextStore } from "../state/dealContextStore";
import { ContactPickerSheet, ContactActionType } from "../components/ContactPickerSheet";

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get("window");

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

// Snap points for the panel (from bottom)
const SNAP_COLLAPSED = 0;
const SNAP_HALF = SCREEN_HEIGHT * 0.5;
const SNAP_EXPANDED = SCREEN_HEIGHT * 0.85;

// Animated components
const AnimatedView = Animated.createAnimatedComponent(View);
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function NegotiationHomeScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp>();

  // Contact picker state
  const [showContactPicker, setShowContactPicker] = useState(false);
  const [contactAction, setContactAction] = useState<ContactActionType>("call");

  // Prep panel state - initialize from store
  const storedNotesText = useDealMemoryStore((s) => s.memory.notesText);
  const [prepNotes, setPrepNotes] = useState(storedNotesText);

  // Sync local state with store on mount and when store changes
  useEffect(() => {
    setPrepNotes(storedNotesText);
  }, [storedNotesText]);

  // Animation values for hero button
  const pulseScale = useSharedValue(1);
  const ringRotation = useSharedValue(0);
  const glowOpacity = useSharedValue(0.06);
  const headerOpacity = useSharedValue(0);
  const heroScale = useSharedValue(0.8);
  const quickActionsOpacity = useSharedValue(0);

  // Initialize animations on mount
  useEffect(() => {
    // Pulse animation for the hero button
    pulseScale.value = withRepeat(
      withSequence(
        withTiming(1.03, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 2000, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );

    // Rotating ring effect
    ringRotation.value = withRepeat(
      withTiming(360, { duration: 20000, easing: Easing.linear }),
      -1,
      false
    );

    // Glow pulse
    glowOpacity.value = withRepeat(
      withSequence(
        withTiming(0.1, { duration: 3000, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.04, { duration: 3000, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );

    // Entrance animations
    headerOpacity.value = withDelay(100, withTiming(1, { duration: 600 }));
    heroScale.value = withDelay(200, withSpring(1, { damping: 15, stiffness: 100 }));
    quickActionsOpacity.value = withDelay(400, withTiming(1, { duration: 500 }));
  }, []);

  // Animated styles
  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
  }));

  const ringStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${ringRotation.value}deg` }],
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
  }));

  const headerAnimStyle = useAnimatedStyle(() => ({
    opacity: headerOpacity.value,
  }));

  const heroAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: heroScale.value }],
    opacity: heroScale.value,
  }));

  const quickActionsAnimStyle = useAnimatedStyle(() => ({
    opacity: quickActionsOpacity.value,
  }));

  // Deal Memory store for images/files
  const addImageUrl = useDealMemoryStore((s) => s.addImageUrl);
  const addFileUrl = useDealMemoryStore((s) => s.addFileUrl);
  const imageUrls = useDealMemoryStore((s) => s.memory.imageUrls);
  const fileUrls = useDealMemoryStore((s) => s.memory.fileUrls);
  const setNotesText = useDealMemoryStore((s) => s.setNotesText);

  // Deal Context store
  const dealContexts = useDealContextStore((s) => s.dealContexts);
  const activeDealContextId = useDealContextStore((s) => s.activeDealContextId);
  const initializeDemoIfNeeded = useDealContextStore((s) => s.initializeDemoIfNeeded);

  // Derive active deal context from state
  const activeDealContext = activeDealContextId
    ? dealContexts.find((ctx) => ctx.id === activeDealContextId) || null
    : null;

  // Initialize demo on mount
  useEffect(() => {
    initializeDemoIfNeeded();
  }, []);

  // Panel height (animated)
  const panelHeight = useSharedValue(SNAP_COLLAPSED);
  const panelContext = useSharedValue(SNAP_COLLAPSED);

  // Keyboard state
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const scrollViewRef = useRef<ScrollView>(null);

  // Listen for keyboard events to expand panel and scroll to input
  useEffect(() => {
    const keyboardWillShow = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow",
      (e) => {
        setKeyboardHeight(e.endCoordinates.height);
        // Expand panel to at least half when keyboard shows
        if (panelHeight.value < SNAP_HALF) {
          panelHeight.value = withSpring(SNAP_EXPANDED, { damping: 20, stiffness: 200 });
        }
      }
    );

    const keyboardWillHide = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide",
      () => {
        setKeyboardHeight(0);
      }
    );

    return () => {
      keyboardWillShow.remove();
      keyboardWillHide.remove();
    };
  }, []);

  // Panel animated style
  const panelStyle = useAnimatedStyle(() => ({
    height: panelHeight.value + insets.bottom,
  }));

  // Snap to nearest point
  const snapToPoint = (velocity: number) => {
    "worklet";
    const currentHeight = panelHeight.value;

    // Determine direction based on velocity
    if (Math.abs(velocity) > 500) {
      if (velocity < 0) {
        // Swiping up (negative velocity in our coordinate system)
        if (currentHeight < SNAP_HALF) {
          panelHeight.value = withSpring(SNAP_HALF, { damping: 20, stiffness: 200 });
        } else {
          panelHeight.value = withSpring(SNAP_EXPANDED, { damping: 20, stiffness: 200 });
        }
      } else {
        // Swiping down
        if (currentHeight > SNAP_HALF) {
          panelHeight.value = withSpring(SNAP_HALF, { damping: 20, stiffness: 200 });
        } else {
          panelHeight.value = withSpring(SNAP_COLLAPSED, { damping: 20, stiffness: 200 });
        }
      }
      return;
    }

    // Snap to nearest point based on position
    const distances = [
      { point: SNAP_COLLAPSED, dist: Math.abs(currentHeight - SNAP_COLLAPSED) },
      { point: SNAP_HALF, dist: Math.abs(currentHeight - SNAP_HALF) },
      { point: SNAP_EXPANDED, dist: Math.abs(currentHeight - SNAP_EXPANDED) },
    ];

    const nearest = distances.reduce((prev, curr) =>
      curr.dist < prev.dist ? curr : prev
    );

    panelHeight.value = withSpring(nearest.point, { damping: 20, stiffness: 200 });
  };

  // Pan gesture for the panel
  const panGesture = Gesture.Pan()
    .onStart(() => {
      panelContext.value = panelHeight.value;
    })
    .onUpdate((event) => {
      // Negative translationY means dragging up, which should increase height
      const newHeight = panelContext.value - event.translationY;
      panelHeight.value = Math.max(SNAP_COLLAPSED, Math.min(SNAP_EXPANDED, newHeight));
    })
    .onEnd((event) => {
      snapToPoint(event.velocityY);
      runOnJS(Haptics.impactAsync)(Haptics.ImpactFeedbackStyle.Light);
    });

  // Navigate to Mode Selection (then Live Negotiation)
  const handleStartNegotiation = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    navigation.navigate("ModeSelection");
  };

  // Toggle panel to half or collapsed
  const togglePrepPanel = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (panelHeight.value < SNAP_HALF / 2) {
      panelHeight.value = withSpring(SNAP_HALF, { damping: 20, stiffness: 200 });
    } else {
      panelHeight.value = withSpring(SNAP_COLLAPSED, { damping: 20, stiffness: 200 });
    }
  };

  const handleTakePhoto = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== "granted") {
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        addImageUrl(result.assets[0].uri);
      }
    } catch (error) {
      console.error("[NegotiationHome] Camera error:", error);
    }
  };

  const handlePickFile = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const result = await DocumentPicker.getDocumentAsync({
        type: ["application/pdf", "image/*"],
        multiple: true,
      });

      if (!result.canceled && result.assets) {
        result.assets.forEach((asset) => {
          addFileUrl(asset.uri);
        });
      }
    } catch (error) {
      console.error("[NegotiationHome] File pick error:", error);
    }
  };

  // Save notes to deal memory
  const handleNotesChange = (text: string) => {
    setPrepNotes(text);
    setNotesText(text);
  };

  // Quick action handlers
  const handleCallContact = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setContactAction("call");
    setShowContactPicker(true);
  };

  const handleTextFollowUp = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setContactAction("text");
    setShowContactPicker(true);
  };

  const handleEmailFollowUp = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setContactAction("email");
    setShowContactPicker(true);
  };

  // Count items in prep
  const prepItemCount = (prepNotes.trim() ? 1 : 0) + imageUrls.length + fileUrls.length;

  // Get optional guidance from deal context
  const getGuidance = () => {
    if (activeDealContext) {
      // Extract first actionable item from notes if available
      const notes = activeDealContext.notes || "";
      const lines = notes.split("\n").filter(line => line.trim());
      const actionLine = lines.find(line =>
        line.toLowerCase().includes("request") ||
        line.toLowerCase().includes("respond") ||
        line.toLowerCase().includes("call") ||
        line.toLowerCase().includes("send")
      );
      if (actionLine) {
        return actionLine.replace(/^[•\-\*]\s*/, "").trim().slice(0, 60);
      }
      return "Review your deal context before starting";
    }
    return null;
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={{ flex: 1, backgroundColor: "#030308" }}>
        {/* Deep layered background */}
        <LinearGradient
          colors={["#030308", "#08081A", "#0A0A1A", "#050510"]}
          locations={[0, 0.3, 0.7, 1]}
          style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
        />

        {/* Animated ambient glow orbs */}
        <AnimatedView
          style={[
            glowStyle,
            {
              position: "absolute",
              top: "15%",
              left: -50,
              width: 200,
              height: 200,
              borderRadius: 100,
              backgroundColor: "#D4AF37",
            },
          ]}
        />
        <AnimatedView
          style={[
            glowStyle,
            {
              position: "absolute",
              top: "40%",
              right: -80,
              width: 250,
              height: 250,
              borderRadius: 125,
              backgroundColor: "#B8860B",
            },
          ]}
        />
        <AnimatedView
          style={[
            glowStyle,
            {
              position: "absolute",
              bottom: "20%",
              left: "30%",
              width: 180,
              height: 180,
              borderRadius: 90,
              backgroundColor: "#FFD700",
            },
          ]}
        />

        {/* Mesh grid pattern overlay */}
        <View
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            opacity: 0.03,
          }}
        >
          {[...Array(20)].map((_, i) => (
            <View
              key={`h-${i}`}
              style={{
                position: "absolute",
                top: i * 50,
                left: 0,
                right: 0,
                height: 1,
                backgroundColor: "#D4AF37",
              }}
            />
          ))}
          {[...Array(10)].map((_, i) => (
            <View
              key={`v-${i}`}
              style={{
                position: "absolute",
                top: 0,
                bottom: 0,
                left: i * 50,
                width: 1,
                backgroundColor: "#D4AF37",
              }}
            />
          ))}
        </View>

        {/* Header with glass effect */}
        <AnimatedView
          style={[
            headerAnimStyle,
            {
              paddingTop: insets.top + 20,
              paddingHorizontal: 24,
              paddingBottom: 16,
            },
          ]}
        >
          <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between" }}>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 4 }}>
                <View
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: 4,
                    backgroundColor: "#D4AF37",
                    marginRight: 8,
                    shadowColor: "#D4AF37",
                    shadowOffset: { width: 0, height: 0 },
                    shadowOpacity: 0.8,
                    shadowRadius: 6,
                  }}
                />
                <Text style={{ color: "#D4AF37", fontSize: 11, letterSpacing: 3, fontWeight: "700" }}>
                  THE CLOSER
                </Text>
              </View>
              <Text style={{ color: "#FFFFFF", fontSize: 26, fontWeight: "800", letterSpacing: -0.5 }}>
                Negotiation
              </Text>
              <Text style={{ color: "rgba(255, 255, 255, 0.5)", fontSize: 14, fontWeight: "500", marginTop: 2 }}>
                Your AI-powered closing assistant
              </Text>
            </View>

            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                navigation.navigate("Dashboard");
              }}
              style={{
                width: 44,
                height: 44,
                borderRadius: 14,
                backgroundColor: "rgba(212, 175, 55, 0.08)",
                alignItems: "center",
                justifyContent: "center",
                borderWidth: 1,
                borderColor: "rgba(212, 175, 55, 0.2)",
                marginTop: 4,
                overflow: "visible",
              }}
            >
              <View style={{ width: 20, height: 20, alignItems: "center", justifyContent: "center" }}>
                <Ionicons name="grid" size={19} color="#D4AF37" />
              </View>
            </Pressable>
          </View>
        </AnimatedView>

        {/* Main content area */}
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 120 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Optional Guidance Banner */}
          {getGuidance() && (
            <BlurView
              intensity={20}
              tint="dark"
              style={{
                borderRadius: 16,
                overflow: "hidden",
                marginBottom: 24,
              }}
            >
              <LinearGradient
                colors={["rgba(212, 175, 55, 0.08)", "rgba(212, 175, 55, 0.02)"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{
                  padding: 14,
                  borderWidth: 1,
                  borderColor: "rgba(212, 175, 55, 0.15)",
                  borderRadius: 16,
                }}
              >
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <View
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 10,
                      backgroundColor: "rgba(212, 175, 55, 0.15)",
                      alignItems: "center",
                      justifyContent: "center",
                      marginRight: 12,
                    }}
                  >
                    <Ionicons name="bulb" size={16} color="#D4AF37" />
                  </View>
                  <Text
                    style={{
                      color: "rgba(255, 255, 255, 0.7)",
                      fontSize: 13,
                      flex: 1,
                      lineHeight: 18,
                    }}
                    numberOfLines={2}
                  >
                    {getGuidance()}
                  </Text>
                </View>
              </LinearGradient>
            </BlurView>
          )}

          {/* Hero Button - Premium animated design */}
          <AnimatedView style={[heroAnimStyle, { alignItems: "center", marginBottom: 36, marginTop: 16 }]}>
            <Pressable
              onPress={handleStartNegotiation}
              style={({ pressed }) => ({
                alignItems: "center",
                opacity: pressed ? 0.9 : 1,
              })}
            >
              {/* Outer rotating ring */}
              <View style={{ position: "relative", width: 200, height: 200, alignItems: "center", justifyContent: "center" }}>
                <AnimatedView
                  style={[
                    ringStyle,
                    {
                      position: "absolute",
                      width: 200,
                      height: 200,
                      borderRadius: 100,
                      borderWidth: 1.5,
                      borderColor: "transparent",
                      borderTopColor: "rgba(217, 70, 239, 0.6)",
                      borderRightColor: "rgba(251, 146, 60, 0.4)",
                    },
                  ]}
                />
                <AnimatedView
                  style={[
                    ringStyle,
                    {
                      position: "absolute",
                      width: 188,
                      height: 188,
                      borderRadius: 94,
                      borderWidth: 1,
                      borderColor: "transparent",
                      borderBottomColor: "rgba(217, 70, 239, 0.5)",
                      borderLeftColor: "rgba(251, 146, 60, 0.3)",
                      transform: [{ rotate: "45deg" }],
                    },
                  ]}
                />

                {/* Pulsing glow behind button */}
                <AnimatedView
                  style={[
                    pulseStyle,
                    {
                      position: "absolute",
                      width: 175,
                      height: 175,
                      borderRadius: 87.5,
                      backgroundColor: "rgba(217, 70, 239, 0.15)",
                      shadowColor: "#D946EF",
                      shadowOffset: { width: 0, height: 0 },
                      shadowOpacity: 0.7,
                      shadowRadius: 40,
                    },
                  ]}
                />

                {/* Main button - circular clipped image */}
                <AnimatedView style={pulseStyle}>
                  <View
                    style={{
                      width: 160,
                      height: 160,
                      borderRadius: 80,
                      overflow: "hidden",
                      borderWidth: 2.5,
                      borderColor: "rgba(217, 70, 239, 0.5)",
                      shadowColor: "#D946EF",
                      shadowOffset: { width: 0, height: 6 },
                      shadowOpacity: 0.6,
                      shadowRadius: 30,
                      backgroundColor: "#0A0A12",
                    }}
                  >
                    {/* Door icon - scaled to fill 90% of circle */}
                    <Image
                      source={require("../../assets/image-1764988335.jpeg")}
                      style={{
                        width: 196,
                        height: 196,
                        marginLeft: -18,
                        marginTop: -18,
                        resizeMode: "cover",
                      }}
                    />
                    {/* Top sparkle glow overlay */}
                    <LinearGradient
                      colors={["rgba(217, 70, 239, 0.3)", "transparent", "transparent"]}
                      locations={[0, 0.3, 1]}
                      style={{
                        position: "absolute",
                        top: 0,
                        left: 0,
                        right: 0,
                        height: 60,
                        borderTopLeftRadius: 80,
                        borderTopRightRadius: 80,
                      }}
                    />
                    {/* Bottom vignette for depth */}
                    <LinearGradient
                      colors={["transparent", "rgba(0, 0, 0, 0.4)"]}
                      style={{
                        position: "absolute",
                        bottom: 0,
                        left: 0,
                        right: 0,
                        height: 50,
                        borderBottomLeftRadius: 80,
                        borderBottomRightRadius: 80,
                      }}
                    />
                  </View>
                </AnimatedView>
              </View>

              <Text
                style={{
                  color: "#FFFFFF",
                  fontSize: 20,
                  fontWeight: "800",
                  marginTop: 20,
                  letterSpacing: 0.3,
                }}
              >
                Start Live Negotiation
              </Text>
              <Text
                style={{
                  color: "rgba(212, 175, 55, 0.7)",
                  fontSize: 13,
                  marginTop: 8,
                  fontWeight: "500",
                }}
              >
                Tap to enter negotiation mode
              </Text>
            </Pressable>
          </AnimatedView>

          {/* Quick Actions Row - Glass cards */}
          <AnimatedView style={[quickActionsAnimStyle, { marginBottom: 24 }]}>
            <Text style={{ color: "rgba(255, 255, 255, 0.4)", fontSize: 11, fontWeight: "600", letterSpacing: 1.5, marginBottom: 12, marginLeft: 4 }}>
              QUICK ACTIONS
            </Text>
            <View style={{ flexDirection: "row", gap: 12 }}>
              {/* Call */}
              <Pressable
                onPress={handleCallContact}
                style={({ pressed }) => ({
                  flex: 1,
                  opacity: pressed ? 0.8 : 1,
                  transform: [{ scale: pressed ? 0.96 : 1 }],
                })}
              >
                <BlurView intensity={15} tint="dark" style={{ borderRadius: 18, overflow: "hidden" }}>
                  <LinearGradient
                    colors={["rgba(16, 185, 129, 0.12)", "rgba(16, 185, 129, 0.04)"]}
                    style={{
                      alignItems: "center",
                      paddingVertical: 18,
                      borderWidth: 1,
                      borderColor: "rgba(16, 185, 129, 0.2)",
                      borderRadius: 18,
                    }}
                  >
                    <View
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: 14,
                        backgroundColor: "rgba(16, 185, 129, 0.15)",
                        alignItems: "center",
                        justifyContent: "center",
                        marginBottom: 10,
                        shadowColor: "#10B981",
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.3,
                        shadowRadius: 8,
                      }}
                    >
                      <Ionicons name="call" size={22} color="#10B981" />
                    </View>
                    <Text style={{ color: "#FFFFFF", fontSize: 13, fontWeight: "600" }}>
                      Call
                    </Text>
                  </LinearGradient>
                </BlurView>
              </Pressable>

              {/* Text */}
              <Pressable
                onPress={handleTextFollowUp}
                style={({ pressed }) => ({
                  flex: 1,
                  opacity: pressed ? 0.8 : 1,
                  transform: [{ scale: pressed ? 0.96 : 1 }],
                })}
              >
                <BlurView intensity={15} tint="dark" style={{ borderRadius: 18, overflow: "hidden" }}>
                  <LinearGradient
                    colors={["rgba(59, 130, 246, 0.12)", "rgba(59, 130, 246, 0.04)"]}
                    style={{
                      alignItems: "center",
                      paddingVertical: 18,
                      borderWidth: 1,
                      borderColor: "rgba(59, 130, 246, 0.2)",
                      borderRadius: 18,
                    }}
                  >
                    <View
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: 14,
                        backgroundColor: "rgba(59, 130, 246, 0.15)",
                        alignItems: "center",
                        justifyContent: "center",
                        marginBottom: 10,
                        shadowColor: "#3B82F6",
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.3,
                        shadowRadius: 8,
                      }}
                    >
                      <Ionicons name="chatbubble" size={22} color="#3B82F6" />
                    </View>
                    <Text style={{ color: "#FFFFFF", fontSize: 13, fontWeight: "600" }}>
                      Text
                    </Text>
                  </LinearGradient>
                </BlurView>
              </Pressable>

              {/* Email */}
              <Pressable
                onPress={handleEmailFollowUp}
                style={({ pressed }) => ({
                  flex: 1,
                  opacity: pressed ? 0.8 : 1,
                  transform: [{ scale: pressed ? 0.96 : 1 }],
                })}
              >
                <BlurView intensity={15} tint="dark" style={{ borderRadius: 18, overflow: "hidden" }}>
                  <LinearGradient
                    colors={["rgba(168, 85, 247, 0.12)", "rgba(168, 85, 247, 0.04)"]}
                    style={{
                      alignItems: "center",
                      paddingVertical: 18,
                      borderWidth: 1,
                      borderColor: "rgba(168, 85, 247, 0.2)",
                      borderRadius: 18,
                    }}
                  >
                    <View
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: 14,
                        backgroundColor: "rgba(168, 85, 247, 0.15)",
                        alignItems: "center",
                        justifyContent: "center",
                        marginBottom: 10,
                        shadowColor: "#A855F7",
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.3,
                        shadowRadius: 8,
                      }}
                    >
                      <Ionicons name="mail" size={22} color="#A855F7" />
                    </View>
                    <Text style={{ color: "#FFFFFF", fontSize: 13, fontWeight: "600" }}>
                      Email
                    </Text>
                  </LinearGradient>
                </BlurView>
              </Pressable>
            </View>
          </AnimatedView>

          {/* Deal Context Card - Premium glass */}
          <AnimatedView style={quickActionsAnimStyle}>
            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                navigation.navigate("DealContextMemory");
              }}
              style={({ pressed }) => ({
                opacity: pressed ? 0.85 : 1,
                transform: [{ scale: pressed ? 0.98 : 1 }],
              })}
            >
              <BlurView intensity={20} tint="dark" style={{ borderRadius: 20, overflow: "hidden" }}>
                <LinearGradient
                  colors={["rgba(212, 175, 55, 0.08)", "rgba(212, 175, 55, 0.02)", "rgba(0, 0, 0, 0.3)"]}
                  locations={[0, 0.5, 1]}
                  style={{
                    padding: 18,
                    borderWidth: 1,
                    borderColor: "rgba(212, 175, 55, 0.15)",
                    borderRadius: 20,
                  }}
                >
                  <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                    <View style={{ flexDirection: "row", alignItems: "center" }}>
                      <LinearGradient
                        colors={["rgba(212, 175, 55, 0.2)", "rgba(212, 175, 55, 0.1)"]}
                        style={{
                          width: 40,
                          height: 40,
                          borderRadius: 12,
                          alignItems: "center",
                          justifyContent: "center",
                          marginRight: 12,
                        }}
                      >
                        <Ionicons name="briefcase" size={20} color="#D4AF37" />
                      </LinearGradient>
                      <View>
                        <Text style={{ color: "#FFFFFF", fontSize: 16, fontWeight: "700" }}>
                          Deal Context
                        </Text>
                        <Text style={{ color: "rgba(255, 255, 255, 0.4)", fontSize: 11, marginTop: 2 }}>
                          {activeDealContext ? "Active deal loaded" : "Set up your deal"}
                        </Text>
                      </View>
                    </View>
                    <View
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 10,
                        backgroundColor: "rgba(255, 255, 255, 0.05)",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Ionicons name="chevron-forward" size={18} color="rgba(212, 175, 55, 0.6)" />
                    </View>
                  </View>

                  {activeDealContext ? (
                    <View
                      style={{
                        backgroundColor: "rgba(0, 0, 0, 0.3)",
                        borderRadius: 12,
                        padding: 14,
                      }}
                    >
                      <Text
                        style={{
                          color: "#D4AF37",
                          fontSize: 14,
                          fontWeight: "700",
                          marginBottom: 6,
                        }}
                        numberOfLines={1}
                      >
                        {activeDealContext.dealName}
                      </Text>
                      {activeDealContext.address && (
                        <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 8 }}>
                          <Ionicons name="location-outline" size={12} color="rgba(255, 255, 255, 0.4)" />
                          <Text
                            style={{
                              color: "rgba(255, 255, 255, 0.5)",
                              fontSize: 12,
                              marginLeft: 4,
                            }}
                            numberOfLines={1}
                          >
                            {activeDealContext.address}
                          </Text>
                        </View>
                      )}
                      {activeDealContext.notes && (
                        <Text
                          style={{
                            color: "rgba(255, 255, 255, 0.4)",
                            fontSize: 12,
                            lineHeight: 18,
                          }}
                          numberOfLines={2}
                        >
                          {activeDealContext.notes.slice(0, 100)}
                          {activeDealContext.notes.length > 100 ? "..." : ""}
                        </Text>
                      )}
                    </View>
                  ) : (
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        backgroundColor: "rgba(212, 175, 55, 0.05)",
                        borderRadius: 12,
                        padding: 14,
                        borderWidth: 1,
                        borderColor: "rgba(212, 175, 55, 0.1)",
                        borderStyle: "dashed",
                      }}
                    >
                      <Ionicons name="add-circle" size={20} color="rgba(212, 175, 55, 0.5)" />
                      <Text
                        style={{
                          color: "rgba(255, 255, 255, 0.5)",
                          fontSize: 13,
                          marginLeft: 10,
                        }}
                      >
                        Add context for smarter guidance
                      </Text>
                    </View>
                  )}
                </LinearGradient>
              </BlurView>
            </Pressable>
          </AnimatedView>
        </ScrollView>

        {/* Prep/Notes Toggle Handle - Fixed at bottom */}
        <Pressable
          onPress={togglePrepPanel}
          style={{
            position: "absolute",
            bottom: insets.bottom + 16,
            left: 0,
            right: 0,
            alignItems: "center",
            paddingVertical: 8,
          }}
        >
          <BlurView intensity={25} tint="dark" style={{ borderRadius: 24, overflow: "hidden" }}>
            <LinearGradient
              colors={["rgba(212, 175, 55, 0.12)", "rgba(212, 175, 55, 0.05)"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{
                flexDirection: "row",
                alignItems: "center",
                paddingHorizontal: 18,
                paddingVertical: 10,
                borderWidth: 1,
                borderColor: "rgba(212, 175, 55, 0.2)",
                borderRadius: 24,
              }}
            >
              <Ionicons
                name="chevron-up"
                size={16}
                color="#D4AF37"
              />
              <Text
                style={{
                  color: "#D4AF37",
                  fontSize: 13,
                  fontWeight: "600",
                  marginLeft: 8,
                }}
              >
                Prep / Notes
              </Text>
              {prepItemCount > 0 && (
                <View
                  style={{
                    backgroundColor: "#D4AF37",
                    paddingHorizontal: 7,
                    paddingVertical: 2,
                    borderRadius: 10,
                    marginLeft: 8,
                  }}
                >
                  <Text style={{ color: "#000", fontSize: 11, fontWeight: "700" }}>
                    {prepItemCount}
                  </Text>
                </View>
              )}
            </LinearGradient>
          </BlurView>
        </Pressable>

        {/* Prep/Notes Panel - Slide-up with gesture and snap points */}
        <GestureDetector gesture={panGesture}>
          <Animated.View
            style={[
              panelStyle,
              {
                position: "absolute",
                bottom: 0,
                left: 0,
                right: 0,
                overflow: "hidden",
              },
            ]}
          >
            {/* Frosted glass background */}
            <BlurView
              intensity={60}
              tint="dark"
              style={{
                flex: 1,
                borderTopLeftRadius: 28,
                borderTopRightRadius: 28,
                overflow: "hidden",
              }}
            >
              {/* Gradient overlay for depth */}
              <LinearGradient
                colors={[
                  "rgba(20, 20, 30, 0.95)",
                  "rgba(12, 12, 18, 0.98)",
                  "rgba(8, 8, 12, 1)",
                ]}
                style={{
                  flex: 1,
                  borderTopLeftRadius: 28,
                  borderTopRightRadius: 28,
                  borderWidth: 1,
                  borderColor: "rgba(212, 175, 55, 0.15)",
                  borderBottomWidth: 0,
                }}
              >
                {/* Handle bar */}
                <View style={{ alignItems: "center", paddingTop: 12, paddingBottom: 8 }}>
                  <View
                    style={{
                      width: 40,
                      height: 5,
                      borderRadius: 3,
                      backgroundColor: "rgba(212, 175, 55, 0.35)",
                    }}
                  />
                </View>

                {/* Panel header */}
                <View style={{ paddingHorizontal: 20, paddingBottom: 14, flexDirection: "row", alignItems: "center" }}>
                  <View
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 10,
                      backgroundColor: "rgba(212, 175, 55, 0.12)",
                      alignItems: "center",
                      justifyContent: "center",
                      marginRight: 10,
                    }}
                  >
                    <Ionicons name="create" size={16} color="#D4AF37" />
                  </View>
                  <Text
                    style={{
                      color: "#FFFFFF",
                      fontSize: 16,
                      fontWeight: "700",
                    }}
                  >
                    Prep / Notes
                  </Text>
                </View>

                {/* Scrollable content */}
                <ScrollView
                  ref={scrollViewRef}
                  style={{ flex: 1 }}
                  contentContainerStyle={{
                    paddingHorizontal: 20,
                    paddingBottom: keyboardHeight > 0 ? keyboardHeight + 20 : insets.bottom + 20
                  }}
                  showsVerticalScrollIndicator={false}
                  keyboardShouldPersistTaps="handled"
                  keyboardDismissMode="interactive"
                >
                  {/* Notes input */}
                  <View style={{ marginBottom: 16 }}>
                    <Text
                      style={{
                        color: "rgba(255, 255, 255, 0.5)",
                        fontSize: 11,
                        fontWeight: "600",
                        letterSpacing: 1,
                        marginBottom: 10,
                        textTransform: "uppercase",
                      }}
                    >
                      Private Notes
                    </Text>
                    <TextInput
                      value={prepNotes}
                      onChangeText={handleNotesChange}
                      placeholder="Add notes for the AI to reference during negotiation..."
                      placeholderTextColor="rgba(255, 255, 255, 0.25)"
                      multiline
                      scrollEnabled={true}
                      style={{
                        backgroundColor: "rgba(255, 255, 255, 0.04)",
                        borderWidth: 1,
                        borderColor: "rgba(212, 175, 55, 0.12)",
                        borderRadius: 14,
                        padding: 16,
                        color: "#FFFFFF",
                        fontSize: 15,
                        minHeight: 120,
                        maxHeight: 200,
                        textAlignVertical: "top",
                        lineHeight: 22,
                      }}
                    />
                  </View>

                  {/* Quick actions row */}
                  <View style={{ flexDirection: "row", gap: 12, marginBottom: 16 }}>
                    {/* Camera button */}
                    <Pressable
                      onPress={handleTakePhoto}
                      style={({ pressed }) => ({
                        flex: 1,
                        opacity: pressed ? 0.8 : 1,
                      })}
                    >
                      <LinearGradient
                        colors={["rgba(212, 175, 55, 0.12)", "rgba(212, 175, 55, 0.04)"]}
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          justifyContent: "center",
                          borderWidth: 1,
                          borderColor: "rgba(212, 175, 55, 0.2)",
                          borderRadius: 14,
                          paddingVertical: 14,
                        }}
                      >
                        <Ionicons name="camera" size={20} color="#D4AF37" />
                        <Text
                          style={{
                            color: "#D4AF37",
                            fontSize: 13,
                            fontWeight: "600",
                            marginLeft: 8,
                          }}
                        >
                          Capture
                        </Text>
                        {imageUrls.length > 0 && (
                          <View
                            style={{
                              backgroundColor: "#D4AF37",
                              paddingHorizontal: 6,
                              paddingVertical: 2,
                              borderRadius: 8,
                              marginLeft: 6,
                            }}
                          >
                            <Text style={{ color: "#000", fontSize: 10, fontWeight: "700" }}>
                              {imageUrls.length}
                            </Text>
                          </View>
                        )}
                      </LinearGradient>
                    </Pressable>

                    {/* Upload button */}
                    <Pressable
                      onPress={handlePickFile}
                      style={({ pressed }) => ({
                        flex: 1,
                        opacity: pressed ? 0.8 : 1,
                      })}
                    >
                      <LinearGradient
                        colors={["rgba(212, 175, 55, 0.12)", "rgba(212, 175, 55, 0.04)"]}
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          justifyContent: "center",
                          borderWidth: 1,
                          borderColor: "rgba(212, 175, 55, 0.2)",
                          borderRadius: 14,
                          paddingVertical: 14,
                        }}
                      >
                        <Ionicons name="attach" size={20} color="#D4AF37" />
                        <Text
                          style={{
                            color: "#D4AF37",
                            fontSize: 13,
                            fontWeight: "600",
                            marginLeft: 8,
                          }}
                        >
                          Attach
                        </Text>
                        {fileUrls.length > 0 && (
                          <View
                            style={{
                              backgroundColor: "#D4AF37",
                              paddingHorizontal: 6,
                              paddingVertical: 2,
                              borderRadius: 8,
                              marginLeft: 6,
                            }}
                          >
                            <Text style={{ color: "#000", fontSize: 10, fontWeight: "700" }}>
                              {fileUrls.length}
                            </Text>
                          </View>
                        )}
                      </LinearGradient>
                    </Pressable>
                  </View>

                  {/* Attached items preview */}
                  {(imageUrls.length > 0 || fileUrls.length > 0) && (
                    <View style={{ marginBottom: 16 }}>
                      <Text
                        style={{
                          color: "rgba(255, 255, 255, 0.5)",
                          fontSize: 11,
                          fontWeight: "600",
                          letterSpacing: 1,
                          marginBottom: 10,
                          textTransform: "uppercase",
                        }}
                      >
                        Attachments
                      </Text>
                      <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={{ gap: 10 }}
                      >
                        {imageUrls.map((uri, index) => (
                          <View
                            key={`img-${index}`}
                            style={{
                              width: 70,
                              height: 70,
                              borderRadius: 12,
                              overflow: "hidden",
                              borderWidth: 1,
                              borderColor: "rgba(212, 175, 55, 0.2)",
                            }}
                          >
                            <Image
                              source={{ uri }}
                              style={{ width: "100%", height: "100%" }}
                              resizeMode="cover"
                            />
                          </View>
                        ))}
                        {fileUrls.map((uri, index) => (
                          <View
                            key={`file-${index}`}
                            style={{
                              width: 70,
                              height: 70,
                              borderRadius: 12,
                              backgroundColor: "rgba(212, 175, 55, 0.08)",
                              borderWidth: 1,
                              borderColor: "rgba(212, 175, 55, 0.2)",
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                          >
                            <Ionicons name="document" size={28} color="#D4AF37" />
                          </View>
                        ))}
                      </ScrollView>
                    </View>
                  )}

                  {/* Context info */}
                  {prepItemCount > 0 && (
                    <LinearGradient
                      colors={["rgba(16, 185, 129, 0.12)", "rgba(16, 185, 129, 0.04)"]}
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        borderRadius: 12,
                        paddingHorizontal: 14,
                        paddingVertical: 12,
                        borderWidth: 1,
                        borderColor: "rgba(16, 185, 129, 0.2)",
                      }}
                    >
                      <Ionicons name="checkmark-circle" size={18} color="#10B981" />
                      <Text
                        style={{
                          color: "#10B981",
                          fontSize: 13,
                          marginLeft: 10,
                          flex: 1,
                          fontWeight: "500",
                        }}
                      >
                        AI will reference your notes during negotiation
                      </Text>
                    </LinearGradient>
                  )}
                </ScrollView>
              </LinearGradient>
            </BlurView>
          </Animated.View>
        </GestureDetector>
      </View>
      <ContactPickerSheet
        visible={showContactPicker}
        onClose={() => setShowContactPicker(false)}
        actionType={contactAction}
      />
    </GestureHandlerRootView>
  );
}
