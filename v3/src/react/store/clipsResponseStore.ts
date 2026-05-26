import { create } from "zustand";
import { persist } from "zustand/middleware";

interface ClipData {
    startTime: string;
    endTime: string;
    transcriptionPart: string;
    totalDuration: string;
    viralityScore: number;
    contentType?: string;
    suitableCaption: string;
}

interface TokenUsage {
    input: number;
    output: number;
}

interface ClipsResponseStore {
    clips: ClipData[];
    tokenUsage: TokenUsage;
    lastUpdated: string | null;

    // Actions
    setClips: (clips: ClipData[]) => void;
    setTokenUsage: (usage: TokenUsage) => void;
    clearClips: () => void;
}

export const useClipsResponseStore = create<ClipsResponseStore>()(
    persist(
        (set) => ({
            clips: [],
            tokenUsage: { input: 0, output: 0 },
            lastUpdated: null,

            setClips: (clips) => set({
                clips,
                lastUpdated: new Date().toISOString()
            }),

            setTokenUsage: (usage) => set({ tokenUsage: usage }),

            clearClips: () => set({
                clips: [],
                tokenUsage: { input: 0, output: 0 },
                lastUpdated: null
            }),
        }),
        {
            name: "clips-response-store",
        }
    )
);