import { ipcMain, IpcMainInvokeEvent, BrowserWindow } from "electron";
import path from "path";
import fs from "fs/promises";
import { Canvas, loadImage } from "skia-canvas";

import type { SubtitleEntry, SubtitleStyle, CustomText } from "../../types/subtitleTypes";
import { ensureClipsDir } from "../helpers/clip.js";
import { runFFmpeg } from "../helpers/ffmpeg.js";
import { clamp, applyOpacity, drawRoundedRect } from "../helpers/skia.js";

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
            // audio file path
            const audioPath = path.join(
                outDir,
                `${path.parse(filePath).name}-${index}-audio.m4a`
            );

            // window ref for emitting events
            const web = BrowserWindow.fromWebContents(e.sender);

            // 1. Extract frames
            await runFFmpeg([
                "-y",
                "-i",
                filePath,
                "-vf",
                `fps=${fps}`,
                path.join(framesDir, "frame-%05d.png"),
            ]);

            // 2. Extract audio separately
            await runFFmpeg([
                "-y",
                "-i",
                filePath,
                "-vn", // strip video
                "-acodec",
                "copy",
                audioPath,
            ]);

            // 3. Process frames (draw subtitles + overlays)
            const files = (await fs.readdir(framesDir)).filter((f) =>
                f.endsWith(".png")
            );
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
                ctx.font = `${subtitleStyle.fontSize || 24}px ${subtitleStyle.fontFamily || "Arial"
                    }`;
                ctx.fillStyle = subtitleStyle.fontColor;
                ctx.strokeStyle = subtitleStyle.strokeColor;
                ctx.lineWidth = subtitleStyle.strokeWidth || 2;

                activeSubs.forEach((sub) => {
                    const x = clamp((img.width * subtitleStyle.x) / 100, 0, img.width);
                    const y = clamp((img.height * subtitleStyle.y) / 100, 0, img.height);

                    // ✅ background box (before text)
                    if (subtitleStyle.backgroundEnabled) {
                        ctx.fillStyle = applyOpacity(
                            subtitleStyle.backgroundColor,
                            subtitleStyle.backgroundOpacity / 100
                        );

                        const metrics = ctx.measureText(sub.text);
                        const padding = 10;
                        const boxWidth = metrics.width + padding * 2;
                        const boxHeight = subtitleStyle.fontSize + padding;

                        drawRoundedRect(ctx, x - boxWidth / 2, y - boxHeight / 2, boxWidth, boxHeight, subtitleStyle.backgroundRadius);
                        ctx.fill();

                        ctx.fillStyle = subtitleStyle.fontColor;
                    }


                    // draw text
                    ctx.strokeText(sub.text, x, y);
                    ctx.fillText(sub.text, x, y);
                });

                // draw custom overlays (unchanged)
                customTexts.forEach((t) => {
                    ctx.font = `${t.fontSize}px ${t.fontFamily}`;
                    ctx.fillStyle = t.fontColor;
                    ctx.strokeStyle = t.strokeColor;
                    ctx.lineWidth = subtitleStyle.strokeWidth || 2;

                    const x = clamp((img.width * t.x) / 100, 0, img.width);
                    const y = clamp((img.height * t.y) / 100, 0, img.height);

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

            // 4. Re-encode frames + combine with extracted audio
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

            // 5. Replace original file with temp output
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
