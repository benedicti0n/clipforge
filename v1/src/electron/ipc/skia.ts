// src/electron/ipc/skia.ts
import { ipcMain, BrowserWindow, app } from "electron";
import path from "node:path";
import { existsSync, mkdirSync, writeFileSync, unlinkSync } from "node:fs";
import { buildAssForSubtitles, buildAssForCustomTexts } from "../util/ass.js";
import { ffprobeInfo, spawnFfmpeg } from "../util/ffmpeg.js";
import type { SubtitleEntry, SubtitleStyle, CustomText } from "../types/subtitleTypes.js";

type RenderPayload = {
    filePath: string;
    index: number;
    subtitles: SubtitleEntry[];
    subtitleStyle: SubtitleStyle;
    customTexts: CustomText[];
    fonts: { name: string; path: string }[];
    bgMusic?: { path: string; volume: number };
    videoDimensions: { width: number; height: number; aspectRatio: number }; // not trusted for render
};

const BASE_DIR = app ? app.getPath("userData") : process.cwd();
const OUT_DIR = path.join(BASE_DIR, "exports");
safeMkdir(OUT_DIR);

export function registerSkiaHandlers() {
    ipcMain.handle("skia:render", async (evt, payload: RenderPayload) => {
        const win = BrowserWindow.fromWebContents(evt.sender);
        const sendProgress = (phase: "pass1" | "pass2", percent: number) =>
            win?.webContents.send("skia:progress", { frame: 0, total: 100, percent, phase });

        safeMkdir(OUT_DIR);

        const pass1Out = path.join(OUT_DIR, `clip_${payload.index}_pass1.mkv`);
        const finalOut = path.join(OUT_DIR, `clip_${payload.index}_final.mp4`);
        safeMkdir(path.dirname(pass1Out));
        safeMkdir(path.dirname(finalOut));

        let ass1Path = "";
        let ass2Path = "";
        const cleanup = () => {
            const rm = (p: string) => { if (p) try { unlinkSync(p); } catch { } };
            rm(ass1Path); rm(ass2Path); rm(pass1Out);
        };

        try {
            // Probe the real stream size and sar to avoid libass scaling
            const probe1 = await ffprobeInfo(payload.filePath);
            const srcW = probe1.width || payload.videoDimensions.width;
            const srcH = probe1.height || payload.videoDimensions.height;
            const duration = probe1.durationSec || 0;

            // If you want to output a different resolution, set targetW/H here and
            // we’ll scale BEFORE burning text:
            const targetW = srcW;
            const targetH = srcH;

            // ---------- PASS 1: Subtitles at FINAL resolution, SAR=1 ----------
            ass1Path = path.join(OUT_DIR, `clip_${payload.index}_subs.ass`);
            safeMkdir(path.dirname(ass1Path));
            const ass1 = buildAssForSubtitles({
                subs: payload.subtitles,
                style: payload.subtitleStyle,
                width: targetW,   // PlayRes matches actual render size
                height: targetH,
            });
            writeFileSync(ass1Path, ass1, "utf8");

            // Filter chain: setsar=1[,scale=target][:lanczos],ass=...
            const vfPass1 =
                `setsar=1` +
                // (uncomment to scale if target != src)
                // ((targetW !== srcW || targetH !== srcH) ? `,scale=${targetW}:${targetH}:flags=lanczos` : "") +
                `,ass=${ffEscapePath(ass1Path)}`;

            await spawnFfmpeg(
                [
                    "-y",
                    "-i", payload.filePath,
                    "-vf", vfPass1,
                    "-c:v", "libx264",
                    "-qp", "0",
                    "-pix_fmt", "yuv444p",
                    "-preset", "fast",
                    "-c:a", "copy",
                    pass1Out,
                ],
                (curSec) => {
                    const p = duration > 0 ? Math.min(99, Math.round((curSec / duration) * 99)) : 0;
                    sendProgress("pass1", p);
                }
            );

            // ---------- PASS 2: Custom texts at same resolution, SAR=1 ----------
            const probe2 = await ffprobeInfo(pass1Out);
            const duration2 = probe2.durationSec || 0;

            ass2Path = path.join(OUT_DIR, `clip_${payload.index}_custom.ass`);
            safeMkdir(path.dirname(ass2Path));
            const ass2 = buildAssForCustomTexts({
                texts: payload.customTexts,
                width: targetW,
                height: targetH,
                defaultDurationSec: duration2,
            });
            writeFileSync(ass2Path, ass2, "utf8");

            const videoEncodeArgs = [
                "-c:v", "libx264",
                "-crf", "18",
                "-preset", "slow",
                "-pix_fmt", "yuv420p",
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
                        // Keep SAR=1 before ASS to avoid shape warping
                        `[0:v]setsar=1,ass=${ffEscapePath(ass2Path)}[v];` +
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
                        "-vf", `setsar=1,ass=${ffEscapePath(ass2Path)}`,
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

            cleanup();
            win?.webContents.send("skia:done", { outPath: finalOut });
            return finalOut;
        } catch (err) {
            console.error("[skia:render] failed:", err);
            BrowserWindow.fromWebContents(evt.sender)
                ?.webContents.send("skia:done", { outPath: undefined });
            throw err;
        }
    });
}

function ffEscapePath(p: string) {
    return `'${p.replace(/'/g, "'\\''")}'`;
}
function safeMkdir(dir: string) {
    try { if (!existsSync(dir)) mkdirSync(dir, { recursive: true }); }
    catch {
        try {
            mkdirSync(path.dirname(dir), { recursive: true });
            if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
        } catch { }
    }
}
