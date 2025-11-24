"use client";

import { Settings } from "lucide-react";
import { Button } from "../ui/button";
import GeminiConfigSection from "./GeminiConfigSection";
import PromptSelectorSection from "./PromptSelectorSection";
import CostEstimateSection from "./CostEstimateSection";
import { useGeminiStore } from "../../store/geminiStore";
import { usePromptStore } from "../../store/promptStore";
import { useGeminiApi } from "../../../hooks/useGeminiApi";
import { useState } from "react";

interface ClipsJsonLeftProps {
    isLoading: boolean;
    setIsLoading: (loading: boolean) => void;
    responseText: string | null;
    setResponseText: (text: string | null) => void;
    transcriptSRT: string;
}

export default function ClipsJsonLeft({
    isLoading,
    setIsLoading,
    responseText,
    setResponseText,
    transcriptSRT,
}: ClipsJsonLeftProps) {
    const { keys, selectedKey, selectedModel } = useGeminiStore();
    const { getPrompt, selectedGenre } = usePromptStore();
    const { sendToGemini } = useGeminiApi(setResponseText);
    const [tokenUsage, setTokenUsage] = useState({ input: 0, output: 0 });
    const activeKey = keys.find((k) => k.name === selectedKey)?.key || "";
    const promptText = (selectedGenre && getPrompt(selectedGenre)) || "No prompt selected.";
    const modelLabel = selectedModel?.replace("gemini-", "Gemini ").split("-latest")[0] || "Gemini";

    const handleSendToGemini = async () => {
        if (!activeKey || !selectedModel) {
            alert("Please select a Gemini API key and model first.");
            return;
        }

        if (!transcriptSRT) {
            alert("No transcription found. Please transcribe or upload one first.");
            return;
        }

        setIsLoading(true);

        try {
            const data = await sendToGemini({
                apiKey: activeKey,
                model: selectedModel,
                prompt: promptText,
                transcript: transcriptSRT,
            });

            console.log("Gemini data:", data);

            if (data.raw?.usageMetadata) {
                setTokenUsage({
                    input: data.raw.usageMetadata.promptTokenCount || 0,
                    output: data.raw.usageMetadata.candidatesTokenCount || 0,
                });
            }
        } catch (err: any) {
            console.error("Gemini API Error:", err);
            const errorMessage = `❌ Error: ${err.message}`;
            setResponseText(errorMessage);
            throw err;
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="space-y-6 flex flex-col justify-between h-full">
            {/* Configuration Section */}
            <div className="space-y-4">
                <h3 className="text-md font-bold flex gap-2 items-center">
                    <Settings className="w-4 h-4" /> Configuration
                </h3>

                <GeminiConfigSection />
                <PromptSelectorSection />
            </div>

            {/* Action Button */}
            <Button
                onClick={handleSendToGemini}
                disabled={isLoading || !selectedModel}
                className="text-sm"
            >
                {isLoading
                    ? "Processing..."
                    : `Send to ${modelLabel.charAt(0).toUpperCase() + modelLabel.slice(1)}`}
            </Button>

            {/* Cost Estimation */}
            <CostEstimateSection
                inputTokens={tokenUsage.input}
                outputTokens={tokenUsage.output}
            />
        </div>
    );
}