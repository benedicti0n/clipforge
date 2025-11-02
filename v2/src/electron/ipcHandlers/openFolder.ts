import { ipcMain, app, shell } from "electron";
import path from "path";
import fs from "fs";

export function registerOpenFolderHandler() {
    ipcMain.handle("open-whisper-folder", async () => {
        try {
            const modelsDir = path.join(app.getPath("userData"), "whisperModels");

            // Ensure folder exists
            if (!fs.existsSync(modelsDir)) {
                fs.mkdirSync(modelsDir, { recursive: true });
            }

            await shell.openPath(modelsDir);
            console.log("📂 Opened Whisper models folder:", modelsDir);
            return true;
        } catch (err) {
            console.error("❌ Failed to open folder:", err);
            return false;
        }
    });
}
