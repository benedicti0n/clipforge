import { ipcMain, BrowserWindow } from "electron";
import path from "node:path";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
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

const OUT_DIR = path.join(process.cwd(), "exports");
if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });

export function registerSkiaHandlers() {
    ipcMain.handle("skia:render", async (evt, payload: RenderPayload) => {
        const win = BrowserWindow.fromWebContents(evt.sender);
        const sendProgress = (phase: "pass1" | "pass2", percent: number) =>
            win?.webContents.send("skia:progress", { frame: 0, total: 100, percent, phase });

        const baseIn = payload.filePath;
        const pass1Out = path.join(OUT_DIR, `clip_${payload.index}_pass1.mp4`);
        const finalOut = path.join(OUT_DIR, `clip_${payload.index}_final.mp4`);

        try {
            // probe duration for progress calc
            const info = await ffprobeInfo(baseIn);
            const duration = info.durationSec || 0;

            // ---------- PASS 1: Subtitles via ASS ----------
            const ass1 = buildAssForSubtitles({
                subs: payload.subtitles,
                style: payload.subtitleStyle,
                width: payload.videoDimensions.width,
                height: payload.videoDimensions.height,
            });
            const ass1Path = path.join(OUT_DIR, `clip_${payload.index}_subs.ass`);
            writeFileSync(ass1Path, ass1, "utf8");

            await spawnFfmpeg(
                [
                    "-y",
                    "-i", baseIn,
                    "-vf", `ass=${ffEscapePath(ass1Path)}`,
                    "-c:v", "h264",
                    "-preset", "veryfast",
                    "-pix_fmt", "yuv420p",
                    "-movflags", "+faststart",
                    "-c:a", "copy",
                    pass1Out,
                ],
                (curSec) => {
                    // map 0..duration to ~0..99
                    const p = duration > 0 ? Math.min(99, Math.round((curSec / duration) * 99)) : 0;
                    sendProgress("pass1", p);
                }
            );

            // ---------- PASS 2: Custom texts via ASS (+ optional bg music mix) ----------
            const info2 = await ffprobeInfo(pass1Out);
            const duration2 = info2.durationSec || 0;

            const ass2 = buildAssForCustomTexts({
                texts: payload.customTexts,
                width: payload.videoDimensions.width,
                height: payload.videoDimensions.height,
                defaultDurationSec: duration2,
            });
            const ass2Path = path.join(OUT_DIR, `clip_${payload.index}_custom.ass`);
            writeFileSync(ass2Path, ass2, "utf8");

            if (payload.bgMusic?.path) {
                await spawnFfmpeg(
                    [
                        "-y",
                        "-i", pass1Out,
                        "-i", payload.bgMusic.path,
                        "-filter_complex",
                        // video burn + audio mix
                        `[0:v]ass=${ffEscapePath(ass2Path)}[v];` +
                        `[0:a][1:a]amix=inputs=2:duration=shortest:dropout_transition=0,volume=1.0[a]`,
                        "-map", "[v]",
                        "-map", "[a]",
                        "-c:v", "h264",
                        "-preset", "veryfast",
                        "-pix_fmt", "yuv420p",
                        "-movflags", "+faststart",
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
                        "-c:v", "h264",
                        "-preset", "veryfast",
                        "-pix_fmt", "yuv420p",
                        "-movflags", "+faststart",
                        "-c:a", "copy",
                        finalOut,
                    ],
                    (curSec) => {
                        const p = duration2 > 0 ? Math.min(100, Math.round((curSec / duration2) * 100)) : 0;
                        sendProgress("pass2", p);
                    }
                );
            }

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
    // ffmpeg filter arg escaping (path inside filter)
    // Escape backslashes and colons on Windows; for *nix, just escape ':' and '\'
    return `'${p.replace(/'/g, "'\\''")}'`;
}
