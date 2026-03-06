import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

export interface Deadline {
  id: string;
  label: string;
  date: string;
  status: "completed" | "current" | "upcoming" | "overdue";
  type: "inspection" | "appraisal" | "loan" | "closing" | "other";
}

export interface Transaction {
  id: string;
  address: string;
  clientName: string;
  price: number;
  contractDate: string;
  deadlines: Deadline[];
  status: "active" | "pending" | "closed";
  summary?: string;
  nextRequiredAction?: string;
  hasOverdue?: boolean;
  extractedAt?: string;
}

export interface EmailTemplate {
  type: "inspection" | "appraisal" | "lender" | "client_update";
  tone: "professional" | "friendly" | "urgent";
  content: string;
}

// Notification system types
export interface NotificationPreferences {
  dailyDigestEnabled: boolean;
  threeDayRemindersEnabled: boolean;
  overdueAlertsEnabled: boolean;
  dailyDigestTime: string; // "08:00" format
}

export interface NotificationHistoryItem {
  id: string;
  title: string;
  body: string;
  timestamp: string;
  type: "digest" | "reminder" | "overdue";
  transactionId?: string;
  deadlineId?: string;
}

// Voice Assistant types (NEW - additive)
export interface VoiceConversation {
  id: string;
  timestamp: string;
  userTranscript: string;
  intent: string;
  assistantResponse: string;
  transactionId?: string;
}

interface RealtorState {
  transactions: Transaction[];
  activeTransactionId: string | null;
  generatedEmail: string;
  weeklyHighlights: string[];
  isAssistantVisible: boolean;

  // Notification system state (NEW - additive)
  notificationPreferences: NotificationPreferences;
  notificationHistory: NotificationHistoryItem[];
  lastNotificationCheck: string | null;
  lastDigestSent: string | null;

  // Voice Assistant state (NEW - additive)
  voiceConversationHistory: VoiceConversation[];
  lastTranscript: string | null;
  lastIntent: string | null;
  lastResponse: string | null;

  // Actions
  setTransactions: (transactions: Transaction[]) => void;
  addTransaction: (transaction: Transaction) => void;
  updateTransaction: (id: string, updates: Partial<Transaction>) => void;
  setActiveTransaction: (id: string | null) => void;
  updateDeadlineStatus: (
    transactionId: string,
    deadlineId: string,
    status: Deadline["status"]
  ) => void;
  setGeneratedEmail: (email: string) => void;
  setWeeklyHighlights: (highlights: string[]) => void;
  setAssistantVisible: (visible: boolean) => void;
  toggleAssistant: () => void;

  // Notification actions (NEW - additive)
  setNotificationPreferences: (preferences: Partial<NotificationPreferences>) => void;
  addNotificationToHistory: (notification: NotificationHistoryItem) => void;
  clearNotificationHistory: () => void;
  setLastNotificationCheck: (timestamp: string) => void;

  // Voice Assistant actions (NEW - additive)
  addVoiceConversation: (conversation: VoiceConversation) => void;
  clearVoiceHistory: () => void;
  setLastTranscript: (transcript: string | null) => void;
  setLastIntent: (intent: string | null) => void;
  setLastResponse: (response: string | null) => void;
}

// Mock data for demo purposes
const mockTransactions: Transaction[] = [
  {
    id: "1",
    address: "4521 Tramway Blvd NE, Albuquerque",
    clientName: "Sarah Johnson",
    price: 725000,
    contractDate: "2024-01-15",
    status: "active",
    deadlines: [
      {
        id: "d1",
        label: "Contract Signed",
        date: "Jan 15, 2024",
        status: "completed",
        type: "other",
      },
      {
        id: "d2",
        label: "Home Inspection",
        date: "Jan 22, 2024",
        status: "completed",
        type: "inspection",
      },
      {
        id: "d3",
        label: "Appraisal Review",
        date: "Jan 29, 2024",
        status: "current",
        type: "appraisal",
      },
      {
        id: "d4",
        label: "Loan Approval",
        date: "Feb 5, 2024",
        status: "upcoming",
        type: "loan",
      },
      {
        id: "d5",
        label: "Final Walkthrough",
        date: "Feb 12, 2024",
        status: "upcoming",
        type: "inspection",
      },
      {
        id: "d6",
        label: "Closing Day",
        date: "Feb 15, 2024",
        status: "upcoming",
        type: "closing",
      },
    ],
  },
  {
    id: "2",
    address: "1847 Rio Grande Blvd NW, Albuquerque",
    clientName: "Michael Chen",
    price: 895000,
    contractDate: "2024-01-10",
    status: "active",
    deadlines: [
      {
        id: "d7",
        label: "Contract Signed",
        date: "Jan 10, 2024",
        status: "completed",
        type: "other",
      },
      {
        id: "d8",
        label: "Home Inspection",
        date: "Jan 17, 2024",
        status: "overdue",
        type: "inspection",
      },
      {
        id: "d9",
        label: "Appraisal",
        date: "Jan 24, 2024",
        status: "upcoming",
        type: "appraisal",
      },
    ],
  },
];

