import { ipcMain } from "electron";
import { saveFontToDisk } from "../helpers/fonts.js";

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
}
