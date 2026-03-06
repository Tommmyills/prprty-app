/**
 * Live Coaching Screen
 * A professional negotiation assistant with mode-specific behavior.
 * Features a universal editable text workspace as the primary interaction surface.
 */

import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Linking,
  TextInput,
  Modal,
  AppState,
  AppStateStatus,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import Animated, {
  FadeIn,
  FadeInUp,
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  withSpring,
  Easing,
  runOnJS,
} from "react-native-reanimated";
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from "react-native-gesture-handler";
import { BlurView } from "expo-blur";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import { Dimensions, Image } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Audio } from "expo-av";
import { transcribeAudio } from "../api/transcribe-audio";
import { stopSpeaking } from "../services/audioService";
import { getAgentGreeting } from "../api/realtor-agent";
import { DealMemoryPanel } from "../components/DealMemoryPanel";
import { NegotiationChatWindow } from "../components/NegotiationChatWindow";
import { useDealMemoryStore } from "../state/dealMemoryStore";
import { useDealContextStore } from "../state/dealContextStore";
import { RootStackParamList, NegotiationMode } from "../types/navigation";

interface CoachingPrompt {
  id: string;
  type: "urgent" | "strategy" | "watch" | "say" | "context" | "reassurance";
  content: string;
  timestamp: Date;
  spoken?: boolean;
  usedDealContext?: boolean;
}

const COACHING_SYSTEM_PROMPT = `You are The Closer - a live negotiation coach helping real estate professionals WIN deals and CLOSE sales in real time.

## YOUR ROLE
You are an active, engaged coach. When the user speaks during a negotiation, you ALWAYS provide helpful guidance. You listen to what they say and give them winning responses, tactics, and phrases to use.

## YOUR MISSION
Help the user:
- Close the deal
- Overcome objections
- Build rapport with clients
- Navigate tough conversations
- Know exactly what to say next

## WHEN TO RESPOND
ALWAYS respond with coaching when you hear:
- The user talking to a client/prospect
- Any discussion about buying/selling property
- Price negotiations or objections
- Client concerns or hesitations
- Questions the user needs help answering
- Any real estate conversation

ONLY stay silent (respond with null) when:
- Complete silence or unintelligible audio
- The user explicitly says they are done or taking a break

## COACHING STYLE
Be like a coach whispering in their ear:
- Short, punchy guidance (2-3 sentences max)
- Give them EXACT phrases to say in quotes
- Be confident and direct
- Focus on closing and winning
- Anticipate objections before they come

## RESPONSE EXAMPLES

If user says: "They said the price is too high"
You respond: Tell them value, not price. Say: "I understand price is important. Let me show you why this property is actually underpriced compared to what you get."

If user says: "They want to think about it"
You respond: Create urgency without pressure. Say: "I completely understand. Just so you know, we have two other showings scheduled this week. When would be a good time to reconnect tomorrow?"

If user says: "They are asking about the neighborhood"
You respond: Sell the lifestyle. Say: "This is one of the most sought-after areas. Families love the schools, and the community events bring everyone together."

## RESPONSE FORMAT
Respond with a JSON object:
{
  "type": "say" | "strategy" | "urgent" | "reassurance",
  "content": "Your coaching guidance with suggested phrases in quotes",
  "shouldSpeak": true,
  "usedDealContext": false
}

Use these types:
- "say" = Give them exact words to use (most common)
- "strategy" = Tactical advice on approach
- "urgent" = Critical moment, act now
- "reassurance" = Boost their confidence

IMPORTANT: Almost always set shouldSpeak to true so you coach them audibly.

If you truly cannot provide any guidance (silence/gibberish only), respond with: null

## KEY PHRASES TO COACH
When you hear objections, always provide a winning response:
- "Too expensive" → Reframe to value and investment
- "Need to think" → Create gentle urgency, schedule follow-up
- "Not sure" → Ask discovery questions, find the real concern
- "Looking at other options" → Differentiate, highlight unique benefits
- "Bad timing" → Find flexibility, plant seeds for future

You are their secret weapon. Help them WIN every conversation.`;

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type LiveCoachingRouteProp = RouteProp<RootStackParamList, "LiveCoaching">;

