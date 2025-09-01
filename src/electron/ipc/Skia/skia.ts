import { ipcMain, IpcMainInvokeEvent, BrowserWindow } from "electron";
import path from "path";
import fs from "fs/promises";
import { FontLibrary, loadImage } from "skia-canvas";

import { ensureClipsDir } from "../../helpers/clip.js";
import { runFFmpeg } from "../../helpers/ffmpeg.js";
import { renderFrame } from "./renderFrame.js";

import type {
    SubtitleEntry,
    SubtitleStyle,
    CustomText,
} from "../../../types/subtitleTypes";

interface SkiaPayload {
    filePath: string;
    subtitles: SubtitleEntry[];
    subtitleStyle: SubtitleStyle;
    customTexts: CustomText[];
    index: number;
    fps?: number;
    fonts?: { name: string; path: string }[];
    bgMusic?: { path: string; volume: number }; // 0–100
}

export function registerSkiaHandlers() {
    ipcMain.handle(
        "skia:render",
        async (e: IpcMainInvokeEvent, payload: SkiaPayload) => {
            const {
                filePath,
                subtitles,
                subtitleStyle,
                customTexts,
                index,
                fps = 24,
                fonts = [],
                bgMusic,
            } = payload;

            if (!filePath) throw new Error("filePath missing");

            // Register custom fonts (if any)
            registerFonts(fonts);
            const web = BrowserWindow.fromWebContents(e.sender);

            const outDir = await ensureClipsDir();
            const framesDir = path.join(outDir, `frames-${index}`);
            await fs.mkdir(framesDir, { recursive: true });

            const parsed = path.parse(filePath);
            const outPath = filePath; // overwrite original
            const tempPath = path.join(outDir, `${parsed.name}-${index}-tmp.mp4`);
            const audioPath = path.join(outDir, `${parsed.name}-${index}-audio.m4a`);

            try {
                // 1) Extract frames
                await runFFmpeg([
                    "-y",
                    "-i",
                    filePath,
                    "-vf",
                    `fps=${fps}`,
                    path.join(framesDir, "frame-%05d.png"),
                ]);

                // 2) Extract original audio (copy)
                await runFFmpeg(["-y", "-i", filePath, "-vn", "-acodec", "copy", audioPath]);

                // 3) Draw on frames
                const files = (await fs.readdir(framesDir))
                    .filter((f) => f.endsWith(".png"))
                    .sort();

                const total = files.length;
                for (let i = 0; i < total; i++) {
                    const file = files[i];
                    const framePath = path.join(framesDir, file);
                    const img = await loadImage(framePath);

                    const frameNumber = parseInt(file.match(/frame-(\d+)/)?.[1] || "0", 10);
                    const buffer = await renderFrame(
                        img,
                        frameNumber,
                        fps,
                        subtitles,
                        subtitleStyle,
                        customTexts
                    );

                    await fs.writeFile(framePath, buffer);

                    web?.webContents.send("skia:progress", {
                        frame: i + 1,
                        total,
                        percent: Math.round(((i + 1) / total) * 100),
                    });
                }

                // 4) Recombine frames + audio (+ optional bg music mix), ensure duration == video
                const framesInput = path.join(framesDir, "frame-%05d.png");

                if (bgMusic?.path) {
                    // Mix original audio + bg music
                    const musicVolume = Math.max(0, Math.min(100, bgMusic.volume ?? 50)) / 100;

                    // duration=first => use original audio length (input #1)
                    // -shortest => ensure final duration does not exceed the video length
                    await runFFmpeg([
                        "-y",
                        "-framerate",
                        fps.toString(),
                        "-i",
                        framesInput, // 0
                        "-i",
                        audioPath, // 1 original
                        "-i",
                        bgMusic.path, // 2 bg
                        "-filter_complex",
                        `[1:a]volume=1[a0];[2:a]volume=${musicVolume}[a1];` +
                        `[a0][a1]amix=inputs=2:duration=first:dropout_transition=2[aout]`,
                        "-map",
                        "0:v",
                        "-map",
                        "[aout]",
                        "-c:v",
                        "libx264",
                        "-preset",
                        "fast",
                        "-crf",
                        "23",
                        "-c:a",
                        "aac",
                        "-shortest",
                        tempPath,
                    ]);
                } else {
                    // No bg music: keep original audio
                    await runFFmpeg([
                        "-y",
                        "-framerate",
                        fps.toString(),
                        "-i",
                        framesInput, // 0
                        "-i",
                        audioPath, // 1
                        "-map",
                        "0:v",
                        "-map",
                        "1:a",
                        "-c:v",
                        "libx264",
                        "-preset",
                        "fast",
                        "-crf",
                        "23",
                        "-c:a",
                        "aac",
                        "-shortest", // cut to video length (frames)
                        tempPath,
                    ]);
                }

                // 5) Replace original
                await fs.rename(tempPath, outPath);

                web?.webContents.send("skia:done", { outPath });
                return outPath;
            } finally {
                // best-effort cleanup
                try {
                    await fs.rm(framesDir, { recursive: true, force: true });
                } catch { }
                try {
                    await fs.rm(audioPath, { force: true });
                } catch { }
                try {
                    await fs.rm(tempPath, { force: true });
                } catch { }
            }
        }
    );
}

function registerFonts(fonts: { name: string; path: string }[]) {
    if (!fonts || !fonts.length) return;

    fonts.forEach((f) => {
        if (!f?.path || typeof f.path !== "string") {
            console.warn("[Skia] Skipping invalid font entry:", f);
            return;
        }
        try {
            // Correct usage for skia-canvas: mapping family -> path
            FontLibrary.use({ [f.name]: f.path });
            console.log(`[Skia] Registered font: ${f.name} -> ${f.path}`);
        } catch (err) {
            console.error(`[Skia] Failed to load font ${f.name} from ${f.path}`, err);
        }
    });
}
