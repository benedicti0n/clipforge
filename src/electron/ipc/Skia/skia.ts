import { ipcMain, IpcMainInvokeEvent, BrowserWindow, app } from "electron";
import path from "path";
import fs from "fs/promises";
import { Canvas, FontLibrary } from "skia-canvas";

import { ensureClipsDir } from "../../helpers/clip.js";
import { runFFmpeg } from "../../helpers/ffmpeg.js";

import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

import type {
    SubtitleEntry,
    SubtitleStyle,
    CustomText,
} from "../../types/subtitleTypes.js"

interface SkiaPayload {
    filePath: string;
    subtitles: SubtitleEntry[];
    subtitleStyle: SubtitleStyle;
    customTexts: CustomText[];                // static (no timing) overlays
    index: number;
    fps?: number;
    fonts?: { name: string; path: string }[]; // uploaded fonts (renderer side)
    bgMusic?: { path: string; volume: number };
    videoDimensions?: { width: number; height: number }; // from renderer preview
}

export function registerSkiaHandlers() {
    ipcMain.handle("skia:render", async (e: IpcMainInvokeEvent, payload: SkiaPayload) => {
        const {
            filePath,
            subtitles,
            subtitleStyle,
            customTexts,
            index,
            fps = 30,  // Default FPS if not provided
            fonts = [],
            bgMusic,
            videoDimensions,
        } = payload;

        if (!filePath) throw new Error("filePath missing");
        const web = BrowserWindow.fromWebContents(e.sender);

        // === Paths & dirs ===
        const outDir = await ensureClipsDir();
        const parsed = path.parse(filePath);
        const outPath = path.join(outDir, `${parsed.name}-${index}.mp4`);
        const assPath = path.join(outDir, `${parsed.name}-${index}.ass`);
        const overlayPng = path.join(outDir, `${parsed.name}-${index}-overlay.png`);

        // fonts directory you already use in your app (where fonts:save stores files)
        const fontsDir = path.join(app.getPath("userData"), "fonts");

        // === Dimensions (to match preview 1:1) ===
        const vidW = Math.max(2, Math.floor(videoDimensions?.width ?? 1920));
        const vidH = Math.max(2, Math.floor(videoDimensions?.height ?? 1080));

        // === GET VIDEO DURATION ===
        let durationSec = 10; // fallback
        try {
            durationSec = await getVideoDuration(filePath);
        } catch (error) {
            console.warn("Could not get video duration, using fallback:", error);
        }

        try {
            // 1) Generate ASS subtitles (PlayRes = video size for best fidelity)
            const ass = generateASS(subtitles, subtitleStyle, vidW, vidH);
            await fs.writeFile(assPath, ass, "utf-8");

            // 2) Overlays
            safeRegisterFontsForSkia(fonts);

            const hasOverlay = customTexts.length > 0;
            const hasTimedTexts = hasOverlay && customTexts.some(t => t.start || t.end);

            const inputs: string[] = ["-i", filePath];
            let nextInputIndex = 1;
            let overlayIndex: number | undefined;

            if (hasOverlay) {
                if (hasTimedTexts) {
                    // PNG SEQUENCE when timing is used
                    const overlayDir = path.join(outDir, `overlay-${index}`);
                    await renderCustomTextsOverlaySeq(
                        customTexts,
                        { width: vidW, height: vidH },
                        fps,
                        durationSec,
                        overlayDir,
                        web?.webContents
                    );

                    inputs.push(
                        "-framerate", fps.toString(),
                        "-i", path.join(overlayDir, "overlay-%05d.png")
                    );
                    overlayIndex = nextInputIndex;
                    nextInputIndex++;
                } else {
                    // STATIC overlay (fast path)
                    const overlayStaticPng = path.join(outDir, `${parsed.name}-${index}-overlay-static.png`);
                    await renderStaticCustomOverlayPNG(customTexts, { width: vidW, height: vidH }, overlayStaticPng);

                    // loop the image for full duration
                    inputs.push(
                        "-loop", "1",
                        "-t", String(durationSec),
                        "-i", overlayStaticPng
                    );
                    overlayIndex = nextInputIndex;
                    nextInputIndex++;
                }
            }

            const hasBg = Boolean(bgMusic?.path);
            if (hasBg) {
                inputs.push("-i", bgMusic!.path!);
                nextInputIndex++;
            }

            const vGraph = buildVideoGraph({
                assPath,
                fontsDir,
                hasOverlay,
                overlayIndex,
            });

            const aGraph = buildAudioGraph({
                hasBg,
                bgIndex: hasBg ? (hasOverlay ? 2 : 1) : undefined,
                bgVolume: bgMusic?.volume ?? 50,
            });

            const ffArgs = [
                "-y",
                ...inputs,
                "-filter_complex", `${vGraph};${aGraph}`,
                "-map", "[vout]",
                "-map", "[aout]",
                "-c:v", "libx264",
                "-preset", "fast",
                "-crf", "23",
                "-c:a", "aac",
                "-shortest",
                outPath,
            ];

            await runFFmpeg(ffArgs);

            web?.webContents.send("skia:done", { outPath });
            return outPath;
        } finally {
            try { await fs.rm(assPath, { force: true }); } catch { }
            // Clean static overlay if created
            try {
                const staticPng = path.join(outDir, `${parsed.name}-${index}-overlay-static.png`);
                await fs.rm(staticPng, { force: true });
            } catch { }

            // Clean seq
            if (customTexts.length > 0) {
                try {
                    const overlayDir = path.join(outDir, `overlay-${index}`);
                    await fs.rm(overlayDir, { recursive: true, force: true });
                } catch { }
            }
        }
    });
}

