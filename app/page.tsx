"use client";

import { useState } from "react";
import ClipStep from "./steps/ClipStep";
import SubtitleStep from "./steps/SubtitleStep";

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

export default function HomePage() {
  const [step, setStep] = useState<1 | 2>(1);
  const [clippedVideoData, setClippedVideoData] = useState<ClippedVideoData | null>(null);

  const handleClipComplete = (videoData: ClippedVideoData) => {
    setClippedVideoData(videoData);
    setStep(2);
  };

  const handleBackToClip = () => {
    setStep(1);
  };

  return (
    <main className="p-6">
      <div className="flex justify-center space-x-6 mb-6">
        <button
          onClick={() => setStep(1)}
          className={`px-4 py-2 rounded ${step === 1 ? "bg-blue-500 text-white" : "bg-gray-200"}`}
        >
          1. Clip Video
        </button>
        <button
          onClick={() => setStep(2)}
          className={`px-4 py-2 rounded ${step === 2 ? "bg-blue-500 text-white" : "bg-gray-200"} ${!clippedVideoData ? "opacity-50 cursor-not-allowed" : ""}`}
          disabled={!clippedVideoData}
        >
          2. Subtitles & Editor
        </button>
      </div>

      {step === 1 && <ClipStep onNext={handleClipComplete} />}
      {step === 2 && clippedVideoData && (
        <SubtitleStep
          onBack={handleBackToClip}
          clippedVideoUrl={clippedVideoData.url}
          originalVideoMetadata={clippedVideoData.metadata || { duration: 0, width: 1920, height: 1080, format: 'mp4' }}
        />
      )}
    </main>
  );
}
