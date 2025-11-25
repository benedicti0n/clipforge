"use client";

import { Loader2, Send, Settings } from "lucide-react";
import { Button } from "../ui/button";
import GeminiConfigSection from "./GeminiConfigSection";
import PromptSelectorSection from "./PromptSelectorSection";
import CostEstimateSection from "./CostEstimateSection";
import { useGeminiStore } from "../../store/geminiStore";
import { usePromptStore } from "../../store/promptStore";
import { useClipsResponseStore } from "../../store/clipsResponseStore";
import { useGeminiApi } from "../../../hooks/useGeminiApi";

interface ClipsJsonLeftProps {
    isLoading: boolean;
    setIsLoading: (loading: boolean) => void;
    transcriptSRT: string;
}

export default function ClipsJsonLeft({
    isLoading,
    setIsLoading,
    transcriptSRT,
}: ClipsJsonLeftProps) {
    const { keys, selectedKey, selectedModel } = useGeminiStore();
    const { getPrompt, selectedGenre } = usePromptStore();
    const { setClips, setTokenUsage, tokenUsage } = useClipsResponseStore();
    const { sendToGemini } = useGeminiApi();

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

            // ✅ Store clips in persistent store
            setClips(data.validClips);

            // ✅ Store token usage
            if (data.raw?.usageMetadata) {
                setTokenUsage({
                    input: data.raw.usageMetadata.promptTokenCount || 0,
                    output: data.raw.usageMetadata.candidatesTokenCount || 0,
                });
            }
        } catch (err: any) {
            console.error("Gemini API Error:", err);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex flex-col justify-between h-full">
            {/* Configuration Section */}
            <div className="space-y-3">
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
                    ? <><Loader2 className="w-4 h-4 animate-spin" /> Processing...</>
                    : <><Send className="w-4 h-4" /> Send to {modelLabel.charAt(0).toUpperCase() + modelLabel.slice(1)}</>}
            </Button>

            {/* Cost Estimation */}
            {(tokenUsage.input > 0 || tokenUsage.output > 0) && (
                <CostEstimateSection
                    inputTokens={tokenUsage.input}
                    outputTokens={tokenUsage.output}
                />
            )}
        </div>
    );
}