// Helper function to get video duration using ffprobe
async function getVideoDuration(filePath: string): Promise<number> {
    try {
        const { stdout } = await execAsync(`ffprobe -v quiet -show_entries format=duration -of csv=p=0 "${filePath}"`);
        const duration = parseFloat(stdout.trim());
        return duration > 0 ? duration : 10; // fallback to 10 seconds if invalid
    } catch (error) {
        console.error("Failed to get video duration:", error);
        return 10; // fallback duration
    }
}
/* ----------------------------- Helpers ----------------------------- */

/** Build the video filter graph:
 *  0:v -> subtitles(ass,fontsdir) -> [vsub]
 *  if overlay: [vsub][overlay] overlay=0:0:format=auto -> [vout]
 *  else:       [vsub] -> [vout]
 */
function buildVideoGraph(opts: {
    assPath: string;
    fontsDir: string;
    hasOverlay: boolean;
    overlayIndex?: number;
}) {
    const { assPath, fontsDir, hasOverlay, overlayIndex } = opts;
    const assPosix = toPosix(assPath);
    const fontsPosix = toPosix(fontsDir);

    const subs = `[0:v]subtitles=filename='${assPosix}':fontsdir='${fontsPosix}'[vsub]`;

    if (!hasOverlay) {
        // pass-through but make encoder-safe
        return `${subs};[vsub]scale=trunc(iw/2)*2:trunc(ih/2)*2,format=yuv420p[vout]`;
    }

    // overlay + make encoder-safe
    return `${subs};[vsub][${overlayIndex}:v]overlay=0:0:format=auto,scale=trunc(iw/2)*2:trunc(ih/2)*2,format=yuv420p[vout]`;
}


/** Build the audio graph:
 *  if bg:
 *    [0:a]volume=1[a0];[N:a]volume=vol[a1];[a0][a1]amix=inputs=2:duration=first:dropout_transition=2[aout]
 *  else:
 *    [0:a]anull[aout]
 */
function buildAudioGraph(opts: { hasBg: boolean; bgIndex?: number; bgVolume: number }) {
    const { hasBg, bgIndex, bgVolume } = opts;
    if (!hasBg || bgIndex == null) {
        return `[0:a]anull[aout]`;
    }
    const vol = Math.max(0, Math.min(100, bgVolume)) / 100;
    return `[0:a]volume=1[a0];[${bgIndex}:a]volume=${vol}[a1];[a0][a1]amix=inputs=2:duration=first:dropout_transition=2[aout]`;
}

