import { app, ipcMain, IpcMainInvokeEvent } from "electron";
import path from "path";
import fs from "fs";
import { spawn } from "node:child_process";
import { Canvas, loadImage } from "skia-canvas";
type SKRSContext2D = CanvasRenderingContext2D;
import ffmpegStatic from "ffmpeg-static";
import ffprobeStatic from "ffprobe-static";
import { SubtitleStyle, CustomText, SubtitleEntry } from "../../types/subtitleTypes.js"

type Nullable<T> = T | null | undefined;

interface RenderPayload {
    filePath: string;
    subtitles: SubtitleEntry[];
    subtitleStyle: SubtitleStyle;
    customTexts: CustomText[];
    index: number;
    fonts: { name: string; path: string }[];
    bgMusic?: { path: string; volume: number };
    videoDimensions: { width: number; height: number; aspectRatio: number };
}

// ================== Utils ==================
function srtToSeconds(srtTime: string): number {
    // "HH:MM:SS,mmm"
    const [hms, ms] = srtTime.split(",");
    const [hh, mm, ss] = hms.split(":").map(Number);
    return hh * 3600 + mm * 60 + ss + (Number(ms) || 0) / 1000;
}

function hexWithAlpha(hex: string, alpha0to100: number): string {
    // hex "#RRGGBB" → "#RRGGBBAA"
    const a = Math.max(0, Math.min(100, alpha0to100));
    const alpha = Math.round((a / 100) * 255)
        .toString(16)
        .padStart(2, "0");
    return `${hex}${alpha}`;
}

function roundedRect(ctx: SKRSContext2D, x: number, y: number, w: number, h: number, r: number) {
    const radius = Math.min(r, Math.min(w, h) / 2);
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.arcTo(x + w, y, x + w, y + h, radius);
    ctx.arcTo(x + w, y + h, x, y + h, radius);
    ctx.arcTo(x, y + h, x, y, radius);
    ctx.arcTo(x, y, x + w, y, radius);
    ctx.closePath();
}

function ensureDir(p: string) {
    fs.mkdirSync(p, { recursive: true });
}

function rmrf(p: string) {
    try { fs.rmSync(p, { recursive: true, force: true }); } catch { }
}

async function probe(input: string): Promise<{ duration: number; fps: number; width: number; height: number }> {
    return new Promise((resolve, reject) => {
        const args = [
            "-v", "error",
            "-print_format", "json",
            "-show_streams",
            "-show_format",
            input,
        ];
        const proc = spawn(ffprobeStatic.path, args);
        let out = "";
        let err = "";
        proc.stdout.on("data", d => (out += d.toString()));
        proc.stderr.on("data", d => (err += d.toString()));
        proc.on("close", () => {
            try {
                const json = JSON.parse(out);
                const vstream = (json.streams || []).find((s: any) => s.codec_type === "video");
                const r = vstream?.r_frame_rate || vstream?.avg_frame_rate || "30/1";
                const [num, den] = r.split("/").map(Number);
                const fps = den ? num / den : Number(r) || 30;
                const duration = Number(json.format?.duration || vstream?.duration || 0);
                const width = vstream?.width || 1920;
                const height = vstream?.height || 1080;
                resolve({ duration, fps, width, height });
            } catch (e) {
                reject(new Error(`ffprobe parse error: ${e}\n${err}`));
            }
        });
    });
}

// ================== Drawers ==================
function applyFontRegistration(fonts: { name: string; path: string }[]) {
    for (const f of fonts) {
        try {
            if ((Canvas as any).FontLibrary?.use) {
                (Canvas as any).FontLibrary.use(f.path, f.name);
            } else if ((Canvas as any).Fonts?.use) {
                (Canvas as any).Fonts.use(f.path, f.name);
            } else {
                console.warn("[skia] No font library available in Canvas, skipping font registration");
            }
        } catch (e) {
            console.warn("[skia] failed to register font:", f, e);
        }
    }
}

function setCtxFont(ctx: SKRSContext2D, fontFamily: string, fontSize: number, bold?: boolean, italic?: boolean) {
    const weight = bold ? "700" : "400";
    const style = italic ? "italic" : "normal";
    ctx.font = `${style} ${weight} ${fontSize}px "${fontFamily}"`;
}