export function LiveCoachingScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<LiveCoachingRouteProp>();
  const scrollViewRef = useRef<ScrollView>(null);
  const workspaceInputRef = useRef<TextInput>(null);

  // Get mode from route params
  const mode: NegotiationMode = route.params?.mode || "on-call";

  // Mode-specific flags
  const allowMicrophone = mode !== "writing";
  const isPushToTalk = mode === "on-call";

  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [prompts, setPrompts] = useState<CoachingPrompt[]>([]);
  const [transcribedText, setTranscribedText] = useState("");
  const [sessionDuration, setSessionDuration] = useState(0);
  const [showCallModal, setShowCallModal] = useState(false);
  const [showVideoCallModal, setShowVideoCallModal] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [isDealMemoryExpanded, setIsDealMemoryExpanded] = useState(false);
  const [showContextPicker, setShowContextPicker] = useState(false);

  // Universal Text Workspace state
  const [workspaceText, setWorkspaceText] = useState("");
  const [isPaused, setIsPaused] = useState(false);

  const [chatMessages, setChatMessages] = useState<Array<{
    id: string;
    role: "user" | "assistant";
    content: string;
    timestamp: Date;
    type?: "transcription" | "typed" | "response";
  }>>([]);

  // Deal Memory store (for temporary session memory)
  const getSessionContextForAI = useDealMemoryStore((s) => s.getContextForAI);
  const storedNotesText = useDealMemoryStore((s) => s.memory.notesText);
  const imageUrls = useDealMemoryStore((s) => s.memory.imageUrls);
  const fileUrls = useDealMemoryStore((s) => s.memory.fileUrls);
  const setNotesText = useDealMemoryStore((s) => s.setNotesText);
  const addImageUrl = useDealMemoryStore((s) => s.addImageUrl);
  const addFileUrl = useDealMemoryStore((s) => s.addFileUrl);

  // Prep/Notes panel state - initialize from store
  const [prepNotes, setPrepNotes] = useState(storedNotesText);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const prepScrollViewRef = useRef<ScrollView>(null);

  // Sync prepNotes with store on mount
  useEffect(() => {
    setPrepNotes(storedNotesText);
  }, [storedNotesText]);

  // Panel animation values
  const { height: SCREEN_HEIGHT } = Dimensions.get("window");
  const SNAP_COLLAPSED = 0;
  const SNAP_HALF = SCREEN_HEIGHT * 0.5;
  const SNAP_EXPANDED = SCREEN_HEIGHT * 0.85;

  const panelHeight = useSharedValue(SNAP_COLLAPSED);
  const panelContext = useSharedValue(SNAP_COLLAPSED);

  // Listen for keyboard events to expand panel
  useEffect(() => {
    const keyboardWillShow = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow",
      (e) => {
        setKeyboardHeight(e.endCoordinates.height);
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

    if (Math.abs(velocity) > 500) {
      if (velocity < 0) {
        if (currentHeight < SNAP_HALF) {
          panelHeight.value = withSpring(SNAP_HALF, { damping: 20, stiffness: 200 });
        } else {
          panelHeight.value = withSpring(SNAP_EXPANDED, { damping: 20, stiffness: 200 });
        }
      } else {
        if (currentHeight > SNAP_HALF) {
          panelHeight.value = withSpring(SNAP_HALF, { damping: 20, stiffness: 200 });
        } else {
          panelHeight.value = withSpring(SNAP_COLLAPSED, { damping: 20, stiffness: 200 });
        }
      }
      return;
    }

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
      const newHeight = panelContext.value - event.translationY;
      panelHeight.value = Math.max(SNAP_COLLAPSED, Math.min(SNAP_EXPANDED, newHeight));
    })
    .onEnd((event) => {
      snapToPoint(event.velocityY);
      runOnJS(Haptics.impactAsync)(Haptics.ImpactFeedbackStyle.Light);
    });

  // Toggle panel to half or collapsed
  const togglePrepPanel = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (panelHeight.value < SNAP_HALF / 2) {
      panelHeight.value = withSpring(SNAP_HALF, { damping: 20, stiffness: 200 });
    } else {
      panelHeight.value = withSpring(SNAP_COLLAPSED, { damping: 20, stiffness: 200 });
    }
  };

  // Save notes to deal memory
  const handleNotesChange = (text: string) => {
    setPrepNotes(text);
    setNotesText(text);
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
      console.error("[LiveCoaching] Camera error:", error);
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
      console.error("[LiveCoaching] File pick error:", error);
    }
  };

  // Count items in prep
  const prepItemCount = (prepNotes.trim() ? 1 : 0) + imageUrls.length + fileUrls.length;

  // Deal Context store (for persistent saved contexts)
  const dealContexts = useDealContextStore((s) => s.dealContexts);
  const activeDealContextId = useDealContextStore((s) => s.activeDealContextId);
  const setActiveDealContext = useDealContextStore((s) => s.setActiveDealContext);
  const getDealContextForAI = useDealContextStore((s) => s.getContextForAI);
  const initializeDemoIfNeeded = useDealContextStore((s) => s.initializeDemoIfNeeded);

  // Derive active deal context from state
  const activeDealContext = activeDealContextId
    ? dealContexts.find((ctx) => ctx.id === activeDealContextId) || null
    : null;

  // Initialize demo data on first load if needed
  useEffect(() => {
    initializeDemoIfNeeded();
  }, [initializeDemoIfNeeded]);

  const recordingRef = useRef<Audio.Recording | null>(null);
  const sessionIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const listeningIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isListeningRef = useRef(false);
  const isRecordingInProgressRef = useRef(false);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  const isAppInBackgroundRef = useRef(false);

  // Track app state changes for recording
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      const wasInBackground = appStateRef.current.match(/inactive|background/);
      const isNowActive = nextAppState === "active";

      if (wasInBackground && isNowActive) {
        // App came back to foreground
        isAppInBackgroundRef.current = false;
        // Resume recording if we were listening
        if (isListeningRef.current && !isRecordingInProgressRef.current) {
          startListeningLoop();
        }
      } else if (nextAppState.match(/inactive|background/)) {
        // App went to background
        isAppInBackgroundRef.current = true;
      }

      appStateRef.current = nextAppState;
    };

    const subscription = AppState.addEventListener("change", handleAppStateChange);

    return () => {
      subscription.remove();
    };
  }, []);

  // Animation for listening indicator
  const pulseScale = useSharedValue(1);
  const pulseOpacity = useSharedValue(0.5);

  useEffect(() => {
    if (isListening) {
      pulseScale.value = withRepeat(
        withSequence(
          withTiming(1.3, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
          withTiming(1, { duration: 1000, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        false
      );
      pulseOpacity.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
          withTiming(0.3, { duration: 1000, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        false
      );
    } else {
      pulseScale.value = withTiming(1, { duration: 300 });
      pulseOpacity.value = withTiming(0.5, { duration: 300 });
    }
  }, [isListening]);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
    opacity: pulseOpacity.value,
  }));

  // Session timer
  useEffect(() => {
    if (isListening) {
      sessionIntervalRef.current = setInterval(() => {
        setSessionDuration((prev) => prev + 1);
      }, 1000);
    } else {
      if (sessionIntervalRef.current) {
        clearInterval(sessionIntervalRef.current);
      }
    }

    return () => {
      if (sessionIntervalRef.current) {
        clearInterval(sessionIntervalRef.current);
      }
    };
  }, [isListening]);

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const startListening = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      // Request permissions
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== "granted") {
        addPrompt("context", "Please enable microphone permissions to use live coaching.");
        return;
      }

      setIsListening(true);
      isListeningRef.current = true;
      setSessionDuration(0);

      // Add welcome prompt from The Closing Room Agent (text only, no audio)
      const greeting = getAgentGreeting();
      addPrompt("context", greeting);

      // Start the continuous listening loop immediately (skip speech to avoid audio mode conflict)
      startListeningLoop();
    } catch (error) {
      console.error("[LiveCoaching] Error starting:", error);
      addPrompt("context", "Unable to start listening. Please try again.");
    }
  };

  const cleanupRecording = async () => {
    const recording = recordingRef.current;
    recordingRef.current = null;
    isRecordingInProgressRef.current = false;

    if (recording) {
      try {
        const status = await recording.getStatusAsync();
        if (status.isRecording || status.isDoneRecording) {
          await recording.stopAndUnloadAsync();
        }
      } catch (e) {
        // Recording may already be unloaded, ignore
      }
    }
  };

  const startListeningLoop = async () => {
    // Record for 8 seconds, then process, then repeat
    const recordAndProcess = async () => {
      if (!isListeningRef.current) return;

      // Don't try to record if app is in background
      if (isAppInBackgroundRef.current) {
        // Will be resumed when app comes back to foreground via AppState listener
        isRecordingInProgressRef.current = false;
        return;
      }

      // Prevent concurrent recording attempts
      if (isRecordingInProgressRef.current) {
        // Wait and retry
        await new Promise((resolve) => setTimeout(resolve, 500));
        if (isListeningRef.current) {
          recordAndProcess();
        }
        return;
      }

      isRecordingInProgressRef.current = true;

      try {
        // Clean up any existing recording first
        if (recordingRef.current) {
          try {
            const status = await recordingRef.current.getStatusAsync();
            if (status.isRecording || status.isDoneRecording) {
              await recordingRef.current.stopAndUnloadAsync();
            }
          } catch (e) {
            // Ignore cleanup errors - recording may already be unloaded
          }
          recordingRef.current = null;
        }

        // Small delay to ensure previous recording is fully released
        await new Promise((resolve) => setTimeout(resolve, 100));

        // Check again if app went to background during cleanup
        if (isAppInBackgroundRef.current) {
          isRecordingInProgressRef.current = false;
          return;
        }

        // Ensure audio mode is set before each recording
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: true,
          playsInSilentModeIOS: true,
        });

        // Use createAsync which is more reliable than manual prepare/start
        const { recording } = await Audio.Recording.createAsync(
          Audio.RecordingOptionsPresets.HIGH_QUALITY
        );
        recordingRef.current = recording;

        // Record for 8 seconds
        await new Promise((resolve) => setTimeout(resolve, 8000));

        if (!isListeningRef.current) {
          await cleanupRecording();
          return;
        }

        // Stop and get URI - check status first to avoid double-unload
        let uri: string | null = null;
        try {
          const status = await recording.getStatusAsync();
          if (status.isRecording || status.isDoneRecording) {
            await recording.stopAndUnloadAsync();
          }
          uri = recording.getURI();
        } catch (e) {
          // Recording may have been interrupted, try to get URI anyway
          uri = recording.getURI();
        }
        recordingRef.current = null;
        isRecordingInProgressRef.current = false;

        if (uri) {
          setIsProcessing(true);
          await processAudio(uri);
          setIsProcessing(false);
        }

        // Continue listening if still active and app is in foreground
        if (isListeningRef.current && !isAppInBackgroundRef.current) {
          recordAndProcess();
        }
      } catch (error: any) {
        // Suppress "already unloaded" errors - these are expected during cleanup
        const isUnloadError = error?.message?.includes("already been unloaded");
        if (!isUnloadError) {
          console.error("[LiveCoaching] Recording error:", error);
        }
        // Always try to cleanup on error
        await cleanupRecording();

        // Check if error is due to background state
        const isBackgroundError =
          error?.message?.includes("background") ||
          error?.toString()?.includes("background");

        if (isListeningRef.current) {
          if (isBackgroundError || isAppInBackgroundRef.current) {
            // Don't retry - AppState listener will resume when app comes back
            return;
          }
          // Longer delay before retry to ensure cleanup is complete
          await new Promise((resolve) => setTimeout(resolve, 2000));
          recordAndProcess();
        }
      }
    };

    recordAndProcess();
  };

  const processAudio = async (uri: string) => {
    try {
      // Transcribe the audio
      const transcription = await transcribeAudio(uri);

      if (!transcription || transcription.trim().length < 5) {
        return; // Skip if no meaningful speech
      }

      setTranscribedText(transcription);

      // Get coaching response from AI
      const response = await getCoachingResponse(transcription);

      if (response) {
        addPrompt(response.type, response.content, response.usedDealContext);
        // NOTE: No voice output on this screen - text-only guidance
        // User is on a live call, AI speaking would interfere
      }
    } catch (error) {
      console.error("[LiveCoaching] Processing error:", error);
    }
  };

  const getCoachingResponse = async (
    transcription: string
  ): Promise<{ type: CoachingPrompt["type"]; content: string; shouldSpeak: boolean; usedDealContext?: boolean } | null> => {
    const apiKey = process.env.EXPO_PUBLIC_VIBECODE_ANTHROPIC_API_KEY;
    if (!apiKey) return null;

    // Get Deal Context (persistent) + Deal Memory (session) for AI
    const dealContextForAI = getDealContextForAI();
    const sessionMemoryContext = getSessionContextForAI();
    const combinedContext = dealContextForAI + sessionMemoryContext;

    try {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 350,
          system: COACHING_SYSTEM_PROMPT + combinedContext,
          messages: [
            {
              role: "user",
              content: `I'm in a real estate negotiation and just said or heard this:\n\n"${transcription}"\n\nCoach me - what should I say or do next to close this deal?`,
            },
          ],
        }),
      });

      if (!response.ok) return null;

      const data = await response.json();
      const text = data.content?.[0]?.text;

      if (!text || text === "null") return null;

      try {
        return JSON.parse(text);
      } catch {
        // If not valid JSON, create a context prompt
        return { type: "context" as const, content: text, shouldSpeak: false };
      }
    } catch (error) {
      console.error("[LiveCoaching] AI error:", error);
      return null;
    }
  };

  const addPrompt = (type: CoachingPrompt["type"], content: string, usedDealContext?: boolean) => {
    // Don't add if paused
    if (isPaused) return;

    const newPrompt: CoachingPrompt = {
      id: Date.now().toString(),
      type,
      content,
      timestamp: new Date(),
      usedDealContext,
    };
    setPrompts((prev) => [...prev, newPrompt]);

    // Also add to chat messages for the chat window
    setChatMessages((prev) => [
      ...prev,
      {
        id: Date.now().toString() + "-chat",
        role: "assistant" as const,
        content,
        timestamp: new Date(),
        type: "response" as const,
      },
    ]);

    // Add to workspace text (append with separator)
    setWorkspaceText((prev) => {
      const separator = prev.trim() ? "\n\n---\n\n" : "";
      return prev + separator + content;
    });

    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  // Toolbar handlers
  const handlePause = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsPaused(!isPaused);
  };

  const handleRecenter = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    // Clear AI context but keep workspace text
    setPrompts([]);
    setChatMessages([]);
    setTranscribedText("");
  };

  const handleClear = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setWorkspaceText("");
  };

  const getModeTitle = () => {
    switch (mode) {
      case "on-call":
        return "On a Call";
      case "in-person":
        return "In Person";
      case "writing":
        return "Writing Mode";
      default:
        return "Negotiation";
    }
  };

  const getModeColor = () => {
    switch (mode) {
      case "on-call":
        return "#10B981";
      case "in-person":
        return "#3B82F6";
      case "writing":
        return "#A855F7";
      default:
        return "#FFB800";
    }
  };

  const stopListening = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsListening(false);
    isListeningRef.current = false;
    stopSpeaking();

    await cleanupRecording();

    addPrompt("reassurance", "Coaching session ended. Great work!");
  };

  const handleMakeCall = () => {
    if (phoneNumber.trim()) {
      const cleanNumber = phoneNumber.replace(/[^0-9]/g, "");
      Linking.openURL(`tel:${cleanNumber}`);
      setShowCallModal(false);
      setPhoneNumber("");
    }
  };

  // Check if input is valid (email or 10+ digit phone)
  const isValidContactInput = (input: string) => {
    const trimmed = input.trim();
    if (trimmed.includes("@")) {
      // Basic email validation
      return trimmed.includes("@") && trimmed.includes(".");
    }
    // Phone number validation
    return trimmed.replace(/[^\d]/g, "").length >= 10;
  };

  const handleMakeVideoCall = async () => {
    if (phoneNumber.trim()) {
      const input = phoneNumber.trim();
      const isEmail = input.includes("@");
      const cleanContact = isEmail ? input : input.replace(/[^0-9]/g, "");

      try {
        const facetimeUrl = `facetime:${cleanContact}`;
        const canOpen = await Linking.canOpenURL(facetimeUrl);
        if (canOpen) {
          await Linking.openURL(facetimeUrl);
        } else if (!isEmail) {
          // Fallback to regular call only for phone numbers
          Linking.openURL(`tel:${cleanContact}`);
        }
      } catch (error) {
        if (!isEmail) {
          // Fallback to regular call only for phone numbers
          Linking.openURL(`tel:${cleanContact}`);
        }
      }
      setShowVideoCallModal(false);
      setPhoneNumber("");
    }
  };

  // Chat window handlers
  const handleChatSendMessage = async (text: string) => {
    // Add user message to chat
    setChatMessages((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        role: "user" as const,
        content: text,
        timestamp: new Date(),
        type: "typed" as const,
      },
    ]);

    // Get AI response
    const response = await getCoachingResponse(text);
    if (response) {
      addPrompt(response.type, response.content, response.usedDealContext);
      // NOTE: No voice output on this screen - text-only guidance
    }
  };

  const handleChatAddImage = (uri: string) => {
    const addImageUrl = useDealMemoryStore.getState().addImageUrl;
    addImageUrl(uri);
  };

  const handleChatAddFile = (uri: string) => {
    const addFileUrl = useDealMemoryStore.getState().addFileUrl;
    addFileUrl(uri);
  };

  const getPromptIcon = (type: CoachingPrompt["type"]) => {
    switch (type) {
      case "urgent":
        return "alert-circle";
      case "strategy":
        return "bulb";
      case "watch":
        return "eye";
      case "say":
        return "chatbubble-ellipses";
      case "context":
        return "information-circle";
      case "reassurance":
        return "heart";
      default:
        return "chatbubble";
    }
  };

  const getPromptColor = (type: CoachingPrompt["type"]) => {
    switch (type) {
      case "urgent":
        return "#EF4444"; // Red
      case "strategy":
        return "#F97316"; // Orange
      case "watch":
        return "#EAB308"; // Yellow
      case "say":
        return "#22C55E"; // Green
      case "context":
        return "#3B82F6"; // Blue
      case "reassurance":
        return "#A855F7"; // Purple
      default:
        return "#9CA3AF";
    }
  };

  const getPromptLabel = (type: CoachingPrompt["type"]) => {
    switch (type) {
      case "urgent":
        return "URGENT";
      case "strategy":
        return "STRATEGY";
      case "watch":
        return "WATCH";
      case "say":
        return "WHAT TO SAY";
      case "context":
        return "CONTEXT";
      case "reassurance":
        return "REASSURANCE";
      default:
        return "";
    }
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View className="flex-1 bg-[#0A0A0F]">
        <LinearGradient
          colors={["#0A0A0F", "#0F0F1A", "#0A0A0F"]}
          style={{ flex: 1 }}
        >
        {/* Header - Clean, minimal */}
        <View
          style={{ paddingTop: insets.top + 8 }}
          className="px-5 pb-3"
        >
          <View className="flex-row items-center justify-between">
            <Pressable
              onPress={() => {
                if (isListening) stopListening();
                navigation.goBack();
              }}
              className="w-10 h-10 rounded-full bg-white/5 items-center justify-center"
            >
              <Ionicons name="chevron-back" size={22} color="rgba(255, 255, 255, 0.6)" />
            </Pressable>

            <View className="items-center flex-1 mx-4">
              <View className="flex-row items-center">
                <View
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: 4,
                    backgroundColor: isPaused ? "rgba(255, 184, 0, 0.5)" : getModeColor(),
                    marginRight: 8,
                  }}
                />
                <Text style={{ color: getModeColor() }} className="text-sm font-semibold">
                  {getModeTitle()}
                </Text>
                {isListening && (
                  <Text className="text-white/40 text-xs ml-2">
                    — {formatDuration(sessionDuration)}
                  </Text>
                )}
              </View>
              {isPaused && (
                <Text className="text-yellow-500/70 text-xs mt-1">PAUSED</Text>
              )}
            </View>

            {/* Right side buttons */}
            <View className="flex-row items-center">
              {/* Home button - go to Dashboard */}
              <Pressable
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  if (isListening) stopListening();
                  navigation.navigate("Dashboard");
                }}
                className="w-10 h-10 rounded-full bg-white/5 items-center justify-center mr-2"
              >
                <Ionicons name="grid" size={18} color="rgba(212, 175, 55, 0.8)" />
              </Pressable>
              {/* Info button - reveals help */}
              <Pressable
                onPress={() => setShowHelpModal(true)}
                className="w-10 h-10 rounded-full bg-white/5 items-center justify-center"
              >
                <Ionicons name="help-circle-outline" size={20} color="rgba(255, 255, 255, 0.4)" />
              </Pressable>
            </View>
          </View>
        </View>

        {/* Optional: Deal Context - Compact, non-blocking */}
        {!isListening && (
          <View className="px-5 py-2">
            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setShowContextPicker(true);
              }}
              style={{
                flexDirection: "row",
                alignItems: "center",
                backgroundColor: activeDealContext ? "rgba(0, 212, 255, 0.08)" : "rgba(255, 255, 255, 0.03)",
                borderWidth: 1,
                borderColor: activeDealContext ? "rgba(0, 212, 255, 0.2)" : "rgba(255, 255, 255, 0.06)",
                borderRadius: 10,
                paddingHorizontal: 12,
                paddingVertical: 10,
              }}
            >
              <Ionicons
                name={activeDealContext ? "folder" : "folder-outline"}
                size={16}
                color={activeDealContext ? "#00D4FF" : "rgba(255, 255, 255, 0.4)"}
              />
              <Text
                numberOfLines={1}
                style={{
                  color: activeDealContext ? "#00D4FF" : "rgba(255, 255, 255, 0.4)",
                  fontSize: 13,
                  marginLeft: 8,
                  flex: 1,
                }}
              >
                {activeDealContext ? activeDealContext.dealName : "Optional: Select deal context"}
              </Text>
              <Ionicons name="chevron-down" size={16} color="rgba(255, 255, 255, 0.3)" />
            </Pressable>
          </View>
        )}

        {/* Deal Memory Panel - Collapsed by default, optional */}
        {!isListening && (
          <DealMemoryPanel
            isExpanded={isDealMemoryExpanded}
            onToggle={() => setIsDealMemoryExpanded(!isDealMemoryExpanded)}
          />
        )}

        {/* Main Content */}
        <ScrollView
          ref={scrollViewRef}
          className="flex-1"
          contentContainerStyle={{ padding: 20, paddingBottom: 220 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Ready State - Clean cockpit view */}
          {prompts.length === 0 && !isListening && (
            <Animated.View entering={FadeInUp.delay(100)}>
              {/* Status indicator */}
              <View className="items-center mb-8 mt-4">
                <View
                  style={{
                    width: 12,
                    height: 12,
                    borderRadius: 6,
                    backgroundColor: "rgba(255, 184, 0, 0.3)",
                    marginBottom: 8,
                  }}
                />
                <Text className="text-white/40 text-xs uppercase tracking-widest">
                  Ready
                </Text>
              </View>

              {/* Quick context if deal selected */}
              {activeDealContext && (
                <View
                  style={{
                    backgroundColor: "rgba(0, 212, 255, 0.06)",
                    borderRadius: 12,
                    padding: 14,
                    marginBottom: 16,
                    borderWidth: 1,
                    borderColor: "rgba(0, 212, 255, 0.15)",
                  }}
                >
                  <View className="flex-row items-center">
                    <Ionicons name="checkmark-circle" size={14} color="#00D4FF" />
                    <Text style={{ color: "#00D4FF", fontSize: 12, marginLeft: 6, fontWeight: "500" }}>
                      Context loaded
                    </Text>
                  </View>
                  <Text className="text-white/50 text-xs mt-1" numberOfLines={1}>
                    {activeDealContext.dealName}
                  </Text>
                </View>
              )}
            </Animated.View>
          )}

          {/* Coaching Prompts */}
          {prompts.map((prompt, index) => {
            const isUrgent = prompt.type === "urgent";
            return (
              <Animated.View
                key={prompt.id}
                entering={FadeInUp.delay(50)}
                className="mb-3"
              >
                <View
                  style={{
                    backgroundColor: isUrgent ? `${getPromptColor(prompt.type)}25` : `${getPromptColor(prompt.type)}15`,
                    borderLeftWidth: isUrgent ? 4 : 3,
                    borderLeftColor: getPromptColor(prompt.type),
                    borderWidth: isUrgent ? 1 : 0,
                    borderColor: isUrgent ? `${getPromptColor(prompt.type)}50` : "transparent",
                    shadowColor: isUrgent ? getPromptColor(prompt.type) : "transparent",
                    shadowOffset: { width: 0, height: 0 },
                    shadowOpacity: isUrgent ? 0.5 : 0,
                    shadowRadius: isUrgent ? 10 : 0,
                  }}
                  className="rounded-xl p-3"
                >
                  {/* Compact header with label and time */}
                  <View className="flex-row items-center justify-between mb-1">
                    <View className="flex-row items-center">
                      <Ionicons
                        name={getPromptIcon(prompt.type) as any}
                        size={14}
                        color={getPromptColor(prompt.type)}
                      />
                      <Text
                        style={{ color: getPromptColor(prompt.type) }}
                        className="text-xs font-bold ml-1"
                      >
                        {getPromptLabel(prompt.type)}
                      </Text>
                      {/* Deal Context Used label - subtle indicator */}
                      {prompt.usedDealContext && (
                        <View
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            backgroundColor: "rgba(0, 212, 255, 0.15)",
                            paddingHorizontal: 6,
                            paddingVertical: 2,
                            borderRadius: 4,
                            marginLeft: 8,
                          }}
                        >
                          <Ionicons name="folder" size={10} color="#00D4FF" />
                          <Text style={{ color: "#00D4FF", fontSize: 9, marginLeft: 3, fontWeight: "500" }}>
                            Deal Context Used
                          </Text>
                        </View>
                      )}
                    </View>
                    <Text className="text-white/30 text-xs">
                      {prompt.timestamp.toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </Text>
                  </View>
                  {/* Content */}
                  <Text
                    selectable={true}
                    style={{ fontSize: isUrgent ? 15 : 14 }}
                    className={`text-white leading-5 ${isUrgent ? "font-medium" : ""}`}
                  >
                    {prompt.content}
                  </Text>
                </View>
              </Animated.View>
            );
          })}

          {/* Processing Indicator */}
          {isProcessing && (
            <Animated.View entering={FadeIn} className="items-center py-4">
              <ActivityIndicator color="#FFB800" />
              <Text className="text-white/50 text-xs mt-2">Processing...</Text>
            </Animated.View>
          )}

          {/* Last Transcription */}
          {transcribedText && isListening && (
            <View className="bg-white/5 rounded-xl p-3 mt-2">
              <Text className="text-white/40 text-xs mb-1">Last heard:</Text>
              <Text selectable={true} className="text-white/60 text-sm italic">{`"${transcribedText}"`}</Text>
            </View>
          )}

          {/* Universal Text Workspace */}
          <View
            style={{
              backgroundColor: "rgba(255, 255, 255, 0.03)",
              borderRadius: 16,
              borderWidth: 1,
              borderColor: `${getModeColor()}30`,
              marginTop: 16,
              minHeight: 150,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                paddingHorizontal: 14,
                paddingVertical: 10,
                borderBottomWidth: 1,
                borderBottomColor: "rgba(255, 255, 255, 0.06)",
              }}
            >
              <Text style={{ color: "rgba(255, 255, 255, 0.5)", fontSize: 12, fontWeight: "600" }}>
                WORKSPACE
              </Text>
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                {workspaceText.length > 0 && (
                  <Text style={{ color: "rgba(255, 255, 255, 0.3)", fontSize: 10, marginRight: 8 }}>
                    {workspaceText.length} chars
                  </Text>
                )}
              </View>
            </View>
            <TextInput
              ref={workspaceInputRef}
              value={workspaceText}
              onChangeText={setWorkspaceText}
              placeholder="AI guidance appears here. Tap to edit, copy, or paste..."
              placeholderTextColor="rgba(255, 255, 255, 0.25)"
              multiline
              textAlignVertical="top"
              style={{
                color: "#FFFFFF",
                fontSize: 15,
                lineHeight: 22,
                padding: 14,
                minHeight: 100,
                maxHeight: 200,
              }}
            />
          </View>
        </ScrollView>

        {/* Bottom Controls - Toolbar + Optional Mic */}
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          keyboardVerticalOffset={0}
        >
          <View
            style={{
              paddingBottom: insets.bottom + 70,
              paddingTop: 12,
              paddingHorizontal: 16,
              backgroundColor: "rgba(10, 10, 15, 0.98)",
              borderTopWidth: 1,
              borderTopColor: "rgba(255, 255, 255, 0.06)",
            }}
          >
            {/* Toolbar */}
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-around",
                marginBottom: allowMicrophone ? 16 : 0,
              }}
            >
              {/* Pause */}
              <Pressable
                onPress={handlePause}
                style={{
                  alignItems: "center",
                  paddingVertical: 8,
                  paddingHorizontal: 12,
                  backgroundColor: isPaused ? "rgba(255, 184, 0, 0.15)" : "rgba(255, 255, 255, 0.05)",
                  borderRadius: 10,
                  borderWidth: 1,
                  borderColor: isPaused ? "rgba(255, 184, 0, 0.3)" : "rgba(255, 255, 255, 0.08)",
                }}
              >
                <Ionicons
                  name={isPaused ? "play" : "pause"}
                  size={18}
                  color={isPaused ? "#FFB800" : "rgba(255, 255, 255, 0.6)"}
                />
                <Text
                  style={{
                    color: isPaused ? "#FFB800" : "rgba(255, 255, 255, 0.5)",
                    fontSize: 10,
                    marginTop: 4,
                    fontWeight: "500",
                  }}
                >
                  {isPaused ? "Resume" : "Pause"}
                </Text>
              </Pressable>

              {/* Re-Center */}
              <Pressable
                onPress={handleRecenter}
                style={{
                  alignItems: "center",
                  paddingVertical: 8,
                  paddingHorizontal: 12,
                  backgroundColor: "rgba(255, 255, 255, 0.05)",
                  borderRadius: 10,
                  borderWidth: 1,
                  borderColor: "rgba(255, 255, 255, 0.08)",
                }}
              >
                <Ionicons name="refresh" size={18} color="rgba(255, 255, 255, 0.6)" />
                <Text style={{ color: "rgba(255, 255, 255, 0.5)", fontSize: 10, marginTop: 4, fontWeight: "500" }}>
                  Re-Center
                </Text>
              </Pressable>

              {/* Clear */}
              <Pressable
                onPress={handleClear}
                style={{
                  alignItems: "center",
                  paddingVertical: 8,
                  paddingHorizontal: 12,
                  backgroundColor: "rgba(255, 255, 255, 0.05)",
                  borderRadius: 10,
                  borderWidth: 1,
                  borderColor: "rgba(255, 255, 255, 0.08)",
                }}
              >
                <Ionicons name="trash-outline" size={18} color="rgba(255, 255, 255, 0.6)" />
                <Text style={{ color: "rgba(255, 255, 255, 0.5)", fontSize: 10, marginTop: 4, fontWeight: "500" }}>
                  Clear
                </Text>
              </Pressable>

              {/* Call - only on call mode */}
              {mode === "on-call" && (
                <Pressable
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setShowCallModal(true);
                  }}
                  style={{
                    alignItems: "center",
                    paddingVertical: 8,
                    paddingHorizontal: 12,
                    backgroundColor: "rgba(52, 211, 153, 0.1)",
                    borderRadius: 10,
                    borderWidth: 1,
                    borderColor: "rgba(52, 211, 153, 0.2)",
                  }}
                >
                  <Ionicons name="call" size={18} color="#34D399" />
                  <Text style={{ color: "#34D399", fontSize: 10, marginTop: 4, fontWeight: "500" }}>
                    Call
                  </Text>
                </Pressable>
              )}

              {/* Video Call - only on call mode */}
              {mode === "on-call" && (
                <Pressable
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setShowVideoCallModal(true);
                  }}
                  style={{
                    alignItems: "center",
                    paddingVertical: 8,
                    paddingHorizontal: 12,
                    backgroundColor: "rgba(16, 185, 129, 0.1)",
                    borderRadius: 10,
                    borderWidth: 1,
                    borderColor: "rgba(16, 185, 129, 0.2)",
                  }}
                >
                  <Ionicons name="videocam" size={18} color="#10B981" />
                  <Text style={{ color: "#10B981", fontSize: 10, marginTop: 4, fontWeight: "500" }}>
                    Video
                  </Text>
                </Pressable>
              )}
            </View>

            {/* Microphone - only for modes that allow it */}
            {allowMicrophone && (
              <View style={{ alignItems: "center" }}>
                <Pressable
                  onPress={isListening ? stopListening : startListening}
                  style={{ alignItems: "center" }}
                >
                  {/* Pulse Ring when active */}
                  {isListening && (
                    <Animated.View
                      style={[
                        pulseStyle,
                        {
                          position: "absolute",
                          width: 80,
                          height: 80,
                          borderRadius: 40,
                          backgroundColor: `${getModeColor()}30`,
                        },
                      ]}
                    />
                  )}

                  {/* Mic Button */}
                  <View
                    style={{
                      backgroundColor: isListening ? getModeColor() : "rgba(255, 255, 255, 0.1)",
                      width: 64,
                      height: 64,
                      borderRadius: 32,
                      alignItems: "center",
                      justifyContent: "center",
                      borderWidth: isListening ? 0 : 1,
                      borderColor: "rgba(255, 255, 255, 0.15)",
                    }}
                  >
                    <Ionicons
                      name={isListening ? "stop" : "mic"}
                      size={28}
                      color={isListening ? "#000000" : "rgba(255, 255, 255, 0.7)"}
                    />
                  </View>

                  <Text
                    style={{
                      color: isListening ? getModeColor() : "rgba(255, 255, 255, 0.5)",
                      fontSize: 12,
                      fontWeight: "600",
                      marginTop: 8,
                    }}
                  >
                    {isListening ? "Tap to Stop" : isPushToTalk ? "Push to Talk" : "Tap to Listen"}
                  </Text>
                  {!isListening && isPushToTalk && (
                    <Text style={{ color: "rgba(255, 255, 255, 0.3)", fontSize: 10, marginTop: 2 }}>
                      Optional - AI works without mic
                    </Text>
                  )}
                </Pressable>
              </View>
            )}

            {/* Writing mode - no mic, just info text */}
            {!allowMicrophone && (
              <View style={{ alignItems: "center", paddingVertical: 8 }}>
                <Text style={{ color: "rgba(255, 255, 255, 0.4)", fontSize: 12 }}>
                  Type or paste text above to get AI guidance
                </Text>
              </View>
            )}
          </View>
        </KeyboardAvoidingView>

        {/* Call Modal */}
        <Modal
          visible={showCallModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowCallModal(false)}
        >
          <Pressable
            className="flex-1 bg-black/70 justify-center items-center px-6"
            onPress={() => setShowCallModal(false)}
          >
            <Pressable
              onPress={(e) => e.stopPropagation()}
              className="bg-[#1A1A2E] w-full rounded-2xl p-6 border border-white/10"
            >
              <View className="flex-row items-center mb-4">
                <View className="w-12 h-12 rounded-full bg-emerald-500/20 items-center justify-center mr-3">
                  <Ionicons name="call" size={24} color="#34D399" />
                </View>
                <View>
                  <Text className="text-white text-lg font-semibold">Make a Call</Text>
                  <Text className="text-white/50 text-sm">Keep this app open on speaker</Text>
                </View>
              </View>

              <TextInput
                value={phoneNumber}
                onChangeText={setPhoneNumber}
                placeholder="Enter phone number"
                placeholderTextColor="rgba(255,255,255,0.3)"
                keyboardType="phone-pad"
                className="bg-white/10 rounded-xl px-4 py-4 text-white text-lg mb-4 border border-white/10"
              />

              <View className="flex-row space-x-3">
                <Pressable
                  onPress={() => setShowCallModal(false)}
                  className="flex-1 bg-white/10 rounded-xl py-4 items-center"
                >
                  <Text className="text-white font-semibold">Cancel</Text>
                </Pressable>
                <Pressable
                  onPress={handleMakeCall}
                  className="flex-1 bg-emerald-500 rounded-xl py-4 items-center"
                >
                  <Text className="text-black font-semibold">Call</Text>
                </Pressable>
              </View>

              <Text className="text-white/40 text-xs text-center mt-4">
                Put your phone on speaker and return to this screen to see AI coaching prompts
              </Text>
            </Pressable>
          </Pressable>
        </Modal>

        {/* Video Call Modal */}
        <Modal
          visible={showVideoCallModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowVideoCallModal(false)}
        >
          <Pressable
            className="flex-1 bg-black/70 justify-center items-center px-6"
            onPress={() => setShowVideoCallModal(false)}
          >
            <Pressable
              onPress={(e) => e.stopPropagation()}
              className="bg-[#1A1A2E] w-full rounded-2xl p-6 border border-emerald-500/20"
            >
              <View className="flex-row items-center mb-4">
                <View className="w-12 h-12 rounded-full bg-emerald-500/20 items-center justify-center mr-3">
                  <Ionicons name="videocam" size={24} color="#10B981" />
                </View>
                <View>
                  <Text className="text-white text-lg font-semibold">FaceTime Video Call</Text>
                  <Text className="text-white/50 text-sm">Enter phone number or email</Text>
                </View>
              </View>

              <TextInput
                value={phoneNumber}
                onChangeText={setPhoneNumber}
                placeholder="Phone or email"
                placeholderTextColor="rgba(255,255,255,0.3)"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                className="bg-white/10 rounded-xl px-4 py-4 text-white text-lg mb-4 border border-white/10"
              />

              <View className="flex-row space-x-3">
                <Pressable
                  onPress={() => {
                    setShowVideoCallModal(false);
                    setPhoneNumber("");
                  }}
                  className="flex-1 bg-white/10 rounded-xl py-4 items-center"
                >
                  <Text className="text-white font-semibold">Cancel</Text>
                </Pressable>
                <Pressable
                  onPress={handleMakeVideoCall}
                  style={{
                    flex: 1,
                    backgroundColor: isValidContactInput(phoneNumber) ? "#10B981" : "rgba(16, 185, 129, 0.3)",
                    borderRadius: 12,
                    paddingVertical: 16,
                    alignItems: "center",
                  }}
                >
                  <Text
                    style={{
                      color: isValidContactInput(phoneNumber) ? "#000000" : "rgba(255, 255, 255, 0.4)",
                      fontWeight: "600",
                    }}
                  >
                    FaceTime
                  </Text>
                </Pressable>
              </View>

              <Text className="text-white/40 text-xs text-center mt-4">
                Keep this app visible during your video call
              </Text>
            </Pressable>
          </Pressable>
        </Modal>

        {/* Context Picker Modal */}
        <Modal
          visible={showContextPicker}
          transparent
          animationType="fade"
          onRequestClose={() => setShowContextPicker(false)}
        >
          <Pressable
            className="flex-1 bg-black/70 justify-end"
            onPress={() => setShowContextPicker(false)}
          >
            <Pressable
              onPress={(e) => e.stopPropagation()}
              style={{
                backgroundColor: "#1A1A2E",
                borderTopLeftRadius: 24,
                borderTopRightRadius: 24,
                paddingTop: 16,
                paddingBottom: insets.bottom + 20,
                paddingHorizontal: 20,
                maxHeight: "70%",
              }}
            >
              {/* Handle Bar */}
              <View className="items-center mb-4">
                <View className="w-10 h-1 rounded-full bg-white/20" />
              </View>

              <Text className="text-white text-lg font-bold mb-1">Select Deal Context</Text>
              <Text className="text-white/50 text-sm mb-4">
                Choose a saved deal to use during this session
              </Text>

              <ScrollView style={{ maxHeight: 350 }} showsVerticalScrollIndicator={false}>
                {/* None Option */}
                <Pressable
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setActiveDealContext(null);
                    setShowContextPicker(false);
                  }}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    backgroundColor: !activeDealContextId ? "rgba(255, 255, 255, 0.1)" : "rgba(255, 255, 255, 0.03)",
                    borderWidth: 1,
                    borderColor: !activeDealContextId ? "rgba(255, 255, 255, 0.2)" : "rgba(255, 255, 255, 0.05)",
                    borderRadius: 12,
                    padding: 14,
                    marginBottom: 10,
                  }}
                >
                  <View className="w-10 h-10 rounded-full bg-white/10 items-center justify-center mr-3">
                    <Ionicons name="close" size={20} color="rgba(255, 255, 255, 0.5)" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text className="text-white font-medium">None</Text>
                    <Text className="text-white/50 text-xs">No deal context selected</Text>
                  </View>
                  {!activeDealContextId && (
                    <Ionicons name="checkmark-circle" size={22} color="#10B981" />
                  )}
                </Pressable>

                {/* Saved Contexts */}
                {dealContexts.map((ctx) => (
                  <Pressable
                    key={ctx.id}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setActiveDealContext(ctx.id);
                      setShowContextPicker(false);
                    }}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      backgroundColor: activeDealContextId === ctx.id ? "rgba(0, 212, 255, 0.15)" : "rgba(255, 255, 255, 0.03)",
                      borderWidth: 1,
                      borderColor: activeDealContextId === ctx.id ? "rgba(0, 212, 255, 0.3)" : ctx.isDemo ? "rgba(168, 85, 247, 0.3)" : "rgba(255, 255, 255, 0.05)",
                      borderRadius: 12,
                      padding: 14,
                      marginBottom: 10,
                    }}
                  >
                    <View
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: 20,
                        backgroundColor: ctx.isDemo ? "rgba(168, 85, 247, 0.2)" : "rgba(0, 212, 255, 0.2)",
                        alignItems: "center",
                        justifyContent: "center",
                        marginRight: 12,
                      }}
                    >
                      <Ionicons name={ctx.isDemo ? "flask" : "folder"} size={20} color={ctx.isDemo ? "#A855F7" : "#00D4FF"} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: "row", alignItems: "center" }}>
                        <Text className="text-white font-medium" numberOfLines={1} style={{ flex: 1 }}>
                          {ctx.dealName}
                        </Text>
                        {ctx.isDemo && (
                          <View
                            style={{
                              backgroundColor: "rgba(168, 85, 247, 0.2)",
                              paddingHorizontal: 6,
                              paddingVertical: 2,
                              borderRadius: 4,
                              marginLeft: 6,
                            }}
                          >
                            <Text style={{ color: "#A855F7", fontSize: 9, fontWeight: "600" }}>DEMO</Text>
                          </View>
                        )}
                      </View>
                      {ctx.address ? (
                        <Text className="text-white/50 text-xs" numberOfLines={1}>
                          {ctx.address}
                        </Text>
                      ) : null}
                      {ctx.isDemo && (
                        <Text style={{ color: "rgba(168, 85, 247, 0.7)", fontSize: 10, marginTop: 2 }}>
                          Example data — try it or replace with yours
                        </Text>
                      )}
                    </View>
                    {activeDealContextId === ctx.id && (
                      <Ionicons name="checkmark-circle" size={22} color="#00D4FF" />
                    )}
                  </Pressable>
                ))}

                {/* No contexts message */}
                {dealContexts.length === 0 && (
                  <View className="items-center py-6">
                    <Ionicons name="folder-open-outline" size={40} color="rgba(255, 255, 255, 0.2)" />
                    <Text className="text-white/40 text-sm mt-3">No saved deal contexts</Text>
                    <Pressable
                      onPress={() => {
                        setShowContextPicker(false);
                        navigation.navigate("DealContextMemory");
                      }}
                      className="mt-3 bg-amber-500/20 px-4 py-2 rounded-full"
                    >
                      <Text className="text-amber-400 font-medium">Add Your First Context</Text>
                    </Pressable>
                  </View>
                )}
              </ScrollView>

              {/* Add New Button */}
              {dealContexts.length > 0 && (
                <Pressable
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setShowContextPicker(false);
                    navigation.navigate("DealContextMemory");
                  }}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: "rgba(255, 184, 0, 0.15)",
                    borderWidth: 1,
                    borderColor: "rgba(255, 184, 0, 0.3)",
                    borderRadius: 12,
                    paddingVertical: 14,
                    marginTop: 10,
                  }}
                >
                  <Ionicons name="add" size={20} color="#FFB800" />
                  <Text style={{ color: "#FFB800", fontSize: 15, fontWeight: "600", marginLeft: 8 }}>
                    Add New Context
                  </Text>
                </Pressable>
              )}
            </Pressable>
          </Pressable>
        </Modal>

        {/* Help Modal - Collapsed instructional content */}
        <Modal
          visible={showHelpModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowHelpModal(false)}
        >
          <Pressable
            className="flex-1 bg-black/70 justify-center items-center px-6"
            onPress={() => setShowHelpModal(false)}
          >
            <Pressable
              onPress={(e) => e.stopPropagation()}
              style={{
                backgroundColor: "#1A1A2E",
                width: "100%",
                borderRadius: 20,
                padding: 24,
                borderWidth: 1,
                borderColor: "rgba(255, 255, 255, 0.1)",
                maxHeight: "80%",
              }}
            >
              <View className="flex-row items-center justify-between mb-4">
                <Text className="text-white text-lg font-bold">How It Works</Text>
                <Pressable onPress={() => setShowHelpModal(false)}>
                  <Ionicons name="close" size={24} color="rgba(255, 255, 255, 0.5)" />
                </Pressable>
              </View>

              <ScrollView showsVerticalScrollIndicator={false}>
                {/* Steps */}
                <View style={{ marginBottom: 20 }}>
                  <View className="flex-row items-start mb-3">
                    <View
                      style={{
                        width: 24,
                        height: 24,
                        borderRadius: 12,
                        backgroundColor: "rgba(255, 184, 0, 0.2)",
                        alignItems: "center",
                        justifyContent: "center",
                        marginRight: 12,
                      }}
                    >
                      <Text style={{ color: "#FFB800", fontSize: 12, fontWeight: "700" }}>1</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text className="text-white font-semibold">Tap Start</Text>
                      <Text className="text-white/50 text-sm">Recording and AI guidance begins</Text>
                    </View>
                  </View>

                  <View className="flex-row items-start mb-3">
                    <View
                      style={{
                        width: 24,
                        height: 24,
                        borderRadius: 12,
                        backgroundColor: "rgba(255, 184, 0, 0.2)",
                        alignItems: "center",
                        justifyContent: "center",
                        marginRight: 12,
                      }}
                    >
                      <Text style={{ color: "#FFB800", fontSize: 12, fontWeight: "700" }}>2</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text className="text-white font-semibold">Make your call on speaker</Text>
                      <Text className="text-white/50 text-sm">Keep this screen visible during the call</Text>
                    </View>
                  </View>

                  <View className="flex-row items-start mb-3">
                    <View
                      style={{
                        width: 24,
                        height: 24,
                        borderRadius: 12,
                        backgroundColor: "rgba(255, 184, 0, 0.2)",
                        alignItems: "center",
                        justifyContent: "center",
                        marginRight: 12,
                      }}
                    >
                      <Text style={{ color: "#FFB800", fontSize: 12, fontWeight: "700" }}>3</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text className="text-white font-semibold">See suggestions in real-time</Text>
                      <Text className="text-white/50 text-sm">AI surfaces relevant context during key moments</Text>
                    </View>
                  </View>
                </View>

                {/* Response types */}
                <Text className="text-white/50 text-xs mb-2 uppercase">Response Types</Text>
                <View className="flex-row flex-wrap mb-4">
                  <View className="flex-row items-center mr-4 mb-2">
                    <View className="w-2 h-2 rounded-full bg-red-500 mr-1" />
                    <Text className="text-white/60 text-xs">Urgent</Text>
                  </View>
                  <View className="flex-row items-center mr-4 mb-2">
                    <View className="w-2 h-2 rounded-full bg-orange-500 mr-1" />
                    <Text className="text-white/60 text-xs">Strategy</Text>
                  </View>
                  <View className="flex-row items-center mr-4 mb-2">
                    <View className="w-2 h-2 rounded-full bg-green-500 mr-1" />
                    <Text className="text-white/60 text-xs">Phrasing</Text>
                  </View>
                  <View className="flex-row items-center mr-4 mb-2">
                    <View className="w-2 h-2 rounded-full bg-blue-500 mr-1" />
                    <Text className="text-white/60 text-xs">Context</Text>
                  </View>
                </View>

                {/* Note */}
                <View
                  style={{
                    backgroundColor: "rgba(59, 130, 246, 0.1)",
                    borderRadius: 12,
                    padding: 12,
                    borderWidth: 1,
                    borderColor: "rgba(59, 130, 246, 0.2)",
                  }}
                >
                  <View className="flex-row items-start">
                    <Ionicons name="information-circle" size={16} color="#3B82F6" style={{ marginTop: 1 }} />
                    <Text className="text-blue-300/80 text-xs ml-2 flex-1">
                      This is a decision-support tool. Use your own judgment during negotiations.
                    </Text>
                  </View>
                </View>
              </ScrollView>
            </Pressable>
          </Pressable>
        </Modal>

        {/* Negotiation Chat Window - Draggable AI Assistant */}
        {isListening && (
          <NegotiationChatWindow
            messages={chatMessages}
            onSendMessage={handleChatSendMessage}
            onAddImage={handleChatAddImage}
            onAddFile={handleChatAddFile}
            lastTranscription={transcribedText}
            isListening={isListening}
          />
        )}

        {/* Prep/Notes Toggle Handle - Fixed at bottom */}
        <Pressable
          onPress={togglePrepPanel}
          style={{
            position: "absolute",
            bottom: insets.bottom + 8,
            left: 0,
            right: 0,
            alignItems: "center",
            paddingVertical: 6,
          }}
        >
          <BlurView intensity={25} tint="dark" style={{ borderRadius: 20, overflow: "hidden" }}>
            <LinearGradient
              colors={["rgba(212, 175, 55, 0.10)", "rgba(212, 175, 55, 0.03)"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{
                flexDirection: "row",
                alignItems: "center",
                paddingHorizontal: 14,
                paddingVertical: 8,
                borderWidth: 1,
                borderColor: "rgba(212, 175, 55, 0.15)",
                borderRadius: 20,
              }}
            >
              <Ionicons
                name="chevron-up"
                size={14}
                color="#D4AF37"
              />
              <Text
                style={{
                  color: "#D4AF37",
                  fontSize: 12,
                  fontWeight: "600",
                  marginLeft: 6,
                }}
              >
                Prep / Notes
              </Text>
              {prepItemCount > 0 && (
                <View
                  style={{
                    backgroundColor: "#D4AF37",
                    paddingHorizontal: 6,
                    paddingVertical: 1,
                    borderRadius: 8,
                    marginLeft: 6,
                  }}
                >
                  <Text style={{ color: "#000", fontSize: 10, fontWeight: "700" }}>
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
                  ref={prepScrollViewRef}
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
      </LinearGradient>
    </View>
    </GestureHandlerRootView>
  );
}
