//electron/ipcHandlers/saveFile.ts
import { ipcMain } from "electron";
import fs from "fs";
import path from "path";

export function registerSaveFileHandler() {
    ipcMain.handle("save-file", async (_, savePath: string, buffer: Buffer) => {
        const dir = path.dirname(savePath);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(savePath, buffer);
        return true;
    });
}