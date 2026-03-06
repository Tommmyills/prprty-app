/**
 * useRealtorAssistant Hook
 * Manages conversation state and interactions with the AI assistant
 */

import { useState, useCallback, useRef } from "react";
import {
  AssistantMessage,
  ConversationContext,
  sendToAssistant,
  speakAssistantMessage,
  stopAssistantSpeech,
  getAssistantGreeting,
} from "../services/realtorAssistant";
import { useRealtorStore } from "../state/realtorStore";

interface UseRealtorAssistantReturn {
  messages: AssistantMessage[];
  isLoading: boolean;
  isSpeaking: boolean;
  sendMessage: (text: string) => Promise<void>;
  clearMessages: () => void;
  initializeGreeting: () => void;
  stopSpeaking: () => void;
}

export function useRealtorAssistant(): UseRealtorAssistantReturn {
  const [messages, setMessages] = useState<AssistantMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const speakingRef = useRef(false);

  // Get transaction context from store
  const transactions = useRealtorStore((s) => s.transactions);
  const activeTransactionId = useRealtorStore((s) => s.activeTransactionId);
  const activeTransaction = transactions.find((t) => t.id === activeTransactionId);

  /**
   * Build context for the assistant
   */
  const getContext = useCallback((): ConversationContext => {
    const context: ConversationContext = {
      todayDate: new Date().toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
      }),
    };

    if (activeTransaction) {
      context.transactionAddress = activeTransaction.address;
      context.clientName = activeTransaction.clientName;

      // Get upcoming deadlines
      const upcomingDeadlines = activeTransaction.deadlines
        .filter((d) => d.status !== "completed")
        .slice(0, 3)
        .map((d) => `${d.label} (${d.date})`);

      if (upcomingDeadlines.length > 0) {
        context.currentDeadlines = upcomingDeadlines;
      }
    }

    return context;
  }, [activeTransaction]);

  /**
   * Initialize with a greeting message
   */
  const initializeGreeting = useCallback(() => {
    const greeting = getAssistantGreeting();
    console.log("[useRealtorAssistant] Initializing with greeting:", greeting);

    const greetingMessage: AssistantMessage = {
      id: "greeting-" + Date.now(),
      role: "assistant",
      content: greeting,
      timestamp: new Date(),
      type: "general",
    };

    setMessages([greetingMessage]);

    // Speak the greeting
    setIsSpeaking(true);
    speakingRef.current = true;
    speakAssistantMessage(greeting).finally(() => {
      setIsSpeaking(false);
      speakingRef.current = false;
    });
  }, []);

  /**
   * Send a message to the assistant
   */
  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || isLoading) return;

      console.log("[useRealtorAssistant] Sending message:", text);

      // Stop any ongoing speech
      if (speakingRef.current) {
        await stopAssistantSpeech();
        setIsSpeaking(false);
        speakingRef.current = false;
      }

      // Add user message
      const userMessage: AssistantMessage = {
        id: "user-" + Date.now(),
        role: "user",
        content: text.trim(),
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, userMessage]);
      setIsLoading(true);

      try {
        // Get assistant response
        const response = await sendToAssistant(text, messages, getContext());

        // Add assistant message
        setMessages((prev) => [...prev, response]);

        // Speak the response
        setIsSpeaking(true);
        speakingRef.current = true;
        await speakAssistantMessage(response.content);
      } catch (error) {
        console.error("[useRealtorAssistant] Error:", error);

        const errorMessage: AssistantMessage = {
          id: "error-" + Date.now(),
          role: "assistant",
          content: "Sorry, something went wrong. Let me try that again.",
          timestamp: new Date(),
          type: "general",
        };
        setMessages((prev) => [...prev, errorMessage]);
      } finally {
        setIsLoading(false);
        setIsSpeaking(false);
        speakingRef.current = false;
      }
    },
    [messages, isLoading, getContext]
  );

  /**
   * Clear all messages
   */
  const clearMessages = useCallback(() => {
    setMessages([]);
    if (speakingRef.current) {
      stopAssistantSpeech();
      setIsSpeaking(false);
      speakingRef.current = false;
    }
  }, []);

  /**
   * Stop speaking
   */
  const stopSpeaking = useCallback(() => {
    if (speakingRef.current) {
      stopAssistantSpeech();
      setIsSpeaking(false);
      speakingRef.current = false;
    }
  }, []);

  return {
    messages,
    isLoading,
    isSpeaking,
    sendMessage,
    clearMessages,
    initializeGreeting,
    stopSpeaking,
  };
}
