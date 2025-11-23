"use client";

import { useState, useMemo } from "react";
import ClipsJsonLeft from "../ClipsJson/ClipsJsonLeft";
import ClipsJsonRight from "../ClipsJson/ClipsJsonRight";
import { useTranscriptionStore } from "../../store/transcriptionStore";

export default function ClipsJson() {
    const [isLoading, setIsLoading] = useState(false);
    const [responseText, setResponseText] = useState<string | null>(null);
    const { segments, uploadedSrt } = useTranscriptionStore();

    // ✅ Determine which transcription text to use
    const transcriptSRT = useMemo(() => {
        if (uploadedSrt) return uploadedSrt.trim();
        if (segments && segments.length > 0)
            return segments.map((s) => `${s.text}`).join("\n");
        return "";
    }, [uploadedSrt, segments]);

    return (
        <div className="flex h-full gap-4">
            {/* LEFT PANEL */}
            <div className="w-1/3">
                <ClipsJsonLeft
                    isLoading={isLoading}
                    setIsLoading={setIsLoading}
                    responseText={responseText}
                    setResponseText={setResponseText}
                    transcriptSRT={transcriptSRT}
                />
            </div>

            {/* RIGHT PANEL */}
            <div className="flex-1">
                <ClipsJsonRight
                    responseText={responseText}
                    transcriptSRT={transcriptSRT}
                />
            </div>
        </div>
    );
}