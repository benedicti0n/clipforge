"use client";

import { useState } from "react";
import ClipStep from "./steps/ClipStep";
import SubtitleStep from "./steps/SubtitleStep";

export default function HomePage() {
  const [step, setStep] = useState<1 | 2>(1);

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
          className={`px-4 py-2 rounded ${step === 2 ? "bg-blue-500 text-white" : "bg-gray-200"}`}
        >
          2. Subtitles & Editor
        </button>
      </div>

      {step === 1 && <ClipStep onNext={() => setStep(2)} />}
      {step === 2 && <SubtitleStep onBack={() => setStep(1)} />}
    </main>
  );
}
