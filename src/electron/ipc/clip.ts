import { dialog, ipcMain, IpcMainInvokeEvent } from "electron";
import path from "path";
import { spawn } from "child_process";
import * as fs from "fs/promises";

import { clipOutputPath } from "../helpers/paths.js";
import { runFFmpeg, ffmpegTimeToSeconds } from "../helpers/ffmpeg.js";
import { ensureClipsDir, hexToAssColor, buildCustomDrawtext } from "../helpers/clip.js";

// -------------------- Types --------------------
interface SubtitleEntry {
    start: string;
    end: string;
    text: string;
}

interface SubtitleStyle {
    fontSize: number;
    fontColor: string;   // "#RRGGBB"
    strokeColor: string; // "#RRGGBB"
    fontFamily: string;
    x: number;           // preview only
    y: number;           // preview only
}

interface CustomText {
    text: string;
    fontSize: number;
    fontColor: string;
    strokeColor: string;
    fontFamily: string;
    x: number; // 0..100 (%)
    y: number; // 0..100 (%)
}

// -------------------- IPC Handlers --------------------
export function registerClipHandlers() {
    // ---- Generate clips ----
    ipcMain.handle(
        "clip:generate",
        async (
            _e: IpcMainInvokeEvent,
            payload: {
                videoPath: string;
                clips: { startTime: string; endTime: string; index: number }[];
                accurate?: boolean;
            }
        ) => {
            const { videoPath, clips, accurate = false } = payload;
            const results: { index: number; filePath: string }[] = [];

            for (const { startTime, endTime, index } of clips) {
                const outPath = clipOutputPath(index);

                const startSec = ffmpegTimeToSeconds(startTime);
                const endSec = ffmpegTimeToSeconds(endTime);
                const duration = Math.max(endSec - startSec, 0.01);

                const args = accurate
                    ? [
                        "-y",
                        "-i", videoPath,
                        "-ss", startTime,
                        "-t", duration.toString(),
                        "-c:v", "libx264",
                        "-preset", "fast",
                        "-crf", "23",
                        "-c:a", "aac",
                        outPath,
                    ]
                    : [
                        "-y",
                        "-ss", startTime,
                        "-i", videoPath,
                        "-t", duration.toString(),
                        "-c", "copy",
                        outPath,
                    ];

                console.log("ffmpeg generate:", args.join(" "));

                await new Promise<void>((resolve, reject) => {
                    const ff = spawn("ffmpeg", args);
                    ff.on("close", (code) =>
                        code === 0 ? (results.push({ index, filePath: outPath }), resolve()) : reject(new Error(`ffmpeg exited ${code}`))
                    );
                });
            }

            return results;
        }
    );

    // ---- Trim a single clip ----
    ipcMain.handle(
        "clip:trim",
        async (
            _e: IpcMainInvokeEvent,
            payload: { filePath: string; startTime: string; endTime: string; index: number; accurate?: boolean }
        ) => {
            const { filePath, startTime, endTime, index, accurate = false } = payload;

            const startSec = ffmpegTimeToSeconds(startTime);
            const endSec = ffmpegTimeToSeconds(endTime);
            const duration = Math.max(endSec - startSec, 0.01);

            const outPath = clipOutputPath(index);

            const args = accurate
                ? [
                    "-y",
                    "-i", filePath,
                    "-ss", startTime,
                    "-t", duration.toString(),
                    "-c:v", "libx264",
                    "-preset", "fast",
                    "-crf", "23",
                    "-c:a", "aac",
                    outPath,
                ]
                : [
                    "-y",
                    "-ss", startTime,
                    "-i", filePath,
                    "-t", duration.toString(),
                    "-c", "copy",
                    outPath,
                ];

            console.log("ffmpeg trim:", args.join(" "));

            return new Promise<string>((resolve, reject) => {
                const ff = spawn("ffmpeg", args);
                ff.stderr.on("data", (chunk) => console.log("ffmpeg:", chunk.toString()));
                ff.on("close", (code) => (code === 0 ? resolve(outPath) : reject(new Error(`ffmpeg exited ${code}`))));
            });
        }
    );

    // ---- Add subtitles & custom texts ----
    ipcMain.handle(
        "clip:addSubtitles",
        async (
            _e,
            { filePath, subtitles, subtitleStyle, customTexts, index }: { filePath: string; subtitles: SubtitleEntry[]; subtitleStyle: SubtitleStyle; customTexts: CustomText[]; index: number }
        ) => {
            if (!filePath) throw new Error("filePath missing");

            const outDir = await ensureClipsDir();
            const baseName = path.parse(filePath).name;
            const srtPath = path.join(outDir, `${baseName}-${index}.srt`);
            const outPath = path.join(outDir, `${baseName}-${index}-subbed.mp4`);

            // Build SRT
            const srtContent = (subtitles || [])
                .map((s, i) => {
                    const oneLine = (s.text || "").replace(/\s*\n+\s*/g, " ").trim();
                    return `${i + 1}\n${s.start} --> ${s.end}\n${oneLine}\n`;
                })
                .join("\n");
            await fs.writeFile(srtPath, srtContent, { encoding: "utf-8" });

            // Subtitles filter (libass)
            const srtPathEscaped = srtPath.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
            const primaryAss = hexToAssColor(subtitleStyle.fontColor);
            const outlineAss = hexToAssColor(subtitleStyle.strokeColor);

            const subFilter =
                `subtitles='${srtPathEscaped}':force_style=` +
                `'Fontname=${subtitleStyle.fontFamily},` +
                `FontSize=${subtitleStyle.fontSize},` +
                `PrimaryColour=${primaryAss},` +
                `OutlineColour=${outlineAss},` +
                `Outline=2,` +
                `Alignment=2'`;

            // Custom overlays
            const drawtextFilters = (customTexts || []).map(buildCustomDrawtext);
            const filterGraph = [subFilter, ...drawtextFilters].join(",");

            await runFFmpeg([
                "-y",
                "-i", filePath,
                "-vf", filterGraph,
                "-c:v", "libx264",
                "-preset", "fast",
                "-crf", "23",
                "-c:a", "copy",
                outPath,
            ]);

            return outPath;
        }
    );

    ipcMain.handle(
        "clip:export",
        async (_event, { filePath, caption }: { filePath: string; caption?: string }) => {
            try {
                const safeName = (caption || "clip").replace(/[<>:"/\\|?*]+/g, "").trim() || "clip";
                const defaultFileName = `${safeName}.mp4`;

                const { canceled, filePath: savePath } = await dialog.showSaveDialog({
                    title: "Export Clip",
                    defaultPath: defaultFileName,
                    filters: [{ name: "Video Files", extensions: ["mp4", "mov", "avi"] }],
                });

                if (canceled || !savePath) {
                    return null;
                }

                await fs.copyFile(filePath, savePath);
                return savePath;
            } catch (err) {
                console.error("clip:export error:", err);
                throw new Error("Failed to export clip");
            }
        }
    );

}
