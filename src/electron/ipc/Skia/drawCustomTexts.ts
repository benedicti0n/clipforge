import { clamp } from "../../helpers/skia.js";
import type { CustomText, SubtitleStyle } from "../../../types/subtitleTypes";
import { CanvasRenderingContext2D } from "skia-canvas";

export function drawCustomTexts(
    ctx: CanvasRenderingContext2D,
    img: { width: number; height: number },
    customTexts: CustomText[],
    subtitleStyle: SubtitleStyle
) {
    if (!customTexts.length) return;

    ctx.lineWidth = subtitleStyle.strokeWidth || 2;
    ctx.globalAlpha = (subtitleStyle.opacity ?? 100) / 100;

    customTexts.forEach((t) => {
        ctx.font = `${t.fontSize}px ${t.fontFamily}`;
        ctx.fillStyle = t.fontColor;
        ctx.strokeStyle = t.strokeColor;

        const x = clamp((img.width * t.x) / 100, 0, img.width);
        const y = clamp((img.height * t.y) / 100, 0, img.height);

        ctx.strokeText(t.text, x, y);
        ctx.fillText(t.text, x, y);
    });

    ctx.globalAlpha = 1;
}
