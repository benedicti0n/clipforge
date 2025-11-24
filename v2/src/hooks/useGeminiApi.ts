import { useState } from "react";

interface GeminiApiParams {
    apiKey: string;
    model: string;
    prompt: string;
    transcript: string;
}

interface GeminiApiResponse {
    validClips: any[];
    raw?: {
        usageMetadata?: {
            promptTokenCount: number;
            candidatesTokenCount: number;
            totalTokenCount: number;
        };
    };
}

interface UseGeminiApiReturn {
    isLoading: boolean;
    error: string | null;
    sendToGemini: (params: GeminiApiParams) => Promise<GeminiApiResponse>;
}

export function useGeminiApi(
    setResponseText: (text: string | null) => void
): UseGeminiApiReturn {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const sendToGemini = async (params: GeminiApiParams): Promise<GeminiApiResponse> => {
        const { apiKey, model, prompt, transcript } = params;

        if (!apiKey || !model) {
            throw new Error("Please select a Gemini API key and model first.");
        }

        if (!transcript) {
            throw new Error("No transcription found. Please transcribe or upload one first.");
        }

        setIsLoading(true);
        setResponseText(null);
        setError(null);

        try {
            const data = await window.electronAPI?.runGemini({
                apiKey,
                model,
                prompt,
                transcript,
            });

            if (!data) throw new Error("No response from Gemini.");
            if (!data.success) throw new Error(data.error || "Unknown Gemini error.");

            // ✅ Extract text
            let rawText = data.text || "⚠️ No valid response.";

            if (!data.text && data.raw) {
                rawText =
                    data.raw?.candidates?.[0]?.content?.parts?.[0]?.text ||
                    "⚠️ No valid response.";
            }

            // ✅ Validate and filter clips
            const parsed = JSON.parse(rawText);

            if (!Array.isArray(parsed)) {
                throw new Error("Response is not an array");
            }

            // Filter out clips shorter than 20 seconds
            const validClips = parsed.filter((clip: any) => {
                if (!clip.totalDuration) return false;

                const parts = clip.totalDuration.split(":");
                const seconds =
                    parseInt(parts[0]) * 3600 +
                    parseInt(parts[1]) * 60 +
                    parseInt(parts[2]);

                return seconds >= 20;
            });

            // Validate required fields
            if (validClips.length > 0) {
                const requiredFields = [
                    "startTime",
                    "endTime",
                    "transcriptionPart",
                    "totalDuration",
                    "viralityScore",
                    "suitableCaption",
                ];
                const firstItem = validClips[0];
                const missingFields = requiredFields.filter(
                    (field) => !(field in firstItem)
                );

                if (missingFields.length > 0) {
                    throw new Error(
                        `Missing required fields: ${missingFields.join(", ")}`
                    );
                }
            }

            const removedCount = parsed.length - validClips.length;
            console.log(
                `✅ Extracted ${validClips.length} valid clips (removed ${removedCount} clips under 20 seconds)`
            );

            if (validClips.length === 0) {
                throw new Error("No valid clips found (all were under 20 seconds)");
            }

            setResponseText(JSON.stringify(validClips, null, 2));

            // ✅ Return both clips and raw metadata
            return {
                validClips,
                raw: data.raw
            };
        } catch (err: any) {
            console.error("Gemini API Error:", err);
            const errorMessage = `❌ Error: ${err.message}`;
            setError(errorMessage);
            setResponseText(errorMessage);
            throw err;
        } finally {
            setIsLoading(false);
        }
    };

    return { isLoading, error, sendToGemini };
}