/** Generate an ASS file matching your style. */
function generateASS(subs: SubtitleEntry[], style: SubtitleStyle, playX: number, playY: number) {
    // ASS color format is &HAABBGGRR (alpha first), libass expects BGR with alpha
    const assColor = (hex: string, alphaPct = 0) => {
        const clean = hex.replace("#", "");
        const r = parseInt(clean.slice(0, 2), 16);
        const g = parseInt(clean.slice(2, 4), 16);
        const b = parseInt(clean.slice(4, 6), 16);
        const a = Math.round((alphaPct / 100) * 255);
        // pad to 2 hex digits
        const H = (n: number) => n.toString(16).toUpperCase().padStart(2, "0");
        return `&H${H(a)}${H(b)}${H(g)}${H(r)}`; // &HAABBGGRR
    };

    const primary = assColor(style.fontColor, 100 - (style.opacity ?? 100));
    const outline = assColor(style.strokeColor, 0);
    // Opaque box: BorderStyle=3 uses BackColour as box color
    const useBox = !!style.backgroundEnabled;
    const back = useBox
        ? assColor(style.backgroundColor, 100 - (style.backgroundOpacity ?? 50))
        : "&H00000000";

    const borderStyle = useBox ? 3 : 1; // 3 = boxed
    const outlineWidth = Math.max(0, style.strokeWidth ?? 0);
    const shadow = 0;

    const header = `[Script Info]
; Script generated by ClipForge
ScriptType: v4.00+
PlayResX: ${playX}
PlayResY: ${playY}
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,${style.fontFamily},${style.fontSize},${primary},&H00FFFFFF,${outline},${back},${style.bold ? -1 : 0},${style.italic ? -1 : 0},${style.underline ? -1 : 0},0,100,100,0,0,${borderStyle},${outlineWidth},${shadow},5,${style.backgroundPadding ?? 10},${style.backgroundPadding ?? 10},${style.backgroundPadding ?? 10},0

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text`;

    const toAssTime = (srt: string) => {
        // SRT "HH:MM:SS,mmm" -> ASS "H:MM:SS.cc"
        const [h, m, sMs] = srt.split(":");
        const [sec, ms] = sMs.split(",");
        const total = parseInt(h) * 3600 + parseInt(m) * 60 + parseInt(sec) + parseInt(ms) / 1000;
        const hh = Math.floor(total / 3600);
        const mm = Math.floor((total % 3600) / 60);
        const ss = Math.floor(total % 60);
        const cs = Math.round((total - Math.floor(total)) * 100);
        return `${hh}:${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}.${String(cs).padStart(2, "0")}`;
    };

    // Position in pixels using \pos() and center alignment (\an5).
    const posX = Math.round((style.x / 100) * playX);
    const posY = Math.round((style.y / 100) * playY);
    const posTag = `{\\an5\\pos(${posX},${posY})}`;

    const events = subs
        .map((s) => {
            const txt = escapeAssText(s.text);
            return `Dialogue: 0,${toAssTime(s.start)},${toAssTime(s.end)},Default,,0,0,0,,${posTag}${txt}`;
        })
        .join("\n");

    return `${header}\n${events}`;
}

