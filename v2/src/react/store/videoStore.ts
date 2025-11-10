import { create } from "zustand";

export interface VideoMeta {
    filePath: string | null;
    name: string;
    size: number;
    duration: number;
    url: string | null;
}

interface VideoState {
    video: VideoMeta | null;
    setVideo: (file: File) => Promise<void>;
    clearVideo: () => Promise<void>;
}

export const useVideoStore = create<VideoState>((set) => ({
    video: null,

    setVideo: async (file: File) => {
        if (file.size > 2 * 1024 * 1024 * 1024) {
            alert("File too large! Max limit is 2GB.");
            return;
        }

        const userData = await window.electronAPI!.getUserDataPath();
        const videosDir = `${userData}/uploaded_videos`;
        const safeName = `${Date.now()}_${file.name.replace(/\s+/g, "_")}`;
        const absPath = `${videosDir}/${safeName}`;

        // ✅ Save to disk using preload helper
        await window.electronAPI!.saveFileFromBlob(absPath, file);

        const url = URL.createObjectURL(file);
        const videoEl = document.createElement("video");
        videoEl.src = url;

        videoEl.onloadedmetadata = () => {
            set({
                video: {
                    filePath: absPath,
                    name: file.name,
                    size: file.size,
                    duration: videoEl.duration,
                    url,
                },
            });
        };
    },

    clearVideo: async () => {
        set({ video: null });
    },
}));
