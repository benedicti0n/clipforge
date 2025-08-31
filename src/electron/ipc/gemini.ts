import { ipcMain } from "electron";
import fetch from "node-fetch";

/**
 * Register Gemini-related IPC handlers
 */
export function registerGeminiHandlers() {
    ipcMain.handle(
        "gemini:run",
        async (
            _e,
            payload: { apiKey: string; prompt: string; transcript: string }
        ) => {
            const { apiKey, prompt, transcript } = payload;

            try {
                const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${apiKey}`;

                const res = await fetch(url, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        contents: [
                            {
                                role: "user",
                                parts: [
                                    { text: prompt },
                                    { text: transcript },
                                ],
                            },
                        ],
                    }),
                });

                if (!res.ok) {
                    throw new Error(
                        `Gemini API error ${res.status}: ${await res.text()}`
                    );
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
