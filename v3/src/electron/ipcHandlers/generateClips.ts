import { ipcMain, app } from "electron";
import fs from "fs";
import path from "path";
import { spawn, ChildProcessWithoutNullStreams } from "child_process";
import ffmpegPath from "ffmpeg-static";

interface ClipData {
    startTime: string;
    endTime: string;
    transcriptionPart: string;
    totalDuration: string;
    viralityScore: number;
    contentType?: string;
    suitableCaption: string;
}

interface GenerateClipsParams {
    inputPath: string;
    clips: ClipData[];
    paddingSeconds?: number;
    outputDir?: string;
}

let activeGeneration: ChildProcessWithoutNullStreams | null = null;

function parseTimestamp(ts: string): number {
    const parts = ts.split(":").map(Number);
    if (parts.length === 3) {
        return parts[0] * 3600 + parts[1] * 60 + parts[2];
    } else if (parts.length === 2) {
        return parts[0] * 60 + parts[1];
    }
    return parseFloat(ts);
}

function formatTimestamp(seconds: number): string {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

export function registerClipGenerationHandlers() {
    ipcMain.handle(
        "generate-clips",
        async (event, params: GenerateClipsParams) => {
            const { inputPath, clips, paddingSeconds = 0, outputDir } = params;

            if (!fs.existsSync(inputPath)) {
                return { success: false, error: `Input video not found: ${inputPath}` };
            }

            const outputDirectory = outputDir || path.join(app.getPath("userData"), "generatedClips");
            if (!fs.existsSync(outputDirectory)) {
                fs.mkdirSync(outputDirectory, { recursive: true });
            }

            const results: Array<{
                clipIndex: number;
                success: boolean;
                outputPath?: string;
                error?: string;
                startTime: string;
                endTime: string;
            }> = [];

            for (let i = 0; i < clips.length; i++) {
                const clip = clips[i];
                const clipNum = i + 1;

                try {
                    event.sender.send("clips-generation-progress", {
                        current: clipNum,
                        total: clips.length,
                        clipIndex: i,
                        status: "starting",
                        message: `Starting clip ${clipNum}/${clips.length}`
                    });

                    const startSec = Math.max(0, parseTimestamp(clip.startTime) - paddingSeconds);
                    const endSec = parseTimestamp(clip.endTime) + paddingSeconds;
                    const duration = endSec - startSec;

                    const safeCaption = clip.suitableCaption.replace(/[^a-zA-Z0-9]/g, "_").substring(0, 30);
                    const outputPath = path.join(
                        outputDirectory,
                        `clip_${clipNum.toString().padStart(3, "0")}_${safeCaption}.mp4`
                    );

                    event.sender.send("clips-generation-progress", {
                        current: clipNum,
                        total: clips.length,
                        clipIndex: i,
                        status: "processing",
                        message: `Cutting clip ${clipNum} (${formatTimestamp(startSec)} to ${formatTimestamp(endSec)})`
                    });

                    await new Promise<void>((resolve, reject) => {
                        const ffmpegArgs = [
                            "-y",
                            "-ss", startSec.toString(),
                            "-i", inputPath,
                            "-t", duration.toString(),
                            "-c:v", "libx264",
                            "-preset", "fast",
                            "-crf", "23",
                            "-c:a", "aac",
                            "-b:a", "128k",
                            "-movflags", "+faststart",
                            outputPath
                        ];

                        activeGeneration = spawn(ffmpegPath!, ffmpegArgs);

                        let stderr = "";
                        activeGeneration.stderr.on("data", (data) => {
                            stderr += data.toString();
                        });

                        activeGeneration.on("close", (code) => {
                            activeGeneration = null;
                            if (code === 0 && fs.existsSync(outputPath)) {
                                resolve();
                            } else {
                                reject(new Error(`FFmpeg exited with code ${code}: ${stderr}`));
                            }
                        });

                        activeGeneration.on("error", (err) => {
                            activeGeneration = null;
                            reject(err);
                        });
                    });

                    results.push({
                        clipIndex: i,
                        success: true,
                        outputPath,
                        startTime: clip.startTime,
                        endTime: clip.endTime
                    });

                    event.sender.send("clips-generation-progress", {
                        current: clipNum,
                        total: clips.length,
                        clipIndex: i,
                        status: "completed",
                        message: `Clip ${clipNum} completed`
                    });

                } catch (err: any) {
                    results.push({
                        clipIndex: i,
                        success: false,
                        error: err.message,
                        startTime: clip.startTime,
                        endTime: clip.endTime
                    });

                    event.sender.send("clips-generation-progress", {
                        current: clipNum,
                        total: clips.length,
                        clipIndex: i,
                        status: "error",
                        message: `Clip ${clipNum} failed: ${err.message}`
                    });
                }
            }

            const successCount = results.filter(r => r.success).length;
            const failedCount = results.filter(r => !r.success).length;

            return {
                success: failedCount === 0,
                outputDir: outputDirectory,
                totalClips: clips.length,
                successfulClips: successCount,
                failedClips: failedCount,
                results
            };

        }
    );

    ipcMain.handle("cancel-clips-generation", async () => {
        if (activeGeneration) {
            try {
                activeGeneration.kill("SIGTERM");
                activeGeneration = null;
                return { success: true };
            } catch (err) {
                return { success: false, error: String(err) };
            }
        }
        return { success: false, error: "No active generation to cancel" };
    });

    ipcMain.handle("open-clips-folder", async (_, folderPath: string) => {
        try {
            const { shell } = await import("electron");
            if (!fs.existsSync(folderPath)) {
                fs.mkdirSync(folderPath, { recursive: true });
            }
            await shell.openPath(folderPath);
            return { success: true };
        } catch (err) {
            return { success: false, error: String(err) };
        }
    });
}
