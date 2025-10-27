import type { SubtitleEntry, SubtitleStyle, CustomText } from "../types/subtitleTypes.js";

/** 
 * Global scale to make libass sizes match CSS preview more closely.
 * Tweak between ~0.80–0.92 if needed for your environment.
 */
const ASS_FONT_SCALE = 0.4;

/** Build ASS header with a style derived from SubtitleStyle */
function buildAssHeader(opts: {
    style: SubtitleStyle,
    width: number,
    height: number
}) {
    const s = opts.style;

    const primary = hexToAssColor(s.fontColor, s.opacity ?? 100);          // text
    const outline = hexToAssColor(s.strokeColor, s.opacity ?? 100);        // outline
    const back = s.backgroundEnabled
        ? hexToAssColor(s.backgroundColor, s.backgroundOpacity ?? 100)       // opaque box color
        : "&H00000000"; // unused

    // BorderStyle: 1=outline, 3=opaque box
    const borderStyle = s.backgroundEnabled ? 3 : 1;

    // Stroke width -> Outline (ASS expects number; we'll scale to match visual)
    const outlineW = round2(Math.max(0, (s.strokeWidth ?? 0) * ASS_FONT_SCALE));
    const shadow = 0;

    // Bold / Italic / Underline: -1 = on, 0 = off
    const bold = s.bold ? -1 : 0;
    const italic = s.italic ? -1 : 0;
    const underline = s.underline ? -1 : 0;

    const fontName = s.fontFamily || "Arial";
    const fontSize = Math.max(1, Math.round((s.fontSize || 28) * ASS_FONT_SCALE));

    return [
        "[Script Info]",
        "ScriptType: v4.00+",
        "PlayResX: " + opts.width,
        "PlayResY: " + opts.height,
        "ScaledBorderAndShadow: yes",
        "",
        "[V4+ Styles]",
        "Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, " +
        "Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, " +
        "Alignment, MarginL, MarginR, MarginV, Encoding",
        `Style: Default,${fontName},${fontSize},${primary},&H00000000,${outline},${back},` +
        `${bold},${italic},${underline},0,100,100,0,0,${borderStyle},${outlineW},${shadow},5,20,20,20,1`,
        "",
        "[Events]",
        "Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text",
    ].join("\n");
}

/** Build Subtitle ASS (uses \pos(x,y) to honor percent x,y from style) */
export function buildAssForSubtitles(opts: {
    subs: SubtitleEntry[],
    style: SubtitleStyle,
    width: number,
    height: number,
}) {
    const header = buildAssHeader({ style: opts.style, width: opts.width, height: opts.height });
    const px = (opts.style.x / 100) * opts.width;
    const py = (opts.style.y / 100) * opts.height;

    const lines = [header];
    for (const s of opts.subs) {
        const start = srtToAssTime(s.start);
        const end = srtToAssTime(s.end);
        const text = escapeAssText(s.text);
        // center on pos; \pos places the baseline origin; alignment=5 centers around it
        lines.push(`Dialogue: 0,${start},${end},Default,,0,0,0,,{\\pos(${px.toFixed(0)},${py.toFixed(0)})}${text}`);
    }
    return lines.join("\n") + "\n";
}

/** Build Custom Texts ASS with per-item timing & position */
export function buildAssForCustomTexts(opts: {
    texts: CustomText[],
    width: number,
    height: number,
    defaultDurationSec: number,
}) {
    // Generic base style; per-item we override via \pos and inline tags
    const defaultStyle: SubtitleStyle = {
        fontSize: 28,
        fontColor: "#ffffff",
        strokeColor: "#000000",
        strokeWidth: 1,
        fontFamily: "Arial",
        x: 50, y: 50,
        backgroundEnabled: false,
        backgroundColor: "#000000",
        backgroundOpacity: 0,
        backgroundRadius: 0,
        backgroundPadding: 0,
        opacity: 100,
        bold: false, italic: false, underline: false,
    };
    const header = buildAssHeader({ style: defaultStyle, width: opts.width, height: opts.height });

    const lines = [header];
    for (const t of opts.texts) {
        const startSec = t.start ? srtToMs(t.start) / 1000 : 0;
        const endSec = t.end ? srtToMs(t.end) / 1000 : opts.defaultDurationSec;
        const start = secToAssTime(startSec);
        const end = secToAssTime(endSec);

        const px = (t.x / 100) * opts.width;
        const py = (t.y / 100) * opts.height;

        // Inline overrides (scaled for libass parity)
        const fontSize = Math.max(1, Math.round((t.fontSize ?? 28) * ASS_FONT_SCALE));
        const primary = hexToAssColor(t.fontColor || "#ffffff", t.opacity ?? 100);
        const outline = hexToAssColor(t.strokeColor || "#000000", t.opacity ?? 100);
        const outlineW = round2(Math.max(0, (t.strokeWidth ?? 0) * ASS_FONT_SCALE));
        const bold = t.bold ? "\\b1" : "\\b0";
        const italic = t.italic ? "\\i1" : "\\i0";
        const underline = t.underline ? "\\u1" : "\\u0";

        const text = escapeAssText(t.text);

        const override =
            `{\\pos(${px.toFixed(0)},${py.toFixed(0)})` +
            `\\fs${fontSize}` +
            `\\c${primary}` +
            `\\3c${outline}` +
            `\\bord${outlineW}` +
            `${bold}${italic}${underline}}`;

        lines.push(`Dialogue: 0,${start},${end},Default,,0,0,0,,${override}${text}`);
    }
    return lines.join("\n") + "\n";
}

/* ---------------- helpers ---------------- */

function srtToMs(t: string) {
    // "HH:MM:SS,mmm"
    const [hh, mm, sMs] = t.split(":");
    const [ss, ms] = sMs.split(",");
    return (
        parseInt(hh, 10) * 3600_000 +
        parseInt(mm, 10) * 60_000 +
        parseInt(ss, 10) * 1000 +
        parseInt(ms || "0", 10)
    );
}
function secToAssTime(sec: number) {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = Math.floor(sec % 60);
    const cs = Math.round((sec - Math.floor(sec)) * 100);
    return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}.${cs.toString().padStart(2, "0")}`;
}
function srtToAssTime(srt: string) {
    return secToAssTime(srtToMs(srt) / 1000);
}

function escapeAssText(text: string) {
    // ASS escapes: backslash, braces; newlines -> \N
    return text
        .replace(/\\/g, "\\\\")
        .replace(/{/g, "\\{")
        .replace(/}/g, "\\}")
        .replace(/\r?\n/g, "\\N");
}

// Convert #RRGGBB + opacity(0..100) to ASS &HAABBGGRR format.
// Note: in ASS, A=0 is opaque, 255 is fully transparent.
function hexToAssColor(hex: string, opacityPct: number) {
    const h = hex.replace(/^#/, "");
    const r = parseInt(h.slice(0, 2), 16);
    const g = parseInt(h.slice(2, 4), 16);
    const b = parseInt(h.slice(4, 6), 16);
    const alpha = 255 - Math.round(Math.max(0, Math.min(100, opacityPct)) / 100 * 255);
    const A = alpha.toString(16).toUpperCase().padStart(2, "0");
    const BB = b.toString(16).toUpperCase().padStart(2, "0");
    const GG = g.toString(16).toUpperCase().padStart(2, "0");
    const RR = r.toString(16).toUpperCase().padStart(2, "0");
    return `&H${A}${BB}${GG}${RR}`;
}

function round2(n: number) {
    return Math.round(n * 100) / 100;
}
