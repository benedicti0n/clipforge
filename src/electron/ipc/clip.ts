import { ipcMain, IpcMainInvokeEvent } from "electron";
import path from "path";
import { spawn } from "child_process";
import * as fs from "fs";

import { clipsDir, clipOutputPath } from "../helpers/paths.js";
import { runFFmpeg } from "../helpers/ffmpeg.js";

// ---------- Ensure clips dir ----------
if (!fs.existsSync(clipsDir())) {
    fs.mkdirSync(clipsDir(), { recursive: true });
}

// ---------- IPC Handlers ----------
export function registerClipHandlers() {
    /**
     * Generate multiple clips from a video file
     */
    ipcMain.handle(
        "clip:generate",
        async (
            _e: IpcMainInvokeEvent,
            payload: { videoPath: string; clips: { startTime: string; endTime: string; index: number }[] }
        ) => {
            const { videoPath, clips } = payload;
            const results: { index: number; filePath: string }[] = [];

            for (const { startTime, endTime, index } of clips) {
                const outPath = clipOutputPath(index);

                await new Promise<void>((resolve, reject) => {
                    const ff = spawn("ffmpeg", [
                        "-y",
                        "-i",
                        videoPath,
                        "-ss",
                        startTime,
                        "-to",
                        endTime,
                        "-c",
                        "copy",
                        outPath,
                    ]);

                    ff.on("close", (code) => {
                        if (code === 0) {
                            results.push({ index, filePath: outPath });
                            resolve();
                        } else {
                            reject(new Error(`ffmpeg exited with code ${code}`));
                        }
                    });
                });
            }

            return results; // [{ index: 0, filePath: "...clip-0.mp4" }, ...]
        }
    );

    /**
     * Trim a single clip
     */
    ipcMain.handle(
        "clip:trim",
        async (
            _e: IpcMainInvokeEvent,
            payload: { filePath: string; startTime: string; endTime: string; index: number }
        ) => {
            const { filePath, startTime, endTime, index } = payload;

            return new Promise<string>((resolve, reject) => {
                const outPath = clipOutputPath(index);

                // SRT time → ffmpeg time (replace , with .)
                const srtToFfmpegTime = (t: string) => t.trim().replace(",", ".");

                const args = [
                    "-y",
                    "-i",
                    filePath,
                    "-ss",
                    srtToFfmpegTime(startTime),
                    "-to",
                    srtToFfmpegTime(endTime),
                    "-c",
                    "copy",
                    outPath,
                ];

                console.log("Running ffmpeg trim:", args.join(" "));

                const ff = spawn("ffmpeg", args);

                ff.stderr.on("data", (chunk) => {
                    console.log("ffmpeg:", chunk.toString());
                });

                ff.on("close", (code) => {
                    if (code === 0) {
                        resolve(outPath);
                    } else {
                        reject(new Error(`ffmpeg exited with code ${code}`));
                    }
                });
            });
        }
    );

    /**
     * Burn subtitles and custom texts into a clip
     */
    ipcMain.handle(
        "clip:addSubtitles",
        async (
            _e,
            {
                filePath,
                subtitles,
                subtitleStyle,
                customTexts,
                index,
            }: {
                filePath: string;
                subtitles: { start: string; end: string; text: string }[];
                subtitleStyle: {
                    fontSize: number;
                    fontColor: string;
                    strokeColor: string;
                    fontFamily: string;
                    x: number;
                    y: number;
                };
                customTexts: {
                    text: string;
                    fontSize: number;
                    fontColor: string;
                    strokeColor: string;
                    fontFamily: string;
                    x: number;
                    y: number;
                }[];
                index: number;
            }
        ) => {
            if (!filePath) throw new Error("filePath missing");

            // Prepare paths
            const baseName = path.parse(filePath).name;
            const srtPath = path.join(clipsDir(), `${baseName}-${index}.srt`);
            const outPath = path.join(clipsDir(), `${baseName}-${index}-subbed.mp4`);

            // 1. Write SRT file
            const srtContent = subtitles
                .map(
                    (s, i) =>
                        `${i + 1}\n${s.start} --> ${s.end}\n${s.text.replace(/\n+/g, " ")}\n`
                )
                .join("\n");

            fs.writeFileSync(srtPath, srtContent, { encoding: "utf-8" });

            // 2. Subtitles filter with styling
            const subFilter = `subtitles='${srtPath.replace(
                /\\/g,
                "\\\\"
            )}':force_style='Fontname=${subtitleStyle.fontFamily},FontSize=${subtitleStyle.fontSize
                },PrimaryColour=&H${subtitleStyle.fontColor
                    .replace("#", "")
                    .toUpperCase()}&,OutlineColour=&H${subtitleStyle.strokeColor
                        .replace("#", "")
                        .toUpperCase()}&,Outline=2,Alignment=2'`;

            // 3. Custom text overlays
            const drawtextFilters = (customTexts || []).map((t) => {
                return `drawtext=text='${t.text.replace(
                    /:/g,
                    "\\:"
                )}':fontcolor=${t.fontColor}:fontsize=${t.fontSize}:x=(w-text_w)*${t.x / 100
                    }:y=(h-text_h)*${t.y / 100}:bordercolor=${t.strokeColor}:borderw=2`;
            });

            const filterGraph = [subFilter, ...drawtextFilters].join(",");

            // 4. Run ffmpeg
            await runFFmpeg([
                "-y",
                "-i",
                filePath,
                "-vf",
                filterGraph,
                "-c:v",
                "libx264",
                "-preset",
                "fast",
                "-crf",
                "23",
                "-c:a",
                "copy",
                outPath,
            ]);

            return outPath;
        }
    );
}
