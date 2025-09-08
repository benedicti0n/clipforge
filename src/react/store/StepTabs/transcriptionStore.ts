import { create } from "zustand";
import { persist } from "zustand/middleware";

export type WhisperModel =
    | "tiny"
    | "base"
    | "small"
    | "medium"
    | "large-turbo"
    | "large";

export interface ModelInfo {
    key: WhisperModel;
    label: string;
    sizeMB: number;
    note: string;
    speedHint: "fastest" | "fast" | "balanced" | "accurate" | "most-accurate";
}

export const WHISPER_MODELS: ModelInfo[] = [
    { key: "tiny", label: "tiny", sizeMB: 75, note: "Fastest, least accurate", speedHint: "fastest" },
    { key: "base", label: "base", sizeMB: 150, note: "Fast & light", speedHint: "fast" },
    { key: "small", label: "small", sizeMB: 500, note: "Balanced speed/accuracy", speedHint: "balanced" },
    { key: "medium", label: "medium", sizeMB: 1500, note: "High accuracy, slower", speedHint: "accurate" },
    { key: "large-turbo", label: "large (turbo)", sizeMB: 2500, note: "Very high accuracy (turbo)", speedHint: "accurate" },
    { key: "large", label: "large", sizeMB: 3000, note: "Most accurate, slowest, largest", speedHint: "most-accurate" },
];

type CacheMap = Partial<Record<WhisperModel, boolean>>;
type ProgressMap = Partial<Record<WhisperModel, number>>; // 0–100
type DownloadingMap = Partial<Record<WhisperModel, boolean>>;

interface TranscriptionState {
    selectedModel: WhisperModel | null;
    cache: CacheMap;
    downloadProgress: ProgressMap;
    downloading: DownloadingMap;
    isTranscribing: boolean;

    transcriptPath: string | null;
    transcriptPreview: string;
    transcriptFull: string;
    transcriptedFile: string | null;
    transcriptSRT: string | null;

    // setters
    setTranscriptedFile: (file: string | null) => void;
    setTranscriptSRT: (srt: string | null) => void;
    setSelectedModel: (m: WhisperModel | null) => void;
    setCacheFor: (m: WhisperModel, cached: boolean) => void;
    setDownloadProgress: (m: WhisperModel, p: number) => void;
    setDownloading: (m: WhisperModel, v: boolean) => void;
    setIsTranscribing: (v: boolean) => void;
    setTranscriptPath: (p: string | null) => void;
    setTranscriptPreview: (t: string) => void;
    setTranscriptFull: (t: string) => void;

    resetResults: () => void;
}

export const useTranscriptionStore = create<TranscriptionState>()(
    persist(
        (set) => ({
            selectedModel: null,
            cache: {},
            downloadProgress: {},
            downloading: {},
            isTranscribing: false,

            transcriptPath: null,
            transcriptPreview: "",
            transcriptFull: "",
            transcriptedFile: null,
            transcriptSRT: null,

            setTranscriptedFile: (file) => set({ transcriptedFile: file }),
            setTranscriptSRT: (srt) => set({ transcriptSRT: srt }),
            setSelectedModel: (m) => set({ selectedModel: m }),

            setCacheFor: (m, cached) =>
                set((s) => ({ cache: { ...s.cache, [m]: cached } })),

            setDownloadProgress: (m, p) =>
                set((s) => ({
                    downloadProgress: { ...s.downloadProgress, [m]: p },
                })),

            setDownloading: (m, v) =>
                set((s) => ({
                    downloading: { ...s.downloading, [m]: v },
                })),

            setIsTranscribing: (v) => set({ isTranscribing: v }),

            setTranscriptPath: (p) => set({ transcriptPath: p }),
            setTranscriptPreview: (t) => set({ transcriptPreview: t }),
            setTranscriptFull: (t) => set({ transcriptFull: t }),

            resetResults: () =>
                set({
                    transcriptPath: null,
                    transcriptPreview: "",
                    transcriptFull: "",
                    transcriptSRT: null,
                }),
        }),
        {
            name: "transcription-store",
        }
    )
);

//
// 🔹 Reactive selector hooks (subscribe components to updates)
//

export const useProgressForModel = (model: WhisperModel) =>
    useTranscriptionStore((s) => s.downloadProgress[model] ?? null);

export const useIsDownloadingModel = (model: WhisperModel) =>
    useTranscriptionStore((s) => s.downloading[model] ?? false);

export const useIsModelCached = (model: WhisperModel) =>
    useTranscriptionStore((s) => s.cache[model] ?? false);

export const useSelectedModel = () =>
    useTranscriptionStore((s) => s.selectedModel);

export const useIsTranscribing = () =>
    useTranscriptionStore((s) => s.isTranscribing);
