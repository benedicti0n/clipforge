//react/store/whisperStore.ts
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { WhisperModelKey } from "../../constants/whisper";
import { WHISPER_MODEL_FILES } from "../../constants/whisper";
import { toast } from "sonner";

interface WhisperState {
    selectedModel: WhisperModelKey | null;
    cachedModels: Set<WhisperModelKey>;
    downloading: WhisperModelKey | null;
    progress: number;
    setModel: (model: WhisperModelKey) => void;
    downloadModel: (model: WhisperModelKey) => Promise<void>;
    deleteModel: (model: WhisperModelKey) => Promise<void>;
    setProgress: (value: number) => void;
    loadCachedModels: () => Promise<void>;
}

// Set up progress listener once
if (typeof window !== 'undefined' && window.electronAPI) {
    window.electronAPI.onDownloadProgress((progress) => {
        useWhisperStore.getState().setProgress(progress);
    });
}

export const useWhisperStore = create<WhisperState>()(
    persist(
        (set, get) => ({
            selectedModel: null,
            cachedModels: new Set(),
            downloading: null,
            progress: 0,

            setModel: (model) => {
                if (!get().cachedModels.has(model)) {
                    toast.warning("Model not downloaded", {
                        description: "Please download this model before selecting it.",
                    });
                    return;
                }
                set({ selectedModel: model });
                toast.success(`Selected ${model}`, {
                    description: "Model is ready for transcription.",
                });
            },

            setProgress: (value) => {
                const current = get().downloading;
                if (current) {
                    set({ progress: value });
                }
            },

            downloadModel: async (model) => {
                console.log("🚀 Starting download for:", model);

                const { filename, url } = WHISPER_MODEL_FILES[model];
                const savePath = `whisperModels/${filename}`;

                if (!window.electronAPI?.downloadModel) {
                    toast.error("Electron API not available.");
                    console.error("❌ window.electronAPI is undefined – preload not loaded");
                    return;
                }

                set({ downloading: model, progress: 0 });
                toast.info(`Downloading ${model} model...`);

                try {
                    console.log("📡 Calling electronAPI.downloadModel:", { url, savePath });
                    const result = await window.electronAPI.downloadModel(url, savePath);
                    console.log("✅ Download result:", result);

                    set((state) => ({
                        cachedModels: new Set([...state.cachedModels, model]),
                        downloading: null,
                        progress: 100,
                    }));

                    toast.success(`${model} downloaded successfully!`);
                } catch (err) {
                    console.error("❌ Download error:", err);
                    set({ downloading: null, progress: 0 });
                    toast.error(`Failed to download ${model}`);
                }
            },

            deleteModel: async (model) => {
                const { filename } = WHISPER_MODEL_FILES[model];
                const filePath = `whisperModels/${filename}`;

                if (!window.electronAPI?.deleteFile) {
                    toast.error("Electron API not available.");
                    console.error("❌ window.electronAPI is undefined – preload not loaded");
                    return;
                }

                try {
                    toast.info(`Deleting ${model} model...`);
                    await window.electronAPI.deleteFile(filePath);

                    set((state) => {
                        const newCachedModels = new Set(state.cachedModels);
                        newCachedModels.delete(model);

                        return {
                            cachedModels: newCachedModels,
                            selectedModel: state.selectedModel === model ? null : state.selectedModel,
                        };
                    });

                    toast.success(`${model} deleted successfully!`);
                } catch (err) {
                    console.error("❌ Delete error:", err);
                    toast.error(`Failed to delete ${model}`);
                }
            },

            loadCachedModels: async () => {
                try {
                    const files = await window.electronAPI?.listWhisperModels();
                    if (!files) return;

                    // Map filenames to Whisper model keys
                    const modelKeys = files
                        .map((file) => {
                            const match = file.match(/ggml-(tiny|base|small|medium|large-v2|large-v3)\.(bin|pt)$/i);
                            return match ? (match[1] as WhisperModelKey) : null;
                        })
                        .filter((key): key is WhisperModelKey => !!key);

                    set({ cachedModels: new Set(modelKeys) });
                    console.log("🧠 Cached models loaded:", modelKeys);
                } catch (err) {
                    console.error("❌ Failed to load cached models:", err);
                }
            },

        }),
        {
            name: "whisper-store",
            partialize: (s) => ({
                selectedModel: s.selectedModel,
                cachedModels: Array.from(s.cachedModels),
            }),
            merge: (p, c) => ({
                ...c,
                ...p,
                cachedModels: new Set(p.cachedModels || []),
            }),
        }
    )
);