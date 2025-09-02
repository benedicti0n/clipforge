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

    customTexts.forEach((t) => {
        const weight = t.bold ? "bold" : "normal";
        const style = t.italic ? "italic" : "normal";

        ctx.font = `${style} ${weight} ${t.fontSize}px ${t.fontFamily}`;
        ctx.fillStyle = t.fontColor;
        ctx.strokeStyle = t.strokeColor;
        ctx.lineWidth = t.strokeWidth ?? subtitleStyle.strokeWidth ?? 2; // ✅ per-text stroke width
        ctx.globalAlpha = (t.opacity ?? subtitleStyle.opacity ?? 100) / 100;

        const x = clamp((img.width * t.x) / 100, 0, img.width);
        const y = clamp((img.height * t.y) / 100, 0, img.height);

        // Stroke first, then fill for best contrast
        if (ctx.lineWidth > 0) ctx.strokeText(t.text, x, y);
        ctx.fillText(t.text, x, y);

        // ✅ underline support
        if (t.underline) {
            const metrics = ctx.measureText(t.text);
            const underlineY = y + t.fontSize * 0.15; // slightly below baseline
            ctx.beginPath();
            ctx.moveTo(x, underlineY);
            ctx.lineTo(x + metrics.width, underlineY);
            ctx.lineWidth = Math.max(1, t.strokeWidth ?? 2);
            ctx.strokeStyle = t.fontColor;
            ctx.stroke();
        }
    });

    // reset alpha
    ctx.globalAlpha = 1;
}
