//electron/ipcHandlers/deleteFile.ts
import { ipcMain, app } from "electron";
import fs from "fs";
import path from "path";

export function registerDeleteFileHandler() {
    ipcMain.handle("delete-file", async (_, filePath: string) => {
        try {
            console.log("🗑️ delete-file IPC triggered for:", filePath);

            // Resolve to app data folder
            const modelsDir = path.join(app.getPath("userData"), "whisperModels");
            const absolutePath = path.join(modelsDir, path.basename(filePath));

            if (!fs.existsSync(absolutePath)) {
                console.log("⚠️ File does not exist:", absolutePath);
                return false;
            }

            fs.unlinkSync(absolutePath);
            console.log("✅ File deleted:", absolutePath);
            return true;
        } catch (err) {
            console.error("❌ Delete handler failed:", err);
            throw err;
        }
    });
}