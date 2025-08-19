"use client";

interface Props {
    onBack: () => void;
}

export default function SubtitleStep({ onBack }: Props) {
    return (
        <div className="space-y-4">
            <h1 className="text-2xl font-bold">Step 2: Subtitles & Editor</h1>
            <p className="text-gray-600">Here we will add subtitle generation, trimming sliders, and overlays.</p>

            <button
                onClick={onBack}
                className="bg-gray-500 text-white px-4 py-2 rounded"
            >
                ← Back
            </button>
        </div>
    );
}
