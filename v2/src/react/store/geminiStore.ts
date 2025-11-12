import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface GeminiKey {
    name: string;
    key: string;
}

interface GeminiStore {
    keys: GeminiKey[];
    selectedKey: string | null;
    selectedModel: string | null;

    addKey: (newKey: GeminiKey) => void;
    removeKey: (name: string) => void;
    selectKey: (name: string) => void;

    selectModel: (modelId: string) => void;
}

export const useGeminiStore = create<GeminiStore>()(
    persist(
        (set) => ({
            keys: [],
            selectedKey: null,
            selectedModel: null,

            addKey: (newKey) =>
                set((state) => ({
                    keys: [...state.keys, newKey],
                })),

            removeKey: (name) =>
                set((state) => ({
                    keys: state.keys.filter((k) => k.name !== name),
                })),

            selectKey: (name) => set({ selectedKey: name }),
            selectModel: (modelId) => set({ selectedModel: modelId }),
        }),
        { name: "gemini-store" }
    )
);
