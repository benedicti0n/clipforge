import { ipcMain, app } from "electron";
import path from "path";
import fs from "fs/promises";

export function registerMusicHandlers() {
    const musicDir = path.join(app.getPath("userData"), "music");
    const metaFile = path.join(musicDir, "music.json");

    async function loadMeta() {
        try {
            const raw = await fs.readFile(metaFile, "utf-8");
            return JSON.parse(raw);
        } catch {
            return [];
        }
    }

    async function saveMeta(data: any[]) {
        await fs.writeFile(metaFile, JSON.stringify(data, null, 2));
    }

    ipcMain.handle("music:save", async (_e, { name, data, category }) => {
        await fs.mkdir(musicDir, { recursive: true });

        const filePath = path.join(musicDir, name);
        await fs.writeFile(filePath, Buffer.from(data));

        const stat = await fs.stat(filePath);

        const meta = await loadMeta();
        const entry = {
            name,
            path: filePath,
            size: stat.size,
            category: category || "Uncategorized",
        };

        // overwrite if exists
        const filtered = meta.filter((m: any) => m.path !== filePath);
        filtered.push(entry);
        await saveMeta(filtered);

        return entry;
    });

    ipcMain.handle("music:list", async () => {
        await fs.mkdir(musicDir, { recursive: true });
        return loadMeta();
    });

    ipcMain.handle("music:delete", async (_e, filePath: string) => {
        try {
            await fs.unlink(filePath);
            const meta = await loadMeta();
            const updated = meta.filter((m: any) => m.path !== filePath);
            await saveMeta(updated);
            return true;
        } catch (err) {
            console.error("[Music] Failed to delete:", err);
            return false;
        }
    });
}
