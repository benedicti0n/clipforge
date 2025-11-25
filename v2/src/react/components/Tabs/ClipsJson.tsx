"use client";

import { useState, useMemo } from "react";
import ClipsJsonLeft from "../ClipsJson/ClipsJsonLeft";
import ClipsJsonRight from "../ClipsJson/ClipsJsonRight";
import { useTranscriptionStore } from "../../store/transcriptionStore";

export default function ClipsJson() {
    const [isLoading, setIsLoading] = useState(false);
    const { segments, uploadedSrt } = useTranscriptionStore();

    // ✅ Convert segments to proper SRT format with timestamps
    const transcriptSRT = useMemo(() => {
        if (uploadedSrt) return uploadedSrt.trim();

        if (segments && segments.length > 0) {
            // Format as proper SRT with timestamps
            return segments
                .map((seg, index) => {
                    const formatTime = (seconds: number) => {
                        const hrs = Math.floor(seconds / 3600);
                        const mins = Math.floor((seconds % 3600) / 60);
                        const secs = Math.floor(seconds % 60);
                        const ms = Math.floor((seconds % 1) * 1000);
                        return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')},${String(ms).padStart(3, '0')}`;
                    };

                    return [
                        index + 1,
                        `${formatTime(seg.start)} --> ${formatTime(seg.end)}`,
                        seg.text,
                        '' // Empty line between segments
                    ].join('\n');
                })
                .join('\n');
        }

        return "";
    }, [uploadedSrt, segments]);

    return (
        <div className="flex h-full">
            {/* LEFT PANEL */}
            <div className="w-1/3">
                <ClipsJsonLeft
                    isLoading={isLoading}
                    setIsLoading={setIsLoading}
                    transcriptSRT={transcriptSRT}
                />
            </div>

            {/* RIGHT PANEL */}
            <div className="flex-1">
                <ClipsJsonRight transcriptSRT={transcriptSRT} />
            </div>
        </div>
    );
}