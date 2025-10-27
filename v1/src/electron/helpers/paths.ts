import { app } from "electron";
import path from "path";

export function modelsDir() {
    return path.join(app.getPath("userData"), "whisper", "models");
}

export function transcriptsDir() {
    return path.join(app.getPath("userData"), "whisper", "transcripts");
}

export function clipsDir() {
    return path.join(app.getPath("userData"), "clips");
}

export function clipOutputPath(index: number) {
    return path.join(clipsDir(), `clip-${index}.mp4`);
}