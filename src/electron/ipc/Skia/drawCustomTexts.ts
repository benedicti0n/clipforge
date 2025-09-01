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
        const weight = t.bold ? "bold" : "normal";
        const style = t.italic ? "italic" : "normal";
        ctx.font = `${style} ${weight} ${t.fontSize}px ${t.fontFamily}`;
        ctx.fillStyle = t.fontColor;
        ctx.strokeStyle = t.strokeColor;

        ctx.globalAlpha = (t.opacity ?? 100) / 100; // ✅ apply per-text opacity

        const x = clamp((img.width * t.x) / 100, 0, img.width);
        const y = clamp((img.height * t.y) / 100, 0, img.height);

        ctx.strokeText(t.text, x, y);
        ctx.fillText(t.text, x, y);

        // ✅ underline support
        if (t.underline) {
            const metrics = ctx.measureText(t.text);
            const underlineY = y + t.fontSize / 2; // tweak offset as needed
            ctx.beginPath();
            ctx.moveTo(x - metrics.width / 2, underlineY);
            ctx.lineTo(x + metrics.width / 2, underlineY);
            ctx.lineWidth = Math.max(1, subtitleStyle.strokeWidth || 2);
            ctx.strokeStyle = t.fontColor;
            ctx.stroke();
        }
    });

    ctx.globalAlpha = 1;
}
