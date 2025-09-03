import type { CustomText, SubtitleStyle } from "../../../types/subtitleTypes";
import { CanvasRenderingContext2D } from "skia-canvas";

export function drawCustomTexts(
    ctx: CanvasRenderingContext2D,
    img: { width: number; height: number },
    customTexts: CustomText[],
    _subtitleStyle: SubtitleStyle,
    timeSec: number
) {
    const toSeconds = (t?: string) => {
        if (!t) return undefined;
        const [h, m, sMs] = t.split(":");
        const [s, ms] = sMs.split(",");
        return (+h) * 3600 + (+m) * 60 + (+s) + (+ms) / 1000;
    };

    for (const t of customTexts) {
        const start = toSeconds(t.start) ?? 0;
        const end = toSeconds(t.end) ?? Infinity;
        if (timeSec < start || timeSec > end) continue;

        const weight = t.bold ? "bold" : "normal";
        const style = t.italic ? "italic" : "normal";
        ctx.font = `${style} ${weight} ${t.fontSize}px ${t.fontFamily}`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.globalAlpha = (t.opacity ?? 100) / 100;

        const px = (img.width * t.x) / 100;
        const py = (img.height * t.y) / 100;

        if ((t.strokeWidth ?? 0) > 0) {
            ctx.lineWidth = t.strokeWidth ?? 0;
            ctx.strokeStyle = t.strokeColor ?? "#000";
            ctx.strokeText(t.text, px, py);
        }
        ctx.fillStyle = t.fontColor ?? "#fff";
        ctx.fillText(t.text, px, py);

        if (t.underline) {
            const metrics = ctx.measureText(t.text);
            const uy = py + t.fontSize * 0.15;
            ctx.beginPath();
            ctx.moveTo(px - metrics.width / 2, uy);
            ctx.lineTo(px + metrics.width / 2, uy);
            ctx.lineWidth = Math.max(1, t.strokeWidth ?? 1);
            ctx.strokeStyle = t.fontColor ?? "#fff";
            ctx.stroke();
        }
        ctx.globalAlpha = 1;
    }
}  