/** Render custom texts into a PNG sequence with timing. */
async function renderCustomTextsOverlaySeq(
    texts: CustomText[],
    size: { width: number; height: number },
    fps: number,
    duration: number, // seconds
    outDir: string,
    web?: Electron.WebContents
) {
    await fs.mkdir(outDir, { recursive: true });
    const totalFrames = Math.ceil(duration * fps);

    const toSeconds = (time?: string) => {
        if (!time) return 0;
        const [h, m, sMs] = time.split(":");
        const [s, ms] = sMs.split(",");
        return parseInt(h) * 3600 + parseInt(m) * 60 + parseInt(s) + parseInt(ms) / 1000;
    };

    const timedTexts = texts.map((t) => ({
        ...t,
        startSec: toSeconds(t.start),
        endSec: toSeconds(t.end) || duration,
    }));

    for (let i = 0; i < totalFrames; i++) {
        const tSec = i / fps;
        const canvas = new Canvas(size.width, size.height);
        const ctx = canvas.getContext("2d");

        // Start with transparent background
        ctx.clearRect(0, 0, size.width, size.height);

        for (const t of timedTexts) {
            if (tSec < t.startSec || tSec > t.endSec) continue; // inactive

            const weight = t.bold ? "bold" : "normal";
            const style = t.italic ? "italic" : "normal";
            ctx.font = `${style} ${weight} ${t.fontSize}px ${t.fontFamily}`;
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.globalAlpha = (t.opacity ?? 100) / 100;

            const px = (size.width * t.x) / 100;
            const py = (size.height * t.y) / 100;

            // Draw stroke first if enabled
            if ((t.strokeWidth ?? 0) > 0) {
                ctx.lineWidth = t.strokeWidth ?? 0;
                ctx.strokeStyle = t.strokeColor ?? "#000";
                ctx.strokeText(t.text, px, py);
            }

            // Draw fill text
            ctx.fillStyle = t.fontColor ?? "#fff";
            ctx.fillText(t.text, px, py);

            // Draw underline if enabled
            if (t.underline) {
                const metrics = ctx.measureText(t.text);
                const uy = py + t.fontSize * 0.15;
                ctx.beginPath();
                ctx.moveTo(px - metrics.width / 2, uy);
                ctx.lineTo(px + metrics.width / 2, uy);
                ctx.lineWidth = Math.max(1, t.strokeWidth ?? 1);
                ctx.strokeStyle = t.fontColor ?? "#fff";
                ctx.stroke();
            }
            ctx.globalAlpha = 1;
        }

        const buf = await canvas.png;
        const fname = path.join(outDir, `overlay-${String(i + 1).padStart(5, "0")}.png`);
        await fs.writeFile(fname, buf);

        if (i % 30 === 0 && web) {
            web.send("skia:progress", {
                frame: i + 1,
                total: totalFrames,
                percent: Math.round(((i + 1) / totalFrames) * 100),
            });
        }
    }
}

/** Register fonts for skia-canvas (overlay PNG rendering only). */
function safeRegisterFontsForSkia(fonts: { name: string; path: string }[]) {
    if (!fonts?.length) return;
    for (const f of fonts) {
        if (!f?.path) continue;
        try {
            FontLibrary.use({ [f.name]: f.path });
        } catch (err) {
            // non-fatal; fallback to system font
            console.warn(`[Skia] Failed to register font ${f.name} @ ${f.path}`, err);
        }
    }
}

/** Escape text for ASS (basic). */
function escapeAssText(s: string) {
    return s.replace(/\{/g, "(").replace(/\}/g, ")").replace(/\n/g, "\\N");
}

/** Convert file path to single-quoted POSIX-ish for ffmpeg filters. */
function toPosix(p: string) {
    return p.replace(/\\/g, "/").replace(/'/g, "\\'");
}

async function renderStaticCustomOverlayPNG(
    texts: CustomText[],
    size: { width: number; height: number },
    outPng: string
) {
    const canvas = new Canvas(size.width, size.height);
    const ctx = canvas.getContext("2d");

    ctx.clearRect(0, 0, size.width, size.height);

    for (const t of texts) {
        const weight = t.bold ? "bold" : "normal";
        const style = t.italic ? "italic" : "normal";
        ctx.font = `${style} ${weight} ${t.fontSize}px ${t.fontFamily}`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.globalAlpha = (t.opacity ?? 100) / 100;

        const px = (size.width * t.x) / 100;
        const py = (size.height * t.y) / 100;

        if ((t.strokeWidth ?? 0) > 0) {
            ctx.lineWidth = t.strokeWidth ?? 0;
            ctx.strokeStyle = t.strokeColor ?? "#000";
            ctx.strokeText(t.text, px, py);
        }

        ctx.fillStyle = t.fontColor ?? "#fff";
        ctx.fillText(t.text, px, py);

        if (t.underline) {
            const metrics = ctx.measureText(t.text);
            const uy = py + t.fontSize * 0.15;
            ctx.beginPath();
            ctx.moveTo(px - metrics.width / 2, uy);
            ctx.lineTo(px + metrics.width / 2, uy);
            ctx.lineWidth = Math.max(1, t.strokeWidth ?? 1);
            ctx.strokeStyle = t.fontColor ?? "#fff";
            ctx.stroke();
        }
    }

    const buf = await canvas.png;
    await fs.writeFile(outPng, buf);
}
