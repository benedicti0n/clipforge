import { ipcMain } from "electron";
import { GoogleGenerativeAI } from "@google/generative-ai";

// ✅ Correct model mapping - Gemini 1.5 models are RETIRED, use 2.5 models
const VALID_MODELS: Record<string, string> = {
    // Gemini 2.5 series (current stable models)
    "gemini-2.5-pro-latest": "gemini-2.5-pro",
    "gemini-2.5-flash-latest": "gemini-2.5-flash",
    "gemini-2.5-flash-lite-latest": "gemini-2.5-flash-lite",

    // Gemini 2.0 series (also available)
    "gemini-2.0-flash-latest": "gemini-2.0-flash",
    "gemini-2.0-flash-lite-latest": "gemini-2.0-flash-lite",
};

export function registerGeminiHandlers() {
    ipcMain.handle(
        "gemini:run",
        async (
            _e,
            args: { apiKey: string; model: string; prompt: string; transcript: string }
        ) => {
            const { apiKey, model, prompt, transcript } = args;
            const resolvedModel = VALID_MODELS[model];

            if (!resolvedModel) {
                throw new Error(
                    `❌ Invalid model "${model}". Supported: ${Object.keys(VALID_MODELS).join(", ")}`
                );
            }

            if (!apiKey) throw new Error("❌ Missing Gemini API key.");
            if (!prompt || !transcript)
                throw new Error("❌ Missing prompt or transcript input.");

            try {
                // ✅ Initialize Gemini SDK client
                const genAI = new GoogleGenerativeAI(apiKey);
                const modelInstance = genAI.getGenerativeModel({ model: resolvedModel });

                // ✅ Combine prompt and transcript for context
                const fullPrompt = `${prompt}\n\nTRANSCRIPT:\n${transcript}`;

                // ✅ Generate content using the official SDK
                const result = await modelInstance.generateContent(fullPrompt);

                // ✅ Extract clean text output
                const rawText = result?.response?.text?.() || "⚠️ No text response from Gemini.";

                // ✅ Extract only serializable data for IPC
                const response = result?.response;
                const serializableData = {
                    text: response?.text?.() || "",
                    candidates: response?.candidates?.map(candidate => ({
                        content: {
                            parts: candidate?.content?.parts?.map(part => ({
                                text: part?.text || ""
                            })) || []
                        },
                        finishReason: candidate?.finishReason,
                        safetyRatings: candidate?.safetyRatings
                    })) || [],
                    usageMetadata: response?.usageMetadata ? {
                        promptTokenCount: response.usageMetadata.promptTokenCount,
                        candidatesTokenCount: response.usageMetadata.candidatesTokenCount,
                        totalTokenCount: response.usageMetadata.totalTokenCount
                    } : null
                };

                return {
                    success: true,
                    model: resolvedModel,
                    text: rawText,
                    raw: serializableData, // ✅ Only serializable data
                };
            } catch (error: any) {
                console.error("❌ Gemini API Error:", error.message || error);
                return {
                    success: false,
                    error: error.message || "Unknown Gemini API error",
                };
            }
        }
    );

    console.log("🧠 Gemini IPC handler registered successfully (using SDK, v1 models)");
}