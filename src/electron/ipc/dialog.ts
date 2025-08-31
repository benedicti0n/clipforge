import { dialog, ipcMain } from "electron";

export function registerDialogHandlers() {
    // Open a video file picker
    ipcMain.handle("dialog:openVideo", async () => {
        const result = await dialog.showOpenDialog({
            properties: ["openFile"],
            filters: [
                { name: "Video Files", extensions: ["mp4", "mov", "avi", "mkv", "webm"] },
            ],
        });

        if (result.canceled || result.filePaths.length === 0) return null;
        return result.filePaths[0]; // ✅ return path back to renderer
    });

    // Open an SRT file picker
    ipcMain.handle("dialog:openSRT", async () => {
        const result = await dialog.showOpenDialog({
            properties: ["openFile"],
            filters: [{ name: "SubRip Subtitle", extensions: ["srt"] }],
        });

        if (result.canceled || result.filePaths.length === 0) return null;
        return result.filePaths[0];
    });
}
