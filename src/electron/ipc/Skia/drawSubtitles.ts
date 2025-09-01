import { clamp, applyOpacity, drawRoundedRect } from "../../helpers/skia.js";
import type { SubtitleEntry, SubtitleStyle } from "../../../types/subtitleTypes";
import { CanvasRenderingContext2D } from "skia-canvas";

export function drawSubtitles(
    ctx: CanvasRenderingContext2D,
    img: { width: number; height: number },
    subtitles: SubtitleEntry[],
    subtitleStyle: SubtitleStyle,
    timeSec: number
) {
    // filter active subs for this frame
    const activeSubs = subtitles.filter(
        (s) => timeSec >= toSeconds(s.start) && timeSec <= toSeconds(s.end)
    );
    if (activeSubs.length === 0) return;

    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    const weight = subtitleStyle.bold ? "bold" : "normal";
    const style = subtitleStyle.italic ? "italic" : "normal";
    ctx.font = `${style} ${weight} ${subtitleStyle.fontSize || 24}px ${subtitleStyle.fontFamily || "Arial"}`;
    ctx.strokeStyle = subtitleStyle.strokeColor;
    ctx.lineWidth = subtitleStyle.strokeWidth || 1;

    // opacity
    ctx.globalAlpha = (subtitleStyle.opacity ?? 100) / 100;

    activeSubs.forEach((sub) => {
        const x = clamp((img.width * subtitleStyle.x) / 100, 0, img.width);
        const y = clamp((img.height * subtitleStyle.y) / 100, 0, img.height);

        // background box
        if (subtitleStyle.backgroundEnabled) {
            ctx.fillStyle = applyOpacity(
                subtitleStyle.backgroundColor,
                subtitleStyle.backgroundOpacity / 100
            );

            const metrics = ctx.measureText(sub.text);
            const padding = subtitleStyle.backgroundPadding ?? 10;
            const boxWidth = metrics.width + padding * 2;
            const boxHeight = subtitleStyle.fontSize + padding;

            drawRoundedRect(
                ctx,
                x - boxWidth / 2,
                y - boxHeight / 2,
                boxWidth,
                boxHeight,
                subtitleStyle.backgroundRadius
            );
            ctx.fill();
        }

        // text fill after background
        ctx.fillStyle = subtitleStyle.fontColor;
        ctx.strokeText(sub.text, x, y);
        ctx.fillText(sub.text, x, y);

        if (subtitleStyle.underline) {
            const metrics = ctx.measureText(sub.text);
            const underlineY = y + (subtitleStyle.fontSize / 2); // tweak if needed
            ctx.beginPath();
            ctx.moveTo(x - metrics.width / 2, underlineY);
            ctx.lineTo(x + metrics.width / 2, underlineY);
            ctx.lineWidth = Math.max(1, subtitleStyle.strokeWidth || 2);
            ctx.strokeStyle = subtitleStyle.fontColor;
            ctx.stroke();
        }

    });

    ctx.globalAlpha = 1; // reset
}

function toSeconds(srtTime: string): number {
    const [hms, ms = "0"] = srtTime.split(",");
    const [h, m, s] = hms.split(":").map(Number);
    return h * 3600 + m * 60 + s + (parseInt(ms, 10) || 0) / 1000;
}
