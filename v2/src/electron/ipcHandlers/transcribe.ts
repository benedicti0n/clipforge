import { ipcMain, app } from "electron";
import path from "path";
import fs from "fs";
import { spawn, ChildProcessWithoutNullStreams } from "child_process";
import ffmpegPath from "ffmpeg-static";

let activeTranscribe: ChildProcessWithoutNullStreams | null = null;

function getWhisperBinPath() {
    const platform = process.platform;
    const arch = process.arch;
    const base = app.isPackaged
        ? path.join(process.resourcesPath, "bin")
        : path.join(process.cwd(), "bin");

    if (platform === "darwin")
        return path.join(base, arch === "arm64" ? "whisper-macos-arm64" : "whisper-macos-x64");
    if (platform === "win32") return path.join(base, "whisper-windows-x64.exe");
    return path.join(base, "whisper-linux-x64");
}

function resolveModelPath(modelFileName: string) {
    const modelsDir = path.join(app.getPath("userData"), "whisperModels");
    return path.join(modelsDir, path.basename(modelFileName));
}

export function registerTranscriptionHandlers() {
    ipcMain.handle(
        "start-transcription",
        async (event, payload: {
            modelKey: string;
            modelFilename: string;
            inputPath: string;
            locale?: string;
            translate?: boolean;
        }) => {
            if (activeTranscribe) {
                event.sender.send("transcribe-error", { error: "Another transcription is already running." });
                return false;
            }

            try {
                const { modelFilename, inputPath, locale = "auto", translate = false } = payload;

                const binPath = getWhisperBinPath();
                if (!fs.existsSync(binPath)) throw new Error(`whisper binary not found at: ${binPath}`);

                const modelPath = resolveModelPath(modelFilename);
                if (!fs.existsSync(modelPath)) throw new Error(`Model not found: ${modelPath}`);
                if (!fs.existsSync(inputPath)) throw new Error(`Input file missing: ${inputPath}`);

                const outDir = path.join(app.getPath("userData"), "transcripts");
                if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
                const outPrefix = path.join(outDir, `${Date.now()}`);

                // ----------------------------------------------------------------
                // 🎧 1️⃣ Convert video → WAV (async via ffmpeg-static)
                // ----------------------------------------------------------------
                const inputExt = path.extname(inputPath).toLowerCase();
                let audioPath = inputPath;
                let tempAudioPath: string | null = null;

                if ([".mp4", ".mov", ".mkv", ".webm", ".avi"].includes(inputExt)) {
                    tempAudioPath = path.join(app.getPath("userData"), `temp_audio_${Date.now()}.wav`);
                    console.log("🎧 Extracting audio with ffmpeg:", ffmpegPath);

                    await new Promise<void>((resolve, reject) => {
                        const ff = spawn(ffmpegPath!, [
                            "-y",
                            "-i", inputPath,
                            "-vn",
                            "-acodec", "pcm_s16le",
                            "-ar", "16000",
                            "-ac", "1",
                            tempAudioPath,
                        ]);

                        let stderr = "";
                        ff.stderr.on("data", (d) => (stderr += d.toString()));
                        ff.on("close", (code) => {
                            if (code === 0 && fs.existsSync(tempAudioPath!)) {
                                console.log("✅ Audio extracted:", tempAudioPath);
                                resolve();
                            } else {
                                reject(new Error(`FFmpeg failed: ${stderr}`));
                            }
                        });
                    });

                    audioPath = tempAudioPath;
                }

                // ----------------------------------------------------------------
                // 🧠 2️⃣ Run whisper.cpp
                // ----------------------------------------------------------------
                const args = [
                    "-m", modelPath,
                    "-f", audioPath,
                    "-oj",
                    "-of", outPrefix,
                    "-osrt",
                    "-ovtt",
                    "-ps", "0",
                    "-l", locale,
                ];
                if (translate) args.push("--translate");

                if (process.platform !== "win32") {
                    try { fs.chmodSync(binPath, 0o755); } catch { }
                }

                console.log("🚀 Launching whisper.cpp:", args.join(" "));
                activeTranscribe = spawn(binPath, args, { stdio: ["ignore", "pipe", "pipe"] });

                activeTranscribe.stdout.on("data", (d) => {
                    event.sender.send("transcribe-log", { line: d.toString() });
                });
                activeTranscribe.stderr.on("data", (d) => {
                    event.sender.send("transcribe-log", { line: d.toString() });
                });

                activeTranscribe.on("error", (err) => {
                    console.error("❌ Whisper process error:", err);
                    activeTranscribe = null;
                    event.sender.send("transcribe-error", { error: err.message });
                });

                activeTranscribe.on("close", (code) => {
                    console.log("🧩 Whisper process exited with code:", code);
                    activeTranscribe = null;

                    if (tempAudioPath && fs.existsSync(tempAudioPath)) {
                        fs.unlink(tempAudioPath, () => console.log("🧹 Deleted temp audio"));
                    }

                    if (code !== 0) {
                        event.sender.send("transcribe-error", { error: `whisper exited with code ${code}` });
                        return;
                    }

                    // ----------------------------------------------------------------
                    // 📄 3️⃣ Read Whisper output
                    // ----------------------------------------------------------------
                    const jsonPath = fs.existsSync(`${outPrefix}.json`)
                        ? `${outPrefix}.json`
                        : fs.existsSync(`${outPrefix}.jsonl`)
                            ? `${outPrefix}.jsonl`
                            : null;

                    if (!jsonPath || !fs.existsSync(jsonPath)) {
                        event.sender.send("transcribe-error", { error: "No JSON output produced by whisper.cpp" });
                        return;
                    }

                    try {
                        const raw = fs.readFileSync(jsonPath, "utf8");
                        const parsed = JSON.parse(raw);

                        // ✅ handle both old and new whisper.cpp output formats
                        const srcArray = parsed.transcription || parsed.segments || [];

                        const segments = srcArray.map((s: any) => {
                            const startMs =
                                s.offsets?.from ??
                                (s.t0 != null ? s.t0 * 10 : s.start ?? 0);
                            const endMs =
                                s.offsets?.to ??
                                (s.t1 != null ? s.t1 * 10 : s.end ?? 0);

                            return {
                                start: startMs / 1000, // convert ms → seconds
                                end: endMs / 1000,
                                text: (s.text ?? "").replace(/\[_[A-Z]+_.*?\]/g, "").trim(),
                            };
                        });

                        console.log(`📤 Sending ${segments.length} segments`);
                        const srtPath = `${outPrefix}.srt`;
                        const srt = fs.existsSync(srtPath) ? fs.readFileSync(srtPath, "utf8") : "";

                        event.sender.send("transcribe-result", { segments, srt, jsonPath, srtPath });
                    } catch (e: any) {
                        console.error("❌ Failed reading output:", e);
                        event.sender.send("transcribe-error", { error: `Failed to read output: ${e.message}` });
                    }
                });

                return true;
            } catch (err: any) {
                console.error("❌ Transcription failed:", err);
                activeTranscribe = null;
                event.sender.send("transcribe-error", { error: err.message });
                return false;
            }
        }
    );

    // Cancel handler
    ipcMain.handle("cancel-transcription", async () => {
        if (activeTranscribe) {
            try { activeTranscribe.kill("SIGTERM"); } catch { }
            activeTranscribe = null;
            return true;
        }
        return false;
    });

    ipcMain.handle("get-user-data-path", async () => app.getPath("userData"));
}
