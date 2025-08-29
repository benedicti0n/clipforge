import { create } from "zustand";

interface UploadState {
    filePath: string | null;
    setFilePath: (path: string | null) => void;
    clearFile: () => void;
}

export const useUploadStore = create<UploadState>((set) => ({
    filePath: null,
    setFilePath: (path) => set({ filePath: path }),
    clearFile: () => set({ filePath: null }),
}));
