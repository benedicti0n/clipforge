import { ipcMain, BrowserWindow, app } from "electron";
import path from "node:path";
import { existsSync, mkdirSync, writeFileSync, unlinkSync } from "node:fs";
import { buildAssForSubtitles, buildAssForCustomTexts } from "../util/ass.js";
import { ffprobeInfo, spawnFfmpeg } from "../util/ffmpeg.js";
import type { SubtitleEntry, SubtitleStyle, CustomText } from "../types/subtitleTypes.js";

type RenderPayload = {
    filePath: string;                      // input video
    index: number;
    subtitles: SubtitleEntry[];
    subtitleStyle: SubtitleStyle;
    customTexts: CustomText[];
    fonts: { name: string; path: string }[]; // ignored here; using system fonts
    bgMusic?: { path: string; volume: number };
    videoDimensions: { width: number; height: number; aspectRatio: number };
};

// Prefer a writable base (userData) if cwd isn’t writable in some envs.
// You can switch to process.cwd() if you really want to keep it next to the app.
const BASE_DIR = app ? app.getPath("userData") : process.cwd();
const OUT_DIR = path.join(BASE_DIR, "exports");

// Ensure once at module load (best-effort)
safeMkdir(OUT_DIR);

export function registerSkiaHandlers() {
    ipcMain.handle("skia:render", async (evt, payload: RenderPayload) => {
        const win = BrowserWindow.fromWebContents(evt.sender);
        const sendProgress = (phase: "pass1" | "pass2", percent: number) =>
            win?.webContents.send("skia:progress", { frame: 0, total: 100, percent, phase });

        // Re-ensure the out dir at call time (handles race/packaged envs)
        safeMkdir(OUT_DIR);

        // Use MKV for lossless 4:4:4 intermediate (mp4+444 can be quirky)
        const pass1Out = path.join(OUT_DIR, `clip_${payload.index}_pass1.mkv`);
        const finalOut = path.join(OUT_DIR, `clip_${payload.index}_final.mp4`);
        // Make sure parent dirs exist (paranoid, but safe)
        safeMkdir(path.dirname(pass1Out));
        safeMkdir(path.dirname(finalOut));

        // Paths we will clean up on success
        let ass1Path = "";
        let ass2Path = "";

        const cleanup = () => {
            const maybeDelete = (p: string) => {
                if (!p) return;
                try { unlinkSync(p); } catch { }
            };
            maybeDelete(ass1Path);
            maybeDelete(ass2Path);
            maybeDelete(pass1Out);
        };

        try {
            // Probe input for progress mapping
            const info = await ffprobeInfo(payload.filePath);
            const duration = info.durationSec || 0;

            // ---------- PASS 1: Subtitles (lossless, 4:4:4) ----------
            ass1Path = path.join(OUT_DIR, `clip_${payload.index}_subs.ass`);
            safeMkdir(path.dirname(ass1Path)); // <-- ensure dir exists
            const ass1 = buildAssForSubtitles({
                subs: payload.subtitles,
                style: payload.subtitleStyle,
                width: payload.videoDimensions.width,
                height: payload.videoDimensions.height,
            });
            writeFileSync(ass1Path, ass1, "utf8");

            await spawnFfmpeg(
                [
                    "-y",
                    "-i", payload.filePath,
                    "-vf", `ass=${ffEscapePath(ass1Path)}`,
                    "-c:v", "libx264",
                    "-qp", "0",              // true lossless (x264)
                    "-pix_fmt", "yuv444p",   // full chroma — sharp edges
                    "-preset", "fast",
                    "-c:a", "copy",
                    pass1Out,
                ],
                (curSec) => {
                    const p = duration > 0 ? Math.min(99, Math.round((curSec / duration) * 99)) : 0;
                    sendProgress("pass1", p);
                }
            );

            // ---------- PASS 2: Custom texts (+ optional bg music), delivery encode ----------
            const info2 = await ffprobeInfo(pass1Out);
            const duration2 = info2.durationSec || 0;

            ass2Path = path.join(OUT_DIR, `clip_${payload.index}_custom.ass`);
            safeMkdir(path.dirname(ass2Path)); // <-- ensure dir exists
            const ass2 = buildAssForCustomTexts({
                texts: payload.customTexts,
                width: payload.videoDimensions.width,
                height: payload.videoDimensions.height,
                defaultDurationSec: duration2,
            });
            writeFileSync(ass2Path, ass2, "utf8");

            const videoEncodeArgs = [
                "-c:v", "libx264",
                "-crf", "18",             // high quality
                "-preset", "slow",        // better detail retention
                "-pix_fmt", "yuv420p",    // social-friendly
                "-movflags", "+faststart",
            ];

            if (payload.bgMusic?.path) {
                const vol = Number.isFinite(payload.bgMusic.volume)
                    ? Math.max(0, Math.min(2, payload.bgMusic.volume))
                    : 1.0;

                await spawnFfmpeg(
                    [
                        "-y",
                        "-i", pass1Out,
                        "-i", payload.bgMusic.path,
                        "-filter_complex",
                        `[0:v]ass=${ffEscapePath(ass2Path)}[v];` +
                        `[0:a][1:a]amix=inputs=2:duration=shortest:dropout_transition=0,volume=${vol.toFixed(2)}[a]`,
                        "-map", "[v]",
                        "-map", "[a]",
                        ...videoEncodeArgs,
                        "-c:a", "aac",
                        "-b:a", "192k",
                        finalOut,
                    ],
                    (curSec) => {
                        const p = duration2 > 0 ? Math.min(100, Math.round((curSec / duration2) * 100)) : 0;
                        sendProgress("pass2", p);
                    }
                );
            } else {
                await spawnFfmpeg(
                    [
                        "-y",
                        "-i", pass1Out,
                        "-vf", `ass=${ffEscapePath(ass2Path)}`,
                        ...videoEncodeArgs,
                        "-c:a", "copy",
                        finalOut,
                    ],
                    (curSec) => {
                        const p = duration2 > 0 ? Math.min(100, Math.round((curSec / duration2) * 100)) : 0;
                        sendProgress("pass2", p);
                    }
                );
            }

            // Success → clean intermediates
            cleanup();

            win?.webContents.send("skia:done", { outPath: finalOut });
            return finalOut;
        } catch (err) {
            console.error("[skia:render] failed:", err);
            // Keep intermediates on failure for debugging
            BrowserWindow.fromWebContents(evt.sender)
                ?.webContents.send("skia:done", { outPath: undefined });
            throw err;
        }
    });
}

function ffEscapePath(p: string) {
    // Safe for ffmpeg filter arg: wrap in single quotes and escape any single quotes inside.
    return `'${p.replace(/'/g, "'\\''")}'`;
}

function safeMkdir(dir: string) {
    try {
        if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    } catch (e) {
        // As a fallback, try to create parent
        try {
            mkdirSync(path.dirname(dir), { recursive: true });
            if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
        } catch { /* noop */ }
    }
}
