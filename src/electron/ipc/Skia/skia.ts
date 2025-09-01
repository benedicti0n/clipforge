import { ipcMain, IpcMainInvokeEvent, BrowserWindow } from "electron";
import path from "path";
import fs from "fs/promises";
import { loadImage } from "skia-canvas";

import { ensureClipsDir } from "../../helpers/clip.js";
import { runFFmpeg } from "../../helpers/ffmpeg.js";
import { renderFrame } from "./renderFrame.js";

import type { SubtitleEntry, SubtitleStyle, CustomText } from "../../../types/subtitleTypes";

interface SkiaPayload {
    filePath: string;
    subtitles: SubtitleEntry[];
    subtitleStyle: SubtitleStyle;
    customTexts: CustomText[];
    index: number;
    fps?: number;
}

export function registerSkiaHandlers() {
    ipcMain.handle("skia:render", async (e: IpcMainInvokeEvent, payload: SkiaPayload) => {
        const { filePath, subtitles, subtitleStyle, customTexts, index, fps = 24 } = payload;

        if (!filePath) throw new Error("filePath missing");

        const outDir = await ensureClipsDir();
        const framesDir = path.join(outDir, `frames-${index}`);
        await fs.mkdir(framesDir, { recursive: true });

        const outPath = filePath;
        const tempPath = path.join(outDir, `${path.parse(filePath).name}-${index}-tmp.mp4`);
        const audioPath = path.join(outDir, `${path.parse(filePath).name}-${index}-audio.m4a`);

        const web = BrowserWindow.fromWebContents(e.sender);

        // 1. Extract frames
        await runFFmpeg(["-y", "-i", filePath, "-vf", `fps=${fps}`, path.join(framesDir, "frame-%05d.png")]);

        // 2. Extract audio
        await runFFmpeg(["-y", "-i", filePath, "-vn", "-acodec", "copy", audioPath]);

        // 3. Process frames
        const files = (await fs.readdir(framesDir)).filter((f) => f.endsWith(".png"));
        const total = files.length;

        for (let i = 0; i < total; i++) {
            const file = files[i];
            const framePath = path.join(framesDir, file);
            const img = await loadImage(framePath);

            const frameNumber = parseInt(file.match(/frame-(\d+)/)?.[1] || "0", 10);
            const buffer = await renderFrame(img, frameNumber, fps, subtitles, subtitleStyle, customTexts);

            await fs.writeFile(framePath, buffer);

            web?.webContents.send("skia:progress", { frame: i + 1, total, percent: Math.round(((i + 1) / total) * 100) });
        }

        // 4. Recombine frames + audio
        await runFFmpeg([
            "-y",
            "-framerate",
            fps.toString(),
            "-i",
            path.join(framesDir, "frame-%05d.png"),
            "-i",
            audioPath,
            "-c:v",
            "libx264",
            "-preset",
            "fast",
            "-crf",
            "23",
            "-c:a",
            "aac",
            tempPath,
        ]);

        // 5. Replace original
        await fs.rename(tempPath, outPath);

        web?.webContents.send("skia:done", { outPath });
        return outPath;
    });
}
