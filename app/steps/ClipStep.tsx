"use client";

import { useState } from "react";

// Video metadata interface
interface VideoMetadata {
    duration: number;
    width: number;
    height: number;
    format: string;
}

// Clipped video data interface
interface ClippedVideoData {
    url: string;
    metadata?: VideoMetadata;
}

interface Props {
    onNext: (videoData: ClippedVideoData) => void;
}

export default function ClipStep({ onNext }: Props) {
    const [videoFile, setVideoFile] = useState<File | null>(null);
    const [startTime, setStartTime] = useState("00:00:00");
    const [endTime, setEndTime] = useState("00:00:10");
    const [clippedVideo, setClippedVideo] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            setVideoFile(e.target.files[0]);
        }
    };

    const handleProcess = async () => {
        if (!videoFile) return;
        setLoading(true);
        setError(null);

        try {
            const formData = new FormData();
            formData.append("file", videoFile);
            formData.append("start", startTime);
            formData.append("end", endTime);

            const res = await fetch("/api/clip", {
                method: "POST",
                body: formData,
            });

            if (!res.ok) throw new Error("Failed to process video");

            const blob = await res.blob();
            setClippedVideo(URL.createObjectURL(blob));
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-4">
            <h1 className="text-2xl font-bold">Step 1: Clip Video</h1>

            <input type="file" accept="video/*" onChange={handleUpload} />
            <div className="flex gap-2">
                <label>
                    Start:
                    <input
                        type="text"
                        value={startTime}
                        onChange={(e) => setStartTime(e.target.value)}
                        className="border p-1 ml-1"
                    />
                </label>
                <label>
                    End:
                    <input
                        type="text"
                        value={endTime}
                        onChange={(e) => setEndTime(e.target.value)}
                        className="border p-1 ml-1"
                    />
                </label>
            </div>

            <button
                onClick={handleProcess}
                disabled={loading}
                className="bg-green-500 text-white px-4 py-2 rounded"
            >
                {loading ? "Processing..." : "Process"}
            </button>

            {error && <p className="text-red-500">{error}</p>}
            {clippedVideo && (
                <div>
                    <h2 className="text-lg font-semibold">Preview:</h2>
                    <video controls src={clippedVideo} className="max-w-full" />
                    <a
                        href={clippedVideo}
                        download="clipped.mp4"
                        className="block mt-2 bg-blue-500 text-white px-4 py-2 rounded"
                    >
                        Download
                    </a>
                    <button
                        onClick={() => onNext({ url: clippedVideo })}
                        className="ml-2 bg-purple-500 text-white px-4 py-2 rounded"
                    >
                        Next →
                    </button>
                </div>
            )}
        </div>
    );
}
