import { create } from "zustand";

interface UploadState {
    absolutePath: string | null;   // ✅ real OS file path
    previewUrl: string | null;     // ✅ blob: URL for <video> playback
    setFile: (absolutePath: string, previewUrl: string) => void;
    clearFile: () => void;
}

export const useUploadStore = create<UploadState>((set) => ({
    absolutePath: null,
    previewUrl: null,

    setFile: (absolutePath, previewUrl) => set({ absolutePath, previewUrl }),

    clearFile: () => {
        // Revoke blob URL when clearing
        set((state) => {
            if (state.previewUrl) {
                URL.revokeObjectURL(state.previewUrl);
            }
            return { absolutePath: null, previewUrl: null };
        });
    },
}));
