// src/electron/helpers/resolveBinary.ts
import path from "path";
import { app } from "electron";
import ffmpegPath from "ffmpeg-static";
import ffprobePath from "ffprobe-static";

// ffprobe-static typings export an object, grab the .path
const ffprobeResolved: string =
    typeof ffprobePath === "string" ? ffprobePath : (ffprobePath.path as string);

function resolveBinary(binPath: string) {
    if (!binPath) return "";
    if (app.isPackaged) {
        // When packaged, binaries are copied into resources/bin
        return path.join(process.resourcesPath, "bin", path.basename(binPath));
    }
    // In dev, just use the node_modules path
    return binPath;
}

export const ffmpeg = resolveBinary(ffmpegPath!);
export const ffprobe = resolveBinary(ffprobeResolved);
