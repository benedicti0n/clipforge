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

                // ✅ Configure model with JSON response format, schema, and system instruction
                const modelInstance = genAI.getGenerativeModel({
                    model: resolvedModel,
                    generationConfig: {
                        responseMimeType: "application/json",
                        temperature: 0.7,
                        responseSchema: {
                            type: "array",
                            items: {
                                type: "object",
                                properties: {
                                    startTime: {
                                        type: "string",
                                        description: "Start time in HH:MM:SS format"
                                    },
                                    endTime: {
                                        type: "string",
                                        description: "End time in HH:MM:SS format"
                                    },
                                    transcriptionPart: {
                                        type: "string",
                                        description: "Full transcript segment"
                                    },
                                    totalDuration: {
                                        type: "string",
                                        description: "Duration in HH:MM:SS format"
                                    },
                                    viralityScore: {
                                        type: "number",
                                        description: "Score from 1-10"
                                    },
                                    contentType: {
                                        type: "string",
                                        description: "Type of content (optional)"
                                    },
                                    suitableCaption: {
                                        type: "string",
                                        description: "Caption for the clip"
                                    }
                                },
                                required: ["startTime", "endTime", "transcriptionPart", "totalDuration", "viralityScore", "suitableCaption"]
                            }
                        }
                    },
                    systemInstruction: `You are a professional viral video editor. 

CRITICAL RULES:
1. Extract ONLY clips that are MINIMUM 20 SECONDS long (absolute requirement)
2. Each clip must be COMPLETE and STANDALONE (full thoughts, stories, or concepts)
3. NEVER extract incomplete sentences, fragments, or mid-conversation clips
4. Calculate totalDuration correctly (endTime - startTime)
5. Only give high virality scores (8-10) to truly engaging, complete segments
6. Output ONLY valid JSON array - no explanations, no markdown, just JSON

WHAT TO EXTRACT:
✓ Complete stories with setup, conflict, and resolution
✓ Full explanations with examples and takeaways
✓ Entire motivational segments with context
✓ Self-contained rants, reactions, or hot takes

WHAT NOT TO EXTRACT:
✗ Random sentences under 20 seconds
✗ Incomplete thoughts or sentence fragments
✗ Transitional phrases or filler
✗ Clips that need prior context to make sense`
                });

                // ✅ Enhanced prompt with strict JSON enforcement
                const fullPrompt = `${prompt}

CRITICAL INSTRUCTIONS:
- Output MUST be a valid JSON array
- NO markdown formatting (no \`\`\`json)
- NO explanations before or after
- NO prose or commentary
- Start with [ and end with ]

TRANSCRIPT:
${transcript}

Remember: Output ONLY the JSON array. Nothing else.`;

                // ✅ Generate content using the official SDK
                const result = await modelInstance.generateContent(fullPrompt);

                // ✅ Extract clean text output
                let rawText = result?.response?.text?.() || "⚠️ No text response from Gemini.";

                // ✅ Clean up any markdown formatting if present
                rawText = rawText.trim();
                if (rawText.startsWith("```json")) {
                    rawText = rawText.replace(/```json\n?/g, "").replace(/```\n?$/g, "").trim();
                } else if (rawText.startsWith("```")) {
                    rawText = rawText.replace(/```\n?/g, "").replace(/```\n?$/g, "").trim();
                }

                // ✅ Validate JSON
                try {
                    const parsed = JSON.parse(rawText);
                    if (!Array.isArray(parsed)) {
                        throw new Error("Response is not a JSON array");
                    }
                    // Re-stringify to ensure clean formatting
                    rawText = JSON.stringify(parsed, null, 2);
                } catch (parseError: any) {
                    console.error("❌ JSON Parse Error:", parseError.message);
                    console.error("Raw response:", rawText);
                    return {
                        success: false,
                        error: `Failed to parse JSON response: ${parseError.message}`,
                        rawResponse: rawText,
                    };
                }

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
                    raw: serializableData,
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

    console.log("🧠 Gemini IPC handler registered successfully (using SDK with JSON mode)");
}