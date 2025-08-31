import { spawn } from "child_process";
import path from "path";
import { transcriptsDir } from "./paths.js";
import { resolveBinaryPath } from "../util.js";

export async function runWhisper(modelPath: string, audioPath: string, outBaseName: string, web: Electron.WebContents) {
    const whisperBin = resolveBinaryPath("whisper-cli");
    const outBase = path.join(transcriptsDir(), outBaseName);

    await new Promise<void>((resolve, reject) => {
        const child = spawn(whisperBin, [
            "-m", modelPath,
            "-f", audioPath,
            "-otxt",
            "-osrt",
            "-of", outBase,
        ]);

        child.stdout.on("data", (chunk) => web.send("whisper:log", chunk.toString()));
        child.stderr.on("data", (chunk) => web.send("whisper:log", chunk.toString()));

        child.on("close", (code) =>
            code === 0 ? resolve() : reject(new Error(`whisper exited ${code}`))
        );
    });

    return {
        txt: `${outBase}.txt`,
        srt: `${outBase}.srt`,
    };
}
