//electron/ipcHandlers/saveFile.ts
import { ipcMain } from "electron";
import fs from "fs";
import path from "path";

export function registerSaveFileHandler() {
    ipcMain.handle("save-file", async (_event, filePath: string, buffer: Buffer) => {
        try {
            const dir = path.dirname(filePath);
            if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
            fs.writeFileSync(filePath, Buffer.from(buffer));
            return true;
        } catch (err) {
            console.error("❌ Failed to save file:", err);
            return false;
        }
    });
}