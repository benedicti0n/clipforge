// src/react/components/tabs/Transcription.tsx
"use client";

import WhisperModelSelect from "../Transcription/WhisperModelSelect";

export default function Transcription() {
    return (
        <div className="flex w-full h-full gap-6">
            {/* Left side: model selection */}
            <div className="w-1/3 border-r pr-6 flex flex-col justify-start">
                <WhisperModelSelect />
            </div>

            {/* Right side: transcription output (placeholder for now) */}
            <div className="flex-1 p-6">
                <p className="text-muted-foreground text-sm">
                    Transcription results will appear here.
                </p>
            </div>
        </div>
    );
}
