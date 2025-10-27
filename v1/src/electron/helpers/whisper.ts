import { spawn, ChildProcess } from "node:child_process";
import path from "node:path";
import { accessSync, constants } from "node:fs";
import { transcriptsDir } from "../helpers/paths.js";
import { whisperCli } from "../helpers/resolveBinary.js";

function assertExec(p: string, label: string) {
    if (!p) throw new Error(`${label} path empty`);
    accessSync(p, constants.X_OK);
}

export async function runWhisper(
    modelPath: string,
    audioPath: string,
    outBaseName: string,
    web: Electron.WebContents,
    onStart?: (proc: ChildProcess) => void
) {
    const whisperBin = whisperCli;
    assertExec(whisperBin, "whisper-cli");

    const outBase = path.join(transcriptsDir(), outBaseName);

    return await new Promise<{ txt: string; srt: string; stopped?: boolean }>((resolve, reject) => {
        let stderrBuf = "";
        const child = spawn(whisperBin, [
            "-m", modelPath,
            "-f", audioPath,
            "-otxt",
            "-osrt",
            "-of", outBase,
        ], { stdio: ["ignore", "pipe", "pipe"] });

        if (onStart) onStart(child);

        child.stdout.on("data", (chunk) => web.send("whisper:log", chunk.toString()));
        child.stderr.on("data", (chunk) => {
            const s = chunk.toString();
            stderrBuf += s;
            web.send("whisper:log", s);
        });

        child.on("close", (code, signal) => {
            if (signal) {
                web.send("whisper:stopped", { signal });
                resolve({ txt: "", srt: "", stopped: true });
            } else if (code === 0) {
                resolve({ txt: `${outBase}.txt`, srt: `${outBase}.srt` });
            } else {
                reject(new Error(`whisper exited with code ${code}\nStderr:\n${stderrBuf}`));
            }
        });

        child.on("error", (err) => {
            reject(new Error(`whisper spawn error: ${err.message}`));
        });
    });
}
