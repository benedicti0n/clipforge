import { spawn } from "child_process";
import { resolveBinaryPath, tmpPath } from "../util.js";

export async function extractAudioToWav(videoPath: string) {
    const ffmpegBin = resolveBinaryPath("ffmpeg");
    const out = tmpPath("audio", "wav");

    await new Promise<void>((resolve, reject) => {
        const ff = spawn(ffmpegBin, [
            "-y",
            "-i", videoPath,
            "-ar", "16000",
            "-ac", "1",
            "-c:a", "pcm_s16le",
            out,
        ]);

        ff.on("close", (code) =>
            code === 0 ? resolve() : reject(new Error(`ffmpeg exited ${code}`))
        );
    });

    return out;
}

export function runFFmpeg(args: string[]): Promise<void> {
    return new Promise((resolve, reject) => {
        console.log("Running ffmpeg:", args.join(" "));
        const ff = spawn("ffmpeg", args);
        ff.stderr.on("data", (d) => console.log(`ffmpeg: ${d}`));
        ff.on("close", (code) => (code === 0 ? resolve() : reject(new Error(`ffmpeg exited ${code}`))));
    });
}
