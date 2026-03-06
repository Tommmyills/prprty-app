import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

export interface ConversationMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

export interface SavedConversation {
  id: string;
  title: string;
  preview: string;
  createdAt: string;
  updatedAt: string;
  messages: ConversationMessage[];
}

interface ConversationHistoryState {
  conversations: SavedConversation[];
  activeConversationId: string | null;

  // Actions
  saveConversation: (messages: ConversationMessage[]) => string;
  updateConversation: (id: string, messages: ConversationMessage[]) => void;
  deleteConversation: (id: string) => void;
  loadConversation: (id: string) => SavedConversation | null;
  setActiveConversation: (id: string | null) => void;
  clearAllConversations: () => void;
}

/**
 * Generate a short title from the first user message
 */
function generateTitle(messages: ConversationMessage[]): string {
  const firstUserMessage = messages.find((m) => m.role === "user");
  if (!firstUserMessage) return "New Conversation";

  const content = firstUserMessage.content.trim();
  // Take first 40 characters, cut at word boundary
  if (content.length <= 40) return content;

  const truncated = content.substring(0, 40);
  const lastSpace = truncated.lastIndexOf(" ");
  if (lastSpace > 20) {
    return truncated.substring(0, lastSpace) + "...";
  }
  return truncated + "...";
}

/**
 * Generate preview text from the last assistant message
 */
function generatePreview(messages: ConversationMessage[]): string {
  const lastAssistantMessage = [...messages]
    .reverse()
    .find((m) => m.role === "assistant");
  if (!lastAssistantMessage) return "";

  const content = lastAssistantMessage.content.trim();
  if (content.length <= 60) return content;

  const truncated = content.substring(0, 60);
  const lastSpace = truncated.lastIndexOf(" ");
  if (lastSpace > 30) {
    return truncated.substring(0, lastSpace) + "...";
  }
  return truncated + "...";
}

export const useConversationHistoryStore = create<ConversationHistoryState>()(
  persist(
    (set, get) => ({
      conversations: [],
      activeConversationId: null,

      saveConversation: (messages) => {
        if (messages.length === 0) return "";

        const id = `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const now = new Date().toISOString();

        const newConversation: SavedConversation = {
          id,
          title: generateTitle(messages),
          preview: generatePreview(messages),
          createdAt: now,
          updatedAt: now,
          messages: messages.map((m) => ({
            ...m,
            timestamp:
              typeof m.timestamp === "string"
                ? m.timestamp
                : new Date().toISOString(),
          })),
        };

        set((state) => ({
          conversations: [newConversation, ...state.conversations].slice(0, 50), // Keep max 50 conversations
          activeConversationId: id,
        }));

        return id;
      },

      updateConversation: (id, messages) => {
        if (messages.length === 0) return;

        set((state) => ({
          conversations: state.conversations.map((conv) =>
            conv.id === id
              ? {
                  ...conv,
                  preview: generatePreview(messages),
                  updatedAt: new Date().toISOString(),
                  messages: messages.map((m) => ({
                    ...m,
                    timestamp:
                      typeof m.timestamp === "string"
                        ? m.timestamp
                        : new Date().toISOString(),
                  })),
                }
              : conv
          ),
        }));
      },

      deleteConversation: (id) => {
        set((state) => ({
          conversations: state.conversations.filter((conv) => conv.id !== id),
          activeConversationId:
            state.activeConversationId === id
              ? null
              : state.activeConversationId,
        }));
      },

      loadConversation: (id) => {
        const state = get();
        return state.conversations.find((conv) => conv.id === id) || null;
      },

      setActiveConversation: (id) => {
        set({ activeConversationId: id });
      },

      clearAllConversations: () => {
        set({ conversations: [], activeConversationId: null });
      },
    }),
    {
      name: "conversation-history-storage",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        conversations: state.conversations,
      }),
    }
  )
);
