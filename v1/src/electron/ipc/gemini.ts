import { ipcMain } from "electron";
import fetch from "node-fetch";

// Allowed models for generateContent
const VALID_MODELS: Record<string, string> = {
    // v2.5
    "gemini-2.5-pro-latest": "gemini-2.5-pro",
    "gemini-2.5-flash-latest": "gemini-2.5-flash",
    "gemini-2.5-flash-lite-latest": "gemini-2.5-flash-lite",

    // v2.0
    "gemini-2.0-flash-latest": "gemini-2.0-flash",
    "gemini-2.0-flash-lite-latest": "gemini-2.0-flash-lite",

    // v1.5 (still usable if you want)
    "gemini-1.5-pro-latest": "gemini-1.5-pro",
    "gemini-1.5-flash-latest": "gemini-1.5-flash",
};


export function registerGeminiHandlers() {
    ipcMain.handle(
        "gemini:run",
        async (
            _e,
            args: { apiKey: string; model: string; prompt: string; transcript: string }
        ) => {
            const { apiKey, model, prompt, transcript } = args;
            const modelName = VALID_MODELS[model];

            if (!modelName) {
                throw new Error(
                    `Invalid model "${model}". Supported models: ${Object.keys(VALID_MODELS).join(
                        ", "
                    )}.`
                );
            }

            const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

            try {
                const res = await fetch(url, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        contents: [{ role: "user", parts: [{ text: prompt }, { text: transcript }] }],
                    }),
                });

                if (!res.ok) {
                    throw new Error(`Gemini API error ${res.status}: ${await res.text()}`);
                }

                const data = await res.json();
                return data;
            } catch (err) {
                console.error("Gemini API error:", err);
                throw err;
            }
        }
    );
}
