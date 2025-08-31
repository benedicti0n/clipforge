import { ipcMain } from "electron";
import * as fs from "fs";

/**
 * Register all file-related IPC handlers
 */
export function registerFileHandlers() {
    /**
     * Read text from a file
     */
    ipcMain.handle("file:readText", async (_e, filePath: string) => {
        return fs.readFileSync(filePath, "utf-8");
    });

    /**
     * Read binary data from a file (returns Buffer)
     */
    ipcMain.handle("file:read", async (_e, filePath: string) => {
        return fs.readFileSync(filePath); // Buffer → sent to renderer
    });
}
