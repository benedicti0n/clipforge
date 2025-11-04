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
    globalDownloading: boolean;

    setModel: (model: WhisperModelKey) => void;
    downloadModel: (model: WhisperModelKey) => Promise<void>;
    deleteModel: (model: WhisperModelKey) => Promise<void>;
    setProgress: (value: number) => void;
    loadCachedModels: () => Promise<void>;
    setGlobalDownloading: (val: boolean) => void;
}

// ------------------------------------------------------
// Initialize global listeners (only once in browser)
// ------------------------------------------------------
if (typeof window !== "undefined" && window.electronAPI) {
    // Progress
    window.electronAPI.onDownloadProgress((progress) => {
        useWhisperStore.getState().setProgress(progress);
    });

    // Retry
    window.electronAPI.onDownloadRetry?.((attempt) => {
        toast(`Retrying download...`, {
            description: `Attempt ${attempt + 1} of 3`,
            duration: 3000,
        });
    });

    // Failed
    window.electronAPI.onDownloadFailed?.((error) => {
        toast.error("Download failed", {
            description: error || "The model could not be downloaded after 3 attempts.",
            duration: 5000,
        });
        useWhisperStore.getState().setGlobalDownloading(false);
        useWhisperStore.setState({ downloading: null, progress: 0 });
    });

    // Success
    window.electronAPI.onDownloadSuccess?.(({ file }) => {
        const modelName = file.match(/ggml-(.*?)\./)?.[1] || "model";
        toast.success(`Model “${modelName}” downloaded successfully!`, { duration: 4000 });
        useWhisperStore.getState().setGlobalDownloading(false);
    });

    // Canceled
    window.electronAPI.onDownloadCanceled?.(({ file }) => {
        const modelName = file.match(/ggml-(.*?)\./)?.[1] || "model";
        toast.warning(`Canceled download of “${modelName}”`, { duration: 3000 });
        useWhisperStore.getState().setGlobalDownloading(false);
        useWhisperStore.setState({ downloading: null, progress: 0 });
    });

    // Blocked (another download in progress)
    window.electronAPI.onDownloadBlocked?.(({ reason }) => {
        toast.warning(reason || "Another model is already downloading", { duration: 4000 });
    });
}

// ------------------------------------------------------
// Zustand Store
// ------------------------------------------------------
export const useWhisperStore = create<WhisperState>()(
    persist(
        (set, get) => ({
            selectedModel: null,
            cachedModels: new Set(),
            downloading: null,
            progress: 0,
            globalDownloading: false,

            // --------------------------
            // Select model
            // --------------------------
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

            // --------------------------
            // Set progress (from IPC)
            // --------------------------
            setProgress: (value) => {
                const current = get().downloading;
                if (current) set({ progress: value });
            },

            // --------------------------
            // Download model
            // --------------------------
            downloadModel: async (model) => {
                const { filename, url } = WHISPER_MODEL_FILES[model];
                const savePath = `whisperModels/${filename}`;

                if (!window.electronAPI?.downloadModel) {
                    toast.error("Electron API not available.");
                    console.error("❌ window.electronAPI is undefined – preload not loaded");
                    return;
                }

                // Prevent new downloads if one is active
                if (get().globalDownloading) {
                    toast.warning("Another download is already in progress", {
                        description: "Please wait or cancel the current download first.",
                    });
                    return;
                }

                // Start
                console.log("🚀 Starting download for:", model);
                set({ downloading: model, progress: 0, globalDownloading: true });
                toast.info(`Downloading ${model} model...`);

                try {
                    console.log("📡 Calling electronAPI.downloadModel:", { url, savePath });
                    const result = await window.electronAPI.downloadModel(url, savePath);
                    console.log("✅ Download result:", result);

                    if (result) {
                        set((state) => ({
                            cachedModels: new Set([...state.cachedModels, model]),
                            downloading: null,
                            progress: 100,
                            globalDownloading: false,
                        }));
                        toast.success(`${model} downloaded successfully!`);
                    }
                } catch (err) {
                    console.error("❌ Download error:", err);
                    set({ downloading: null, progress: 0, globalDownloading: false });
                    toast.error(`Failed to download ${model}`);
                }
            },

            // --------------------------
            // Delete model
            // --------------------------
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

            // --------------------------
            // Load cached models
            // --------------------------
            loadCachedModels: async () => {
                try {
                    const files = await window.electronAPI?.listWhisperModels();
                    if (!files) return;

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

            // --------------------------
            // Global lock setter
            // --------------------------
            setGlobalDownloading: (val) => set({ globalDownloading: val }),
        }),
        {
            name: "whisper-store",
            partialize: (s) => ({
                selectedModel: s.selectedModel,
                cachedModels: Array.from(s.cachedModels),
            }),
            merge: (persisted, current) => ({
                ...current,
                ...persisted,
                cachedModels: new Set(persisted.cachedModels || []),
            }),
        }
    )
);
