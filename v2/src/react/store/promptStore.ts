import { create } from "zustand";
import { persist } from "zustand/middleware";

interface PromptStore {
    customPrompts: Record<string, string>;
    selectedGenre: string | null;

    savePrompt: (genre: string, content: string) => void;
    clearPrompt: (genre: string) => void;
    getPrompt: (genre: string) => string | null;
    setSelectedGenre: (genre: string) => void;
}

export const usePromptStore = create<PromptStore>()(
    persist(
        (set, get) => ({
            customPrompts: {},
            selectedGenre: null,

            savePrompt: (genre, content) =>
                set((state) => ({
                    customPrompts: { ...state.customPrompts, [genre]: content },
                })),

            clearPrompt: (genre) =>
                set((state) => {
                    const updated = { ...state.customPrompts };
                    delete updated[genre];
                    return { customPrompts: updated };
                }),

            getPrompt: (genre) => get().customPrompts[genre] || null,

            setSelectedGenre: (genre) => set({ selectedGenre: genre }),
        }),
        { name: "prompt-store" }
    )
);
