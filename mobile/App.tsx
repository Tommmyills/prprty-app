import { useState, useEffect, useCallback, useRef } from "react";
import { StatusBar } from "expo-status-bar";
import { Dimensions } from "react-native";
import { SafeAreaProvider, useSafeAreaInsets } from "react-native-safe-area-context";
import { NavigationContainer, useNavigationContainerRef } from "@react-navigation/native";
import { GestureHandlerRootView, PanGestureHandler, PanGestureHandlerGestureEvent } from "react-native-gesture-handler";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useAnimatedGestureHandler,
  withSpring,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { RootNavigator } from "./src/navigation/RootNavigator";
import { SplashScreen, QuickAssistantButton, RealtorAssistantEditor } from "./src/components";
import { ConversationHistoryModal } from "./src/components/ConversationHistoryModal";
import { requestNotificationPermissions } from "./src/services/notificationService";
import { registerBackgroundTask } from "./src/services/backgroundTaskService";
import { AssistantMessage, AIProvider } from "./src/services/multiAIAssistant";
import { isAgentActiveOnScreen } from "./src/services/homepageAgent";
import { stopSpeakerAudio } from "./src/services/speakerAudio";
import { RootStackParamList } from "./src/types/navigation";
import { useConversationHistoryStore, SavedConversation, ConversationMessage } from "./src/state/conversationHistoryStore";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const BUTTON_SIZE = 110;
const EDITOR_HEIGHT_25_PERCENT = SCREEN_HEIGHT * 0.25;

/*
IMPORTANT NOTICE: DO NOT REMOVE
There are already environment keys in the project.
Before telling the user to add them, check if you already have access to the required keys through bash.
Directly access them with process.env.${key}

Correct usage:
process.env.EXPO_PUBLIC_VIBECODE_{key}
//directly access the key

Incorrect usage:
import { OPENAI_API_KEY } from '@env';
//don't use @env, its depreicated

Incorrect usage:
import Constants from 'expo-constants';
const openai_api_key = Constants.expoConfig.extra.apikey;
//don't use expo-constants, its depreicated

*/

type ContextType = {
  startX: number;
  startY: number;
};

interface GlobalAssistantButtonProps {
  currentScreen: string;
  onOpenAssistant: () => void;
  onOpenEditor: () => void;
  onUpdateEditorText: (text: string) => void;
  isEditorVisible: boolean;
  editorHeight: number;
  silentMode: boolean;
  messages: AssistantMessage[];
  setMessages: React.Dispatch<React.SetStateAction<AssistantMessage[]>>;
  onMessageUpdate?: (messages: AssistantMessage[]) => void;
}

function GlobalAssistantButton({ currentScreen, onOpenAssistant, onOpenEditor, onUpdateEditorText, isEditorVisible, editorHeight, silentMode, messages, setMessages, onMessageUpdate }: GlobalAssistantButtonProps) {
  const insets = useSafeAreaInsets();
  const [selectedProvider, setSelectedProvider] = useState<AIProvider>("claude");

  // Check if agent should be visible on current screen
  const isVisible = isAgentActiveOnScreen(currentScreen);

  // Calculate position - when editor is open, position above it
  const defaultY = SCREEN_HEIGHT - 250;
  const editorOpenY = SCREEN_HEIGHT - editorHeight - BUTTON_SIZE - 30; // Position above editor with margin

  // Initial position (bottom right)
  const translateX = useSharedValue(SCREEN_WIDTH - BUTTON_SIZE - 10);
  const translateY = useSharedValue(defaultY);
  const isPressed = useSharedValue(false);

  // Move button when editor opens/closes
  useEffect(() => {
    if (isEditorVisible) {
      translateY.value = withSpring(editorOpenY, { damping: 20, stiffness: 200 });
    } else {
      translateY.value = withSpring(defaultY, { damping: 20, stiffness: 200 });
    }
  }, [isEditorVisible, editorOpenY, defaultY]);

  const handleShowChat = (msgs: AssistantMessage[]) => {
    // Open the editor window and update with latest AI response
    onOpenEditor();
    if (msgs.length > 0) {
      const lastMsg = msgs[msgs.length - 1];
      if (lastMsg.role === "assistant") {
        onUpdateEditorText(lastMsg.content);
      }
      // Notify parent about message update for auto-save
      onMessageUpdate?.(msgs);
    }
  };

  const gestureHandler = useAnimatedGestureHandler<PanGestureHandlerGestureEvent, ContextType>({
    onStart: (_, context) => {
      context.startX = translateX.value;
      context.startY = translateY.value;
      isPressed.value = true;
    },
    onActive: (event, context) => {
      let newX = context.startX + event.translationX;
      let newY = context.startY + event.translationY;

      // Clamp to screen bounds - when editor is open, don't allow below it
      const minX = 10;
      const maxX = SCREEN_WIDTH - BUTTON_SIZE - 10;
      const minY = insets.top + 10;
      const maxY = isEditorVisible
        ? SCREEN_HEIGHT - editorHeight - BUTTON_SIZE - 20
        : SCREEN_HEIGHT - insets.bottom - BUTTON_SIZE - 60;

      newX = Math.max(minX, Math.min(maxX, newX));
      newY = Math.max(minY, Math.min(maxY, newY));

      translateX.value = newX;
      translateY.value = newY;
    },
    onEnd: () => {
      isPressed.value = false;
    },
  });

  const animatedStyle = useAnimatedStyle(() => ({
    position: "absolute" as const,
    left: translateX.value,
    top: translateY.value,
    zIndex: 200000,
    transform: [{ scale: withSpring(isPressed.value ? 1.05 : 1) }],
  }));

  // Don't render if not on active screen
  if (!isVisible) {
    return null;
  }

  return (
    <PanGestureHandler onGestureEvent={gestureHandler}>
      <Animated.View style={animatedStyle}>
        <QuickAssistantButton
          onShowChat={handleShowChat}
          onOpenAssistant={onOpenAssistant}
          messages={messages}
          setMessages={setMessages}
          selectedProvider={selectedProvider}
          silentMode={silentMode}
        />
      </Animated.View>
    </PanGestureHandler>
  );
}

