import { create } from "zustand";
import { persist } from "zustand/middleware";

interface Segment {
    start: number;
    end: number;
    text: string;
}

interface TranscriptionState {
    logs: string[];
    segments: Segment[] | null;
    isTranscribing: boolean;
    uploadedSrt: string | null;

    // actions
    addLog: (line: string) => void;
    setLogs: (logs: string[]) => void;
    setSegments: (segments: Segment[] | null) => void;
    setIsTranscribing: (val: boolean) => void;
    setUploadedSrt: (srt: string | null) => void;
    clearAll: () => void;
}

export const useTranscriptionStore = create<TranscriptionState>()(
    persist(
        (set, get) => ({
            logs: [],
            segments: null,
            isTranscribing: false,
            uploadedSrt: null,

            addLog: (line) => set({ logs: [...get().logs, line] }),
            setLogs: (logs) => set({ logs }),
            setSegments: (segments) => set({ segments }),
            setIsTranscribing: (val) => set({ isTranscribing: val }),
            setUploadedSrt: (srt) => set({ uploadedSrt: srt }),
            clearAll: () => set({ logs: [], segments: null, isTranscribing: false, uploadedSrt: null }),
        }),
        {
            name: "transcription-store", // persist key in localStorage
            partialize: (s) => ({
                logs: s.logs,
                segments: s.segments,
                uploadedSrt: s.uploadedSrt,
            }),
        }
    )
);
