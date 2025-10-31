// src/react/store/videoStore.ts
import { create } from "zustand";

export interface VideoMeta {
    file: File | null;
    name: string;
    size: number;
    duration: number;
    url: string | null;
}

interface VideoState {
    video: VideoMeta | null;
    setVideo: (file: File) => void;
    clearVideo: () => void;
}

export const useVideoStore = create<VideoState>((set) => ({
    video: null,

    setVideo: (file: File) => {
        if (file.size > 2 * 1024 * 1024 * 1024) {
            alert("File too large! Max limit is 2GB.");
            return;
        }

        const url = URL.createObjectURL(file);
        const video = document.createElement("video");
        video.src = url;

        // Extract metadata asynchronously
        video.onloadedmetadata = () => {
            set({
                video: {
                    file,
                    name: file.name,
                    size: file.size,
                    duration: video.duration,
                    url,
                },
            });
        };
    },

    clearVideo: () => set({ video: null }),
}));
