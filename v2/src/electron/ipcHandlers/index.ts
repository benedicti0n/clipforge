//electron/ipcHandlers/index.ts
import { registerWhisperModelDownloadHandler } from "./downloadFile.js";
import { registerSaveFileHandler } from "./saveFile.js";
import { registerDeleteFileHandler } from "./deleteFile.js";
import { registerOpenFolderHandler } from "./openFolder.js";

export function registerIpcHandlers() {
    console.log("🔌 Registering IPC handlers...");
    registerSaveFileHandler();
    registerWhisperModelDownloadHandler();
    registerDeleteFileHandler();
    registerOpenFolderHandler();
};

