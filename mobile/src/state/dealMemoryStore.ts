/**
 * Deal Memory Store
 * Temporary working memory for the current negotiation session
 * Stores notes, pasted text, files, and images for AI context
 */

import { create } from "zustand";

export interface DealMemory {
  notesText: string;
  pastedText: string;
  fileUrls: string[];
  imageUrls: string[];
  createdAt: Date;
}

interface DealMemoryState {
  // Current session memory
  memory: DealMemory;

  // Actions
  setNotesText: (text: string) => void;
  setPastedText: (text: string) => void;
  addFileUrl: (url: string) => void;
  removeFileUrl: (url: string) => void;
  addImageUrl: (url: string) => void;
  removeImageUrl: (url: string) => void;
  clearMemory: () => void;
  getContextForAI: () => string;
}

const initialMemory: DealMemory = {
  notesText: "",
  pastedText: "",
  fileUrls: [],
  imageUrls: [],
  createdAt: new Date(),
};

export const useDealMemoryStore = create<DealMemoryState>((set, get) => ({
  memory: { ...initialMemory },

  setNotesText: (text) =>
    set((state) => ({
      memory: { ...state.memory, notesText: text },
    })),

  setPastedText: (text) =>
    set((state) => ({
      memory: { ...state.memory, pastedText: text },
    })),

  addFileUrl: (url) =>
    set((state) => ({
      memory: {
        ...state.memory,
        fileUrls: [...state.memory.fileUrls, url],
      },
    })),

  removeFileUrl: (url) =>
    set((state) => ({
      memory: {
        ...state.memory,
        fileUrls: state.memory.fileUrls.filter((f) => f !== url),
      },
    })),

  addImageUrl: (url) =>
    set((state) => ({
      memory: {
        ...state.memory,
        imageUrls: [...state.memory.imageUrls, url],
      },
    })),

  removeImageUrl: (url) =>
    set((state) => ({
      memory: {
        ...state.memory,
        imageUrls: state.memory.imageUrls.filter((i) => i !== url),
      },
    })),

  clearMemory: () =>
    set({
      memory: { ...initialMemory, createdAt: new Date() },
    }),

  getContextForAI: () => {
    const { memory } = get();
    const parts: string[] = [];

    if (memory.notesText.trim()) {
      parts.push(`DEAL NOTES:\n${memory.notesText.trim()}`);
    }

    if (memory.pastedText.trim()) {
      parts.push(`PASTED EMAIL/TEXT:\n${memory.pastedText.trim()}`);
    }

    if (memory.fileUrls.length > 0) {
      const fileNames = memory.fileUrls.map((url) => {
        const parts = url.split("/");
        return parts[parts.length - 1] || "document";
      });
      parts.push(`UPLOADED FILES: ${fileNames.join(", ")}`);
    }

    if (memory.imageUrls.length > 0) {
      parts.push(`UPLOADED IMAGES: ${memory.imageUrls.length} photo(s)/screenshot(s) available`);
    }

    if (parts.length === 0) {
      return "";
    }

    return `\n\n--- DEAL MEMORY (Reference this for context) ---\n${parts.join("\n\n")}\n--- END DEAL MEMORY ---`;
  },
}));
