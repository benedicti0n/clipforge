import { Canvas } from "skia-canvas";
import { drawSubtitles } from "./drawSubtitles.js";
import { drawCustomTexts } from "./drawCustomTexts.js";

import type { SubtitleEntry, SubtitleStyle, CustomText } from "../../../types/subtitleTypes";

export async function renderFrame(
    img: any,
    frameNumber: number,
    fps: number,
    subtitles: SubtitleEntry[],
    subtitleStyle: SubtitleStyle,
    customTexts: CustomText[]
) {
    const canvas = new Canvas(img.width, img.height);
    const ctx = canvas.getContext("2d");

    // draw base video frame
    ctx.drawImage(img, 0, 0);

    const timeSec = frameNumber / fps;

    // subtitles
    drawSubtitles(ctx, img, subtitles, subtitleStyle, timeSec);

    // custom overlays
    drawCustomTexts(ctx, img, customTexts, subtitleStyle);

    return canvas.png;
}
