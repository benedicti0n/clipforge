import { spawn, ChildProcess } from "child_process";
import path from "path";
import { transcriptsDir } from "./paths.js";
import { resolveBinaryPath } from "../util.js";

export async function runWhisper(
    modelPath: string,
    audioPath: string,
    outBaseName: string,
    web: Electron.WebContents,
    onStart?: (proc: ChildProcess) => void
) {
    const whisperBin = resolveBinaryPath("whisper-cli");
    const outBase = path.join(transcriptsDir(), outBaseName);

    return await new Promise<{ txt: string; srt: string; stopped?: boolean }>((resolve, reject) => {
        const child = spawn(whisperBin, [
            "-m", modelPath,
            "-f", audioPath,
            "-otxt",
            "-osrt",
            "-of", outBase,
        ]);

        if (onStart) onStart(child);

        child.stdout.on("data", (chunk) => web.send("whisper:log", chunk.toString()));
        child.stderr.on("data", (chunk) => web.send("whisper:log", chunk.toString()));

        child.on("close", (code, signal) => {
            if (signal) {
                // ✅ stopped by user
                web.send("whisper:stopped", { signal });
                resolve({ txt: "", srt: "", stopped: true });
            } else if (code === 0) {
                resolve({
                    txt: `${outBase}.txt`,
                    srt: `${outBase}.srt`,
                });
            } else {
                reject(new Error(`whisper exited with code ${code}`));
            }
        });

        child.on("error", (err) => {
            reject(err);
        });
    });
}