function drawTextWithStyle(
    ctx: any,
    text: string,
    xPct: number,
    yPct: number,
    videoW: number,
    videoH: number,
    options: {
        fontFamily: string;
        fontSize: number;
        fill: string;
        stroke?: string;
        strokeWidth?: number;
        opacity?: number;
        bold?: boolean;
        italic?: boolean;
        underline?: boolean;
        bg?: { enabled: boolean; color: string; opacity: number; radius: number; padding: number };
        center?: boolean; // default true
    }
) {
    const x = (xPct / 100) * videoW;
    const y = (yPct / 100) * videoH;
    const {
        fontFamily, fontSize, fill, stroke, strokeWidth = 0, opacity = 100,
        bold, italic, underline,
        bg = { enabled: false, color: "#000000", opacity: 0, radius: 0, padding: 0 },
        center = true,
    } = options;

    ctx.save();
    ctx.globalAlpha = Math.max(0, Math.min(1, opacity / 100));
    setCtxFont(ctx, fontFamily, fontSize, bold, italic);
    ctx.textBaseline = "middle";
    ctx.textAlign = center ? "center" : "left";

    // Measure
    const metrics = ctx.measureText(text);
    const textW = metrics.width;
    // Approx line height (Canvas text metrics are limited)
    const lineH = fontSize * 1.2;

    // Background rounded rect
    if (bg.enabled && bg.opacity > 0) {
        const pad = bg.padding;
        const left = (center ? x - textW / 2 : x) - pad;
        const top = y - lineH / 2 - pad;
        const w = textW + pad * 2;
        const h = lineH + pad * 2;

        ctx.fillStyle = hexWithAlpha(bg.color, bg.opacity);
        roundedRect(ctx, left, top, w, h, bg.radius);
        ctx.fill();
    }

    // Stroke
    if (stroke && strokeWidth > 0) {
        ctx.lineWidth = strokeWidth * 2; // make stroke more visible around glyphs
        ctx.strokeStyle = stroke;
        ctx.strokeText(text, x, y);
    }

    // Fill
    ctx.fillStyle = fill;
    ctx.fillText(text, x, y);

    // Underline (approximate)
    if (underline) {
        const underlineY = y + lineH * 0.35;
        const startX = center ? x - textW / 2 : x;
        const endX = center ? x + textW / 2 : x + textW;
        ctx.lineWidth = Math.max(1, fontSize * 0.07);
        ctx.beginPath();
        ctx.moveTo(startX, underlineY);
        ctx.lineTo(endX, underlineY);
        ctx.strokeStyle = fill;
        ctx.stroke();
    }

    ctx.restore();
}

function isActiveForTime(tSec: number, start?: string, end?: string) {
    if (!start && !end) return true;
    const s = start ? srtToSeconds(start) : -Infinity;
    const e = end ? srtToSeconds(end) : Infinity;
    return tSec >= s && tSec <= e;
}

// ================== Frame Pipeline ==================
async function extractFrames(input: string, outDir: string): Promise<{ count: number }> {
    // We do a straight decode to PNGs, no -vf filters.
    // Naming: frame_%06d.png
    await new Promise<void>((resolve, reject) => {
        const args = [
            "-y",
            "-i", input,
            path.join(outDir, "frame_%06d.png"),
        ];
        const p = spawn(ffmpegStatic as string, args);
        p.on("error", reject);
        p.on("close", (code) => code === 0 ? resolve() : reject(new Error("ffmpeg extract failed")));
    });

    const count = fs.readdirSync(outDir).filter(f => f.endsWith(".png")).length;
    return { count };
}

async function encodeFromFrames(params: {
    framesDir: string;
    fps: number;
    outPath: string;
    srcVideo: string;
    bgMusic?: { path: string; volume: number };
}) {
    const { framesDir, fps, outPath, srcVideo, bgMusic } = params;

    const args = [
        "-y",
        "-framerate", String(fps),
        "-i", path.join(framesDir, "frame_%06d.png"), // video
        "-i", srcVideo,                               // original audio
    ];

    if (bgMusic) {
        args.push("-i", bgMusic.path); // bg audio
    }

    // Video codec
    args.push("-c:v", "libx264", "-pix_fmt", "yuv420p", "-preset", "medium", "-crf", "18");

    if (bgMusic) {
        args.push(
            "-filter_complex",
            `[2:a]volume=${bgMusic.volume || 1}[bg];[1:a][bg]amix=inputs=2:dropout_transition=0:normalize=0[aout]`,
            "-map", "0:v:0", // our PNG video
            "-map", "[aout]", // mixed audio
            "-c:a", "aac",
            "-shortest"
        );
    } else {
        args.push(
            "-map", "0:v:0", // our PNG video
            "-map", "1:a:0?", // original audio
            "-c:a", "aac",
            "-shortest"
        );
    }

    args.push(outPath);

    await new Promise<void>((resolve, reject) => {
        const p = spawn(ffmpegStatic as string, args);
        p.on("error", reject);
        p.stderr.on("data", d => console.log("[ffmpeg]", d.toString())); // 👈 log errors
        p.on("close", (code) => code === 0 ? resolve() : reject(new Error("ffmpeg encode failed")));
    });
}

