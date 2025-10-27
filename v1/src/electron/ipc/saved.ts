import { ipcMain, shell, app } from "electron";
import fs from "fs/promises";
import path from "path";

export function registerSavedHandlers() {
    ipcMain.handle("saved:list", async () => {
        const userData = app.getPath("userData");

        const dirs = {
            clip: path.join(userData, "clips"),
            font: path.join(userData, "fonts"),
            video: path.join(userData, "uploads"),
            bgmusic: path.join(userData, "bgmusic"),
            preset: path.join(userData, "presets"),
        };

        const items: { name: string; type: string; path: string; size: number }[] = [];

        for (const [type, dir] of Object.entries(dirs)) {
            try {
                const files = await fs.readdir(dir);
                for (const f of files) {
                    const fullPath = path.join(dir, f);
                    const stat = await fs.stat(fullPath);
                    if (stat.isFile()) {
                        items.push({ name: f, type, path: fullPath, size: stat.size });
                    }
                }
            } catch {
                // dir may not exist
            }
        }

        return items;
    });

    ipcMain.handle("saved:open", async (_e, filePath: string) => {
        await shell.openPath(filePath);
    });

    ipcMain.handle("saved:delete", async (_e, filePath: string) => {
        try {
            await fs.unlink(filePath);
            return true;
        } catch (err) {
            console.error("[Saved] Failed to delete:", err);
            return false;
        }
    });
}
