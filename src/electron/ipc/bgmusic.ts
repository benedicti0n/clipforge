import { ipcMain, app } from "electron";
import path from "path";
import fs from "fs/promises";

export function registerMusicHandlers() {
    const musicDir = path.join(app.getPath("userData"), "music");

    ipcMain.handle("music:save", async (_e, { name, data }) => {
        await fs.mkdir(musicDir, { recursive: true });

        const filePath = path.join(musicDir, name);
        await fs.writeFile(filePath, Buffer.from(data));

        console.log("[Music] Saved track:", filePath);
        return { path: filePath };
    });

    ipcMain.handle("music:list", async () => {
        await fs.mkdir(musicDir, { recursive: true });

        const files = await fs.readdir(musicDir);
        const result = await Promise.all(
            files.map(async (f) => {
                const fullPath = path.join(musicDir, f);
                const stat = await fs.stat(fullPath);
                return {
                    name: f,
                    path: fullPath,
                    size: stat.size,
                };
            })
        );

        return result;
    });

    ipcMain.handle("music:delete", async (_e, filePath: string) => {
        try {
            await fs.unlink(filePath);
            return true;
        } catch (err) {
            console.error("[Music] Failed to delete:", err);
            return false;
        }
    });
}
