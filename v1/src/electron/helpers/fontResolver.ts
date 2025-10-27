import path from "path";

const FONT_DIR = path.join(process.resourcesPath, "assets", "fonts");

const FONT_MAP: Record<string, string> = {
    Arial: path.join(FONT_DIR, "Arial.ttf"),
    Helvetica: path.join(FONT_DIR, "Helvetica.ttf"),
    "Times New Roman": path.join(FONT_DIR, "TimesNewRoman.ttf"),
    "Courier New": path.join(FONT_DIR, "CourierNew.ttf"),
    Verdana: path.join(FONT_DIR, "Verdana.ttf"),
};

export function resolveFontFile(fontFamily: string): string | null {
    return FONT_MAP[fontFamily] || null;
}
