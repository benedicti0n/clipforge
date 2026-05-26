import { ipcMain, app } from "electron";
import fs from "fs";
import path from "path";

export function registerListModelsHandler() {
    ipcMain.handle("list-whisper-models", async () => {
        try {
            const modelsDir = path.join(app.getPath("userData"), "whisperModels");
            if (!fs.existsSync(modelsDir)) {
                fs.mkdirSync(modelsDir, { recursive: true });
                return [];
            }

            const files = fs.readdirSync(modelsDir);
            console.log("📄 Found Whisper models:", files);
            return files;
        } catch (err) {
            console.error("❌ Failed to list Whisper models:", err);
            return [];
        }
    });
}
