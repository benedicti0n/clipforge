import path from "path";
import fs from "fs/promises";
import { app } from "electron";
import { FontLibrary } from "skia-canvas";

/**
 * Directory where uploaded fonts are stored.
 */
export const getFontsDir = () => {
    return path.join(app.getPath("userData"), "fonts");
};

/**
 * Save a font file buffer to disk.
 */
export async function saveFontToDisk(name: string, data: Buffer, ext: string) {
    const fontsDir = getFontsDir();
    await fs.mkdir(fontsDir, { recursive: true });

    const safeName = name.replace(/[^a-z0-9_\-]/gi, "_");
    const filePath = path.join(fontsDir, `${safeName}${ext}`);

    await fs.writeFile(filePath, data);
    console.log(`[Fonts] Saved font: ${safeName}${ext}`);

    // ✅ return clean string
    return filePath;
}

/**
 * Register fonts with Skia before rendering.
 */
export function registerFonts(fonts: { name: string; path: string }[]) {
    fonts.forEach((f) => {
        if (f.path && typeof f.path === "string") {
            try {
                console.log("[Skia] Registering font:", f.name, f.path);
                FontLibrary.use({ [f.name]: f.path }); // ✅ name → path
            } catch (err) {
                console.error(`[Skia] Failed to load font ${f.name} from ${f.path}`, err);
            }
        } else {
            console.warn("[Skia] Skipped invalid font entry:", f);
        }
    });
}
