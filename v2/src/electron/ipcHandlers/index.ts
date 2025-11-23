//electron/ipcHandlers/index.ts
import { registerWhisperModelDownloadHandler } from "./downloadFile.js";
import { registerSaveFileHandler } from "./saveFile.js";
import { registerDeleteFileHandler } from "./deleteFile.js";
import { registerOpenFolderHandler } from "./openFolder.js";
import { registerListModelsHandler } from "./listModels.js";
import { registerTranscriptionHandlers } from "./transcribe.js";
import { registerGeminiHandlers } from "./gemini.js";

export function registerIpcHandlers() {
    console.log("🔌 Registering IPC handlers...");
    registerSaveFileHandler();
    registerWhisperModelDownloadHandler();
    registerDeleteFileHandler();
    registerOpenFolderHandler();
    registerListModelsHandler();
    registerTranscriptionHandlers()
    registerGeminiHandlers()
};