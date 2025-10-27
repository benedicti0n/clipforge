import { app, ipcMain } from "electron";
import { saveFontToDisk } from "../helpers/fonts.js";
import path from "path";
import fs from "fs"

const fontsDir = path.join(app.getPath("userData"), "fonts");

export function registerFontHandlers() {
    ipcMain.handle("fonts:save", async (_e, { name, data, ext }) => {
        try {
            // Convert ArrayBuffer → Buffer (if needed)
            const buf = Buffer.isBuffer(data) ? data : Buffer.from(data);

            const filePath = await saveFontToDisk(name, buf, ext);

            // Always return clean string path
            return filePath;
        } catch (err) {
            console.error("[Fonts] Failed to save font", err);
            throw err;
        }
    });

    ipcMain.handle("fonts:list", async () => {
        if (!fs.existsSync(fontsDir)) {
            return [];
        }

        return fs.readdirSync(fontsDir).map((file) => {
            const name = file.replace(/\.(ttf|otf)$/i, "");
            return { name, path: path.join(fontsDir, file) };
        });
    });
}
