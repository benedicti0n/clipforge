import { create } from "zustand";

interface ClipSelectionState {
    // Gemini
    geminiApiKey: string | null;
    setGeminiApiKey: (key: string) => void;

    // Model (Gemini model type)
    selectedModel: string | null;
    setSelectedModel: (model: string) => void;

    // Prompt
    selectedPrompt: string | null;
    setSelectedPrompt: (prompt: string) => void;
    promptText: string;
    setPromptText: (text: string) => void;

    // Candidates
    clipCandidates: any[];
    setClipCandidates: (candidates: any[]) => void;
}

export const useClipSelectionStore = create<ClipSelectionState>((set) => ({
    geminiApiKey: null,
    setGeminiApiKey: (key) => set({ geminiApiKey: key }),

    selectedModel: "gemini-1.5-pro-latest",
    setSelectedModel: (model) => set({ selectedModel: model }),

    selectedPrompt: null,
    setSelectedPrompt: (prompt) => set({ selectedPrompt: prompt }),
    promptText: "",
    setPromptText: (text) => set({ promptText: text }),

    clipCandidates: [],
    setClipCandidates: (candidates) => set({ clipCandidates: candidates }),
}));
