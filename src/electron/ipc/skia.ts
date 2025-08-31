import { ipcMain, IpcMainInvokeEvent, BrowserWindow } from "electron";
import path from "path";
import fs from "fs/promises";
import { Canvas, loadImage } from "skia-canvas";

import type { SubtitleEntry, SubtitleStyle, CustomText } from "../../types/subtitleTypes";
import { ensureClipsDir } from "../helpers/clip.js";
import { runFFmpeg } from "../helpers/ffmpeg.js";

interface SkiaPayload {
    filePath: string;
    subtitles: SubtitleEntry[];
    subtitleStyle: SubtitleStyle;
    customTexts: CustomText[];
    index: number;
    fps?: number;
}

export function registerSkiaHandlers() {
    ipcMain.handle(
        "skia:render",
        async (e: IpcMainInvokeEvent, payload: SkiaPayload) => {
            const { filePath, subtitles, subtitleStyle, customTexts, index, fps = 24 } =
                payload;

            if (!filePath) throw new Error("filePath missing");

            const outDir = await ensureClipsDir();
            const framesDir = path.join(outDir, `frames-${index}`);
            await fs.mkdir(framesDir, { recursive: true });

            // final file (original clip)
            const outPath = filePath;
            // temp file (to avoid ffmpeg in-place overwrite issue)
            const tempPath = path.join(
                outDir,
                `${path.parse(filePath).name}-${index}-tmp.mp4`
            );

            // window ref for emitting events
            const web = BrowserWindow.fromWebContents(e.sender);

            // 1. Extract frames
            await runFFmpeg([
                "-y",
                "-i", filePath,
                "-vf", `fps=${fps}`,
                path.join(framesDir, "frame-%05d.png"),
            ]);

            // 2. Process frames
            const files = (await fs.readdir(framesDir)).filter((f) => f.endsWith(".png"));
            const total = files.length;

            for (let i = 0; i < total; i++) {
                const file = files[i];
                const framePath = path.join(framesDir, file);
                const img = await loadImage(framePath);

                const canvas = new Canvas(img.width, img.height);
                const ctx = canvas.getContext("2d");
                ctx.drawImage(img, 0, 0);

                const frameNumber = parseInt(file.match(/frame-(\d+)/)?.[1] || "0", 10);
                const timeSec = frameNumber / fps;

                // active subs
                const activeSubs = subtitles.filter(
                    (s) => timeSec >= toSeconds(s.start) && timeSec <= toSeconds(s.end)
                );

                ctx.textAlign = "center";
                ctx.textBaseline = "middle";

                // draw subs
                ctx.font = `${subtitleStyle.fontSize}px ${subtitleStyle.fontFamily}`;
                ctx.fillStyle = subtitleStyle.fontColor;
                ctx.strokeStyle = subtitleStyle.strokeColor;
                ctx.lineWidth = 2;

                activeSubs.forEach((sub) => {
                    const x = (img.width * subtitleStyle.x) / 100;
                    const y = (img.height * subtitleStyle.y) / 100;
                    ctx.strokeText(sub.text, x, y);
                    ctx.fillText(sub.text, x, y);
                });

                // draw custom overlays
                customTexts.forEach((t) => {
                    ctx.font = `${t.fontSize}px ${t.fontFamily}`;
                    ctx.fillStyle = t.fontColor;
                    ctx.strokeStyle = t.strokeColor;
                    ctx.lineWidth = 2;

                    const x = (img.width * t.x) / 100;
                    const y = (img.height * t.y) / 100;
                    ctx.strokeText(t.text, x, y);
                    ctx.fillText(t.text, x, y);
                });

                // save frame
                await fs.writeFile(framePath, await canvas.png);

                // 🔥 emit progress
                const percent = Math.round(((i + 1) / total) * 100);
                web?.webContents.send("skia:progress", {
                    frame: i + 1,
                    total,
                    percent,
                });
            }

            // 3. Re-encode frames into temp video with audio
            await runFFmpeg([
                "-y",
                "-framerate", fps.toString(),
                "-i", path.join(framesDir, "frame-%05d.png"),
                "-i", filePath,
                "-map", "0:v:0",
                "-map", "1:a:0?",
                "-c:v", "libx264",
                "-preset", "fast",
                "-crf", "23",
                "-c:a", "aac",
                tempPath,
            ]);

            // 4. Replace original file with temp output
            await fs.rename(tempPath, outPath);

            // ✅ final event
            web?.webContents.send("skia:done", { outPath });

            return outPath;
        }
    );
}

function toSeconds(srtTime: string): number {
    const [hms, ms = "0"] = srtTime.split(",");
    const [h, m, s] = hms.split(":").map(Number);
    return h * 3600 + m * 60 + s + (parseInt(ms, 10) || 0) / 1000;
}
