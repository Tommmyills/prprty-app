/**
 * Deal Context Store
 * Persistent storage for multiple deal contexts that can be referenced during Live Negotiation
 * Each DealContext contains deal info, notes, pasted text, and file references
 */

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

export interface DealContext {
  id: string;
  createdAt: string;
  dealName: string;
  address: string;
  clientPhone?: string;
  notes: string;
  pastedText: string;
  fileUrls: string[];
  extractedText: string;
  isDemo?: boolean;
}

// Demo example data to show users how the feature works
const DEMO_DEAL_CONTEXT: DealContext = {
  id: "demo_example_123",
  createdAt: new Date().toISOString(),
  dealName: "DEMO — 123 Maple St (Example Only)",
  address: "123 Maple Street, Austin, TX 78701",
  notes: `[DEMO DATA — Replace or clear with your own deal information]

This is a sample inspection negotiation scenario.

Key details:
• Buyer is requesting a credit after inspection findings
• Inspection revealed roofing and electrical concerns
• Original offer: $425,000
• Buyer requesting: $4,500 credit

This content is for demonstration purposes only.`,
  pastedText: `[DEMO EMAIL — Example Only]

From: Buyer's Agent
Subject: Inspection Response - 123 Maple St

Hi,

After reviewing the inspection report, my clients are requesting a $4,500 credit to address the following concerns:

1. Roofing: Inspector noted missing shingles and potential leak areas ($2,500 estimated repair)
2. Electrical: Outdated panel needs updating to meet current code ($2,000 estimated)

My clients remain excited about the property and hope we can work together on this.

Let me know your thoughts.

Best regards,
Demo Buyer Agent`,
  fileUrls: [],
  extractedText: "",
  isDemo: true,
};

interface DealContextState {
  // Saved deal contexts
  dealContexts: DealContext[];

  // Currently active deal context for Live Negotiation
  activeDealContextId: string | null;

  // Track if demo has been initialized
  demoInitialized: boolean;

  // Actions
  addDealContext: (context: Omit<DealContext, "id" | "createdAt">) => string;
  updateDealContext: (id: string, updates: Partial<Omit<DealContext, "id" | "createdAt">>) => void;
  deleteDealContext: (id: string) => void;
  setActiveDealContext: (id: string | null) => void;
  getActiveDealContext: () => DealContext | null;
  getContextForAI: () => string;
  initializeDemoIfNeeded: () => void;
}

export const useDealContextStore = create<DealContextState>()(
  persist(
    (set, get) => ({
      dealContexts: [],
      activeDealContextId: null,
      demoInitialized: false,

      initializeDemoIfNeeded: () => {
        const { demoInitialized, dealContexts } = get();
        // Only add demo if never initialized and no contexts exist
        if (!demoInitialized && dealContexts.length === 0) {
          set({
            dealContexts: [DEMO_DEAL_CONTEXT],
            demoInitialized: true,
          });
        } else if (!demoInitialized) {
          // Mark as initialized even if user already has data
          set({ demoInitialized: true });
        }
      },

      addDealContext: (context) => {
        const id = `dc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const newContext: DealContext = {
          ...context,
          id,
          createdAt: new Date().toISOString(),
        };

        set((state) => ({
          dealContexts: [newContext, ...state.dealContexts],
        }));

        return id;
      },

      updateDealContext: (id, updates) => {
        set((state) => ({
          dealContexts: state.dealContexts.map((ctx) =>
            ctx.id === id ? { ...ctx, ...updates, isDemo: false } : ctx
          ),
        }));
      },

      deleteDealContext: (id) => {
        set((state) => ({
          dealContexts: state.dealContexts.filter((ctx) => ctx.id !== id),
          activeDealContextId:
            state.activeDealContextId === id ? null : state.activeDealContextId,
        }));
      },

      setActiveDealContext: (id) => {
        set({ activeDealContextId: id });
      },

      getActiveDealContext: () => {
        const { dealContexts, activeDealContextId } = get();
        if (!activeDealContextId) return null;
        return dealContexts.find((ctx) => ctx.id === activeDealContextId) || null;
      },

      getContextForAI: () => {
        const activeContext = get().getActiveDealContext();
        if (!activeContext) return "";

        const parts: string[] = [];

        parts.push(`DEAL: ${activeContext.dealName}`);

        if (activeContext.address.trim()) {
          parts.push(`PROPERTY ADDRESS: ${activeContext.address}`);
        }

        if (activeContext.notes.trim()) {
          parts.push(`KEY NOTES:\n${activeContext.notes.trim()}`);
        }

        if (activeContext.pastedText.trim()) {
          parts.push(`PASTED EMAIL/TEXT:\n${activeContext.pastedText.trim()}`);
        }

        if (activeContext.extractedText.trim()) {
          parts.push(`EXTRACTED FROM DOCUMENTS:\n${activeContext.extractedText.trim()}`);
        }

        if (activeContext.fileUrls.length > 0) {
          const fileNames = activeContext.fileUrls.map((url) => {
            const urlParts = url.split("/");
            return urlParts[urlParts.length - 1] || "document";
          });
          parts.push(`UPLOADED FILES: ${fileNames.join(", ")}`);
        }

        if (parts.length === 0) {
          return "";
        }

        return `\n\n--- DEAL CONTEXT MEMORY (Reference this for all guidance) ---\n${parts.join("\n\n")}\n--- END DEAL CONTEXT ---`;
      },
    }),
    {
      name: "deal-context-storage",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        dealContexts: state.dealContexts,
        activeDealContextId: state.activeDealContextId,
        demoInitialized: state.demoInitialized,
      }),
    }
  )
);
