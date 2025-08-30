import { create } from "zustand";

interface ApiKey {
    name: string;
    key: string;
}

interface ClipCandidate {
    startTime: string;
    endTime: string;
    transcriptionPart: string;
    viralityScore: string;
    totalDuration: string;
    suitableCaption: string;
    filePath?: string; // after trimming
}


interface ClipSelectionState {
    // Keys
    apiKeys: ApiKey[];
    selectedApiKey: string | null;
    addApiKey: (apiKey: ApiKey) => void;
    removeApiKey: (name: string) => void;
    setSelectedApiKey: (name: string) => void;
    setApiKeys: (keys: ApiKey[]) => void; // 🔑 new setter to overwrite safely

    // Model (Gemini model type)
    selectedModel: string | null;
    setSelectedModel: (model: string) => void;

    // Prompt
    selectedPrompt: string | null;
    setSelectedPrompt: (prompt: string) => void;
    promptText: string;
    setPromptText: (text: string) => void;

    // Candidates
    clipCandidates: ClipCandidate[];
    setClipCandidates: (candidates: ClipCandidate[]) => void;
    setClipFilePath: (index: number, path: string) => void
}

export const useClipSelectionStore = create<ClipSelectionState>((set) => ({
    apiKeys: [],
    selectedApiKey: null,

    // ✅ Deduplicate keys by name when adding
    addApiKey: (apiKey) =>
        set((state) => {
            const keysMap = new Map(state.apiKeys.map((k) => [k.name, k]));
            keysMap.set(apiKey.name, apiKey);
            return {
                apiKeys: Array.from(keysMap.values()),
                selectedApiKey: apiKey.name,
            };
        }),

    // ✅ Remove key
    removeApiKey: (name) =>
        set((state) => ({
            apiKeys: state.apiKeys.filter((k) => k.name !== name),
            selectedApiKey:
                state.selectedApiKey === name ? null : state.selectedApiKey,
        })),

    // ✅ Set keys from file (avoids duplicates when reloading tab)
    setApiKeys: (keys) =>
        set({
            apiKeys: [...new Map(keys.map((k) => [k.name, k])).values()],
        }),

    setSelectedApiKey: (name) => set({ selectedApiKey: name }),

    // Models
    selectedModel: "gemini-1.5-pro-latest",
    setSelectedModel: (model) => set({ selectedModel: model }),

    // Prompts
    selectedPrompt: null,
    setSelectedPrompt: (prompt) => set({ selectedPrompt: prompt }),
    promptText: "",
    setPromptText: (text) => set({ promptText: text }),

    // Candidates
    clipCandidates: [],
    setClipCandidates: (candidates) => set({ clipCandidates: candidates }),
    setClipFilePath: (index, path) =>
        set((state) => {
            const updated = [...state.clipCandidates];
            if (updated[index]) updated[index].filePath = path;
            return { clipCandidates: updated };
        }),
}));
