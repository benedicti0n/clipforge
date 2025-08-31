import path from "path";
import { app } from "electron"
import fs from "fs/promises"


interface CustomText {
    text: string;
    fontSize: number;
    fontColor: string;
    strokeColor: string;
    fontFamily: string;
    x: number; // 0..100 (%)
    y: number; // 0..100 (%)
}

export async function ensureClipsDir(): Promise<string> {
    const clipsPath = path.join(app.getPath("userData"), "clips");
    await fs.mkdir(clipsPath, { recursive: true });
    return clipsPath;
}

function escapeDrawtextText(text: string): string {
    return text
        .replace(/\\/g, "\\\\")
        .replace(/:/g, "\\:")
        .replace(/'/g, "\\'");
}

export function buildCustomDrawtext(t: CustomText): string {
    const safe = escapeDrawtextText(t.text);
    return [
        `drawtext=text='${safe}'`,
        `fontcolor=${t.fontColor}`,
        `fontsize=${t.fontSize}`,
        t.fontFamily ? `font=${t.fontFamily}` : "",
        `x=(w-text_w)*${t.x / 100}`,
        `y=(h-text_h)*${t.y / 100}`,
        `bordercolor=${t.strokeColor}`,
        `borderw=2`,
    ]
        .filter(Boolean)
        .join(":");
}

// Convert #RRGGBB → &HBBGGRR& (ASS color format)
export function hexToAssColor(hex: string): string {
    const m = hex.trim().match(/^#?([0-9a-fA-F]{6})$/);
    if (!m) return "&HFFFFFF&"; // fallback white
    const rr = m[1].slice(0, 2);
    const gg = m[1].slice(2, 4);
    const bb = m[1].slice(4, 6);
    return `&H${bb}${gg}${rr}&`;
}