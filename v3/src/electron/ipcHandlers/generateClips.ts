import { ipcMain, app } from "electron";
import fs from "fs";
import path from "path";
import { spawn } from "child_process";
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

let activeGeneration: ReturnType<typeof spawn> | null = null;

function parseTimestamp(ts: string): number {
    console.log(`[generateClips] Parsing timestamp: "${ts}"`);
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

            console.log("[generateClips] ========== STARTING CLIP GENERATION ==========");
            console.log(`[generateClips] Input path: ${inputPath}`);
            console.log(`[generateClips] Number of clips: ${clips.length}`);
            console.log(`[generateClips] Padding seconds: ${paddingSeconds}`);
            console.log(`[generateClips] Output dir: ${outputDir || "default"}`);

            if (!fs.existsSync(inputPath)) {
                console.error(`[generateClips] ERROR: Input video not found: ${inputPath}`);
                return { success: false, error: `Input video not found: ${inputPath}` };
            }
            console.log("[generateClips] Input video exists");

            const outputDirectory = outputDir || path.join(app.getPath("userData"), "generatedClips");
            console.log(`[generateClips] Output directory: ${outputDirectory}`);
            if (!fs.existsSync(outputDirectory)) {
                fs.mkdirSync(outputDirectory, { recursive: true });
                console.log("[generateClips] Created output directory");
            }

            const results: Array<{
                clipIndex: number;
                success: boolean;
                outputPath?: string;
                error?: string;
                startTime: string;
                endTime: string;
            }> = [];

            console.log(`[generateClips] Starting to process ${clips.length} clips...`);

            for (let i = 0; i < clips.length; i++) {
                const clip = clips[i];
                const clipNum = i + 1;

                console.log(`[generateClips] -------- Processing clip ${clipNum}/${clips.length} --------`);
                console.log(`[generateClips] Clip ${clipNum} startTime: ${clip.startTime}`);
                console.log(`[generateClips] Clip ${clipNum} endTime: ${clip.endTime}`);
                console.log(`[generateClips] Clip ${clipNum} suitableCaption: ${clip.suitableCaption}`);

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

                    console.log(`[generateClips] Clip ${clipNum} calculated startSec: ${startSec}`);
                    console.log(`[generateClips] Clip ${clipNum} calculated endSec: ${endSec}`);
                    console.log(`[generateClips] Clip ${clipNum} calculated duration: ${duration}`);

                    const safeCaption = clip.suitableCaption.replace(/[^a-zA-Z0-9]/g, "_").substring(0, 30);
                    const outputPath = path.join(
                        outputDirectory,
                        `clip_${clipNum.toString().padStart(3, "0")}_${safeCaption}.mp4`
                    );
                    console.log(`[generateClips] Clip ${clipNum} outputPath: ${outputPath}`);

                    event.sender.send("clips-generation-progress", {
                        current: clipNum,
                        total: clips.length,
                        clipIndex: i,
                        status: "processing",
                        message: `Cutting clip ${clipNum} (${formatTimestamp(startSec)} to ${formatTimestamp(endSec)})`
                    });

                    console.log(`[generateClips] Clip ${clipNum} spawning FFmpeg...`);
                    console.log(`[generateClips] Clip ${clipNum} ffmpegPath: ${ffmpegPath}`);

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

                        console.log(`[generateClips] Clip ${clipNum} FFmpeg command: ${ffmpegPath} ${ffmpegArgs.join(" ")}`);

                        activeGeneration = spawn(ffmpegPath!, ffmpegArgs);

                        let stderr = "";
                        activeGeneration.stderr?.on("data", (data) => {
                            stderr += data.toString();
                        });

                        activeGeneration.on("close", (code) => {
                            console.log(`[generateClips] Clip ${clipNum} FFmpeg closed with code: ${code}`);
                            if (stderr) {
                                console.log(`[generateClips] Clip ${clipNum} FFmpeg stderr (last 500 chars): ${stderr.slice(-500)}`);
                            }
                            activeGeneration = null;
                            if (code === 0 && fs.existsSync(outputPath)) {
                                console.log(`[generateClips] Clip ${clipNum} SUCCESS - output file exists`);
                                resolve();
                            } else {
                                console.error(`[generateClips] Clip ${clipNum} FAILED - code: ${code}, stderr: ${stderr}`);
                                reject(new Error(`FFmpeg exited with code ${code}: ${stderr}`));
                            }
                        });

                        activeGeneration.on("error", (err) => {
                            console.error(`[generateClips] Clip ${clipNum} FFmpeg error: ${err.message}`);
                            activeGeneration = null;
                            reject(err);
                        });

                        activeGeneration.on("spawn", () => {
                            console.log(`[generateClips] Clip ${clipNum} FFmpeg spawned successfully`);
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

                    console.log(`[generateClips] Clip ${clipNum} marked as completed`);

                } catch (err: any) {
                    console.error(`[generateClips] Clip ${clipNum} ERROR: ${err.message}`);
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

            console.log(`[generateClips] ========== CLIP GENERATION COMPLETE ==========`);
            console.log(`[generateClips] Total: ${clips.length}, Success: ${successCount}, Failed: ${failedCount}`);

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
        console.log("[generateClips] Cancel requested");
        if (activeGeneration) {
            try {
                activeGeneration.kill("SIGTERM");
                activeGeneration = null;
                console.log("[generateClips] Canceled successfully");
                return { success: true };
            } catch (err) {
                console.error(`[generateClips] Cancel error: ${err}`);
                return { success: false, error: String(err) };
            }
        }
        console.log("[generateClips] No active generation to cancel");
        return { success: false, error: "No active generation to cancel" };
    });

    ipcMain.handle("open-clips-folder", async (_, folderPath: string) => {
        console.log(`[generateClips] Open folder: ${folderPath}`);
        try {
            const { shell } = await import("electron");
            if (!fs.existsSync(folderPath)) {
                fs.mkdirSync(folderPath, { recursive: true });
            }
            await shell.openPath(folderPath);
            return { success: true };
        } catch (err) {
            console.error(`[generateClips] Open folder error: ${err}`);
            return { success: false, error: String(err) };
        }
    });
}