export const useRealtorStore = create<RealtorState>()(
  persist(
    (set, get) => ({
      transactions: mockTransactions,
      activeTransactionId: mockTransactions[0]?.id || null,
      generatedEmail: "",
      weeklyHighlights: [
        "Closed deal on 2309 San Pedro Dr NE - $485K",
        "Completed 3 property inspections",
        "New listing at 6724 Lomas Blvd NE",
        "Negotiated $15K price reduction for client",
      ],
      isAssistantVisible: false,

      // Notification system state (NEW - additive)
      notificationPreferences: {
        dailyDigestEnabled: true,
        threeDayRemindersEnabled: true,
        overdueAlertsEnabled: true,
        dailyDigestTime: "08:00",
      },
      notificationHistory: [],
      lastNotificationCheck: null,
      lastDigestSent: null,

      // Voice Assistant state (NEW - additive)
      voiceConversationHistory: [],
      lastTranscript: null,
      lastIntent: null,
      lastResponse: null,

      setTransactions: (transactions) => set({ transactions }),

      addTransaction: (transaction) =>
        set((state) => ({
          transactions: [...state.transactions, transaction],
        })),

      updateTransaction: (id, updates) =>
        set((state) => ({
          transactions: state.transactions.map((t) =>
            t.id === id ? { ...t, ...updates } : t
          ),
        })),

      setActiveTransaction: (id) => set({ activeTransactionId: id }),

      updateDeadlineStatus: (transactionId, deadlineId, status) =>
        set((state) => ({
          transactions: state.transactions.map((t) =>
            t.id === transactionId
              ? {
                  ...t,
                  deadlines: t.deadlines.map((d) =>
                    d.id === deadlineId ? { ...d, status } : d
                  ),
                }
              : t
          ),
        })),

      setGeneratedEmail: (email) => set({ generatedEmail: email }),

      setWeeklyHighlights: (highlights) =>
        set({ weeklyHighlights: highlights }),

      setAssistantVisible: (visible) => set({ isAssistantVisible: visible }),

      toggleAssistant: () =>
        set((state) => ({ isAssistantVisible: !state.isAssistantVisible })),

      // Notification actions (NEW - additive)
      setNotificationPreferences: (preferences) =>
        set((state) => ({
          notificationPreferences: {
            ...state.notificationPreferences,
            ...preferences,
          },
        })),

      addNotificationToHistory: (notification) =>
        set((state) => ({
          notificationHistory: [
            notification,
            ...state.notificationHistory,
          ].slice(0, 25), // Keep only last 25
        })),

      clearNotificationHistory: () => set({ notificationHistory: [] }),

      setLastNotificationCheck: (timestamp) =>
        set({ lastNotificationCheck: timestamp }),

      // Voice Assistant actions (NEW - additive)
      addVoiceConversation: (conversation) =>
        set((state) => ({
          voiceConversationHistory: [
            conversation,
            ...state.voiceConversationHistory,
          ].slice(0, 10), // Keep only last 10 conversations
        })),

      clearVoiceHistory: () => set({ voiceConversationHistory: [] }),

      setLastTranscript: (transcript) => set({ lastTranscript: transcript }),

      setLastIntent: (intent) => set({ lastIntent: intent }),

      setLastResponse: (response) => set({ lastResponse: response }),
    }),
    {
      name: "realtor-storage",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        transactions: state.transactions,
        activeTransactionId: state.activeTransactionId,
        notificationPreferences: state.notificationPreferences,
        notificationHistory: state.notificationHistory,
        lastNotificationCheck: state.lastNotificationCheck,
        lastDigestSent: state.lastDigestSent,
        voiceConversationHistory: state.voiceConversationHistory,
        lastTranscript: state.lastTranscript,
        lastIntent: state.lastIntent,
        lastResponse: state.lastResponse,
      }),
    }
  )
);