export default function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [currentScreen, setCurrentScreen] = useState("NegotiationHome");
  const navigationRef = useNavigationContainerRef<RootStackParamList>();

  // Assistant messages state (lifted here so Recenter can clear it)
  const [assistantMessages, setAssistantMessages] = useState<AssistantMessage[]>([]);

  // Editor window state
  const [isEditorVisible, setIsEditorVisible] = useState(false);
  const [editorText, setEditorText] = useState("");
  const [silentMode, setSilentMode] = useState(false);
  const [isAIUpdating, setIsAIUpdating] = useState(false);

  // Conversation history state
  const [isHistoryModalVisible, setIsHistoryModalVisible] = useState(false);
  const activeConversationIdRef = useRef<string | null>(null);
  const saveConversation = useConversationHistoryStore((s) => s.saveConversation);
  const updateConversation = useConversationHistoryStore((s) => s.updateConversation);
  const setActiveConversation = useConversationHistoryStore((s) => s.setActiveConversation);

  // Convert AssistantMessage to ConversationMessage for storage
  const convertToConversationMessages = useCallback((messages: AssistantMessage[]): ConversationMessage[] => {
    return messages.map((m) => ({
      id: m.id,
      role: m.role,
      content: m.content,
      timestamp: m.timestamp instanceof Date ? m.timestamp.toISOString() : String(m.timestamp),
    }));
  }, []);

  // Auto-save conversation when messages update
  const handleMessageUpdate = useCallback((messages: AssistantMessage[]) => {
    if (messages.length === 0) return;

    const conversationMessages = convertToConversationMessages(messages);

    if (activeConversationIdRef.current) {
      // Update existing conversation
      updateConversation(activeConversationIdRef.current, conversationMessages);
    } else {
      // Create new conversation
      const newId = saveConversation(conversationMessages);
      activeConversationIdRef.current = newId;
    }
  }, [convertToConversationMessages, saveConversation, updateConversation]);

  // Editor handlers
  const handleOpenEditor = useCallback(() => {
    setIsEditorVisible(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  const handleCloseEditor = useCallback(() => {
    setIsEditorVisible(false);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  // New Question - stops speech, clears current turn only, starts new conversation
  const handleNewQuestion = useCallback(() => {
    stopSpeakerAudio();
    // Clear the current editor text for new question
    setEditorText("");
    // Clear messages for new conversation
    setAssistantMessages([]);
    // Reset conversation ID for new conversation
    activeConversationIdRef.current = null;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }, []);

  // Silent Mode toggle - when ON, no audio output
  const handleSilentModeToggle = useCallback(() => {
    setSilentMode((prev) => {
      // If turning on silent mode, stop any playing audio
      if (!prev) {
        stopSpeakerAudio();
      }
      return !prev;
    });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  const handleEditorTextChange = useCallback((text: string) => {
    setEditorText(text);
  }, []);

  const handleUpdateEditorText = useCallback((text: string) => {
    setIsAIUpdating(true);
    setEditorText((prev) => {
      if (prev.trim()) {
        return prev + "\n\n---\n\n" + text;
      }
      return text;
    });
    setTimeout(() => setIsAIUpdating(false), 500);
  }, []);

  // Open history modal
  const handleOpenHistory = useCallback(() => {
    setIsHistoryModalVisible(true);
  }, []);

  // Close history modal
  const handleCloseHistory = useCallback(() => {
    setIsHistoryModalVisible(false);
  }, []);

  // Load a saved conversation
  const handleSelectConversation = useCallback((conversation: SavedConversation) => {
    // Set active conversation ID
    activeConversationIdRef.current = conversation.id;
    setActiveConversation(conversation.id);

    // Convert stored messages back to AssistantMessage format
    const loadedMessages: AssistantMessage[] = conversation.messages.map((m) => ({
      id: m.id,
      role: m.role,
      content: m.content,
      timestamp: new Date(m.timestamp),
    }));

    // Set messages state
    setAssistantMessages(loadedMessages);

    // Build editor text from conversation
    const editorContent = conversation.messages
      .map((m) => {
        if (m.role === "user") {
          return `You: ${m.content}`;
        }
        return m.content;
      })
      .join("\n\n---\n\n");

    setEditorText(editorContent);

    // Enable silent mode by default for loaded conversations
    setSilentMode(true);

    // Open editor if not already visible
    setIsEditorVisible(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, [setActiveConversation]);

  // Initialize notification system and background tasks
  useEffect(() => {
    async function initializeNotifications() {
      // Request notification permissions
      const hasPermission = await requestNotificationPermissions();

      if (hasPermission) {
        // Register background task for deadline checking
        await registerBackgroundTask();
        console.log("[App] Notification system initialized");
      } else {
        console.log("[App] Notification permissions denied");
      }
    }

    initializeNotifications();
  }, []);

  const handleOpenAssistant = () => {
    if (navigationRef.current) {
      navigationRef.current.navigate("Assistant");
    }
  };

  if (showSplash) {
    return (
      <GestureHandlerRootView style={{ flex: 1, backgroundColor: "#000000" }}>
        <StatusBar style="light" />
        <SplashScreen onFinish={() => setShowSplash(false)} />
      </GestureHandlerRootView>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: "#0A0A0F" }}>
      <SafeAreaProvider>
        <NavigationContainer
          ref={navigationRef}
          onStateChange={() => {
            const route = navigationRef.current?.getCurrentRoute();
            if (route?.name) {
              setCurrentScreen(route.name);
            }
          }}
        >
          <StatusBar style="light" />
          <RootNavigator />
          {currentScreen !== "NegotiationHome" && (
            <GlobalAssistantButton
              currentScreen={currentScreen}
              onOpenAssistant={handleOpenAssistant}
              onOpenEditor={handleOpenEditor}
              onUpdateEditorText={handleUpdateEditorText}
              isEditorVisible={isEditorVisible}
              editorHeight={EDITOR_HEIGHT_25_PERCENT}
              silentMode={silentMode}
              messages={assistantMessages}
              setMessages={setAssistantMessages}
              onMessageUpdate={handleMessageUpdate}
            />
          )}
          {/* Global Realtor Assistant Editor Window - hidden on NegotiationHome (Home) and LiveCoaching screens */}
          {currentScreen !== "LiveCoaching" && currentScreen !== "NegotiationHome" && (
            <RealtorAssistantEditor
              visible={isEditorVisible}
              onClose={handleCloseEditor}
              onNewQuestion={handleNewQuestion}
              silentMode={silentMode}
              onSilentModeToggle={handleSilentModeToggle}
              editorText={editorText}
              onEditorTextChange={handleEditorTextChange}
              isAIUpdating={isAIUpdating}
              initialHeight={EDITOR_HEIGHT_25_PERCENT}
              onOpenHistory={handleOpenHistory}
            />
          )}
          {/* Conversation History Modal */}
          <ConversationHistoryModal
            visible={isHistoryModalVisible}
            onClose={handleCloseHistory}
            onSelectConversation={handleSelectConversation}
          />
        </NavigationContainer>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