// ================== Main Render ==================
async function renderWithSkia(
    event: IpcMainInvokeEvent,
    payload: RenderPayload
): Promise<string> {
    console.log("[skia] Render requested for:", payload.filePath);

    const {
        filePath,
        subtitles,
        subtitleStyle,
        customTexts,
        fonts,
        bgMusic,
        videoDimensions,
    } = payload;

    console.log("[skia] Subtitles count:", subtitles.length);
    console.log("[skia] Custom texts count:", customTexts.length);
    console.log("[skia] Fonts passed:", fonts.map(f => f.name));
    if (bgMusic) console.log("[skia] Background music enabled:", bgMusic.path);

    applyFontRegistration(fonts);

    console.log("[skia] Probing video metadata...");
    const meta = await probe(filePath);
    console.log("[skia] Probe result:", meta);

    const width = videoDimensions?.width || meta.width;
    const height = videoDimensions?.height || meta.height;
    const fps = meta.fps || 30;
    const duration = meta.duration || 0;

    console.log(`[skia] Video width=${width}, height=${height}, fps=${fps}, duration=${duration}s`);

    // Workspace
    const baseDir = path.join(app.getPath("userData"), "renders", `${Date.now()}`);
    const rawFramesDir = path.join(baseDir, "raw_frames");
    const outFramesDir = path.join(baseDir, "out_frames");
    ensureDir(rawFramesDir);
    ensureDir(outFramesDir);

    console.log("[skia] Extracting frames...");
    await extractFrames(filePath, rawFramesDir);
    console.log("[skia] Frame extraction done");

    const frameFiles = fs
        .readdirSync(rawFramesDir)
        .filter(f => f.endsWith(".png"))
        .sort();

    console.log("[skia] Total frames to process:", frameFiles.length);

    const total = frameFiles.length;
    let processed = 0;

    // Canvas reused for speed
    const canvas = new Canvas(width, height);
    const ctx = canvas.getContext("2d") as any;

    // 🔹 Draw per-frame with sequential naming
    for (let i = 0; i < frameFiles.length; i++) {
        const srcFrame = frameFiles[i];
        const frameIdx = i; // 0-based
        const tSec = frameIdx / fps;

        // Load source frame
        const img = await loadImage(path.join(rawFramesDir, srcFrame));
        ctx.clearRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        // Active subtitle(s) for this timestamp
        const actSubs = subtitles.filter(s => {
            const start = srtToSeconds(s.start);
            const end = srtToSeconds(s.end);
            return tSec >= start && tSec <= end;
        });

        // Draw subtitles
        for (const s of actSubs) {
            drawTextWithStyle(ctx, s.text, subtitleStyle.x, subtitleStyle.y, width, height, {
                fontFamily: subtitleStyle.fontFamily,
                fontSize: subtitleStyle.fontSize,
                fill: subtitleStyle.fontColor,
                stroke: subtitleStyle.strokeColor,
                strokeWidth: subtitleStyle.strokeWidth,
                opacity: subtitleStyle.opacity,
                bold: subtitleStyle.bold,
                italic: subtitleStyle.italic,
                underline: subtitleStyle.underline,
                bg: {
                    enabled: subtitleStyle.backgroundEnabled,
                    color: subtitleStyle.backgroundColor,
                    opacity: subtitleStyle.backgroundOpacity,
                    radius: subtitleStyle.backgroundRadius,
                    padding: subtitleStyle.backgroundPadding,
                },
                center: true,
            });
        }

        // Draw custom texts
        for (const t of customTexts) {
            if (!isActiveForTime(tSec, t.start, t.end)) continue;
            drawTextWithStyle(ctx, t.text, t.x, t.y, width, height, {
                fontFamily: t.fontFamily,
                fontSize: t.fontSize,
                fill: t.fontColor,
                stroke: t.strokeColor,
                strokeWidth: t.strokeWidth,
                opacity: t.opacity ?? 100,
                bold: t.bold,
                italic: t.italic,
                underline: t.underline,
                bg: { enabled: false, color: "#000000", opacity: 0, radius: 0, padding: 0 },
                center: true,
            });
        }

        // 🔹 Save with sequential naming
        const outName = `frame_${String(i + 1).padStart(6, "0")}.png`;
        const outPng = path.join(outFramesDir, outName);
        await fs.promises.writeFile(outPng, await canvas.toBuffer("png"));

        processed++;
        if (processed % 50 === 0 || processed === total) {
            console.log(`[skia] Processed ${processed}/${total} frames`);
        }
        if (processed % 5 === 0 || processed === total) {
            const percent = Math.round((processed / total) * 100);
            event.sender.send("skia:progress", { frame: processed, total, percent });
        }
    }

    // 🔹 Verify frames written
    const outList = fs.readdirSync(outFramesDir).filter(f => f.endsWith(".png"));
    console.log("[skia] Out frames written:", outList.length);

    // Encode video
    console.log("[skia] All frames rendered, starting encoding...");
    const outPath = path.join(baseDir, "output.mp4");
    await encodeFromFrames({
        framesDir: outFramesDir,
        fps,
        outPath,
        srcVideo: filePath,
        bgMusic,
    });
    console.log("[skia] Encoding finished:", outPath);

    // Cleanup heavy intermediates
    rmrf(rawFramesDir);
    rmrf(outFramesDir);
    console.log("[skia] Cleanup done");

    // Notify UI
    event.sender.send("skia:done", { outPath });
    console.log("[skia] Render complete. Output at:", outPath);

    return outPath;
}

// ================== IPC Registration ==================
export function registerSkiaHandlers() {
    ipcMain.handle("skia:render", async (event, payload: RenderPayload) => {
        try {
            const out = await renderWithSkia(event, payload);
            return out;
        } catch (err) {
            console.error("[skia] render failed:", err);
            // still notify renderer to stop spinners
            event.sender.send("skia:done", { outPath: undefined });
            throw err;
        }
    });
}
