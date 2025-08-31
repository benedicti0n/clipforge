import { registerDialogHandlers } from "./dialog.js";
import { registerFileHandlers } from "./file.js";
import { registerClipHandlers } from "./clip.js";
import { registerWhisperHandlers } from "./whisper.js";
import { registerGeminiHandlers } from "./gemini.js";
import { registerKeysHandlers } from "./keys.js";
import { registerSkiaHandlers } from './skia.js'
/**
 * Register all IPC handlers across the app.
 * Call this once from main.ts after app.whenReady().
 */
export function registerIpcHandlers() {
    registerDialogHandlers();
    registerFileHandlers();
    registerClipHandlers();
    registerWhisperHandlers();
    registerGeminiHandlers();
    registerKeysHandlers();
    registerSkiaHandlers();
}
