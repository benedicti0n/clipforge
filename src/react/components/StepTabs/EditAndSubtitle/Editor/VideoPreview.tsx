import type { RefObject } from "react";
import type { SubtitleStyle, CustomText } from "./SubtitleModal";

interface Props {
    videoRef: RefObject<HTMLVideoElement>;
    filePath: string;
    activeLine: { text: string } | null;
    subtitleStyle: SubtitleStyle;
    customTexts: CustomText[];
    activeIndex: number | null;
}

export function VideoPreview({
    videoRef,
    filePath,
    activeLine,
    subtitleStyle,
    customTexts,
    activeIndex,
}: Props) {
    return (
        <div className="relative w-full h-full">
            <video
                ref={videoRef}
                src={`file://${filePath}`}
                controls
                className="w-full h-full object-contain"
            />

            {activeLine && (
                <div
                    className="absolute text-center pointer-events-none whitespace-pre-line"
                    style={{
                        top: `${subtitleStyle.y}%`,
                        left: `${subtitleStyle.x}%`,
                        transform: "translate(-50%, -50%)",
                        fontSize: `${subtitleStyle.fontSize}px`,
                        color: subtitleStyle.fontColor,
                        fontFamily: subtitleStyle.fontFamily,
                        WebkitTextStroke: `1px ${subtitleStyle.strokeColor}`,
                    }}
                >
                    {activeLine.text}
                </div>
            )}

            {customTexts.map((t, i) => (
                <div
                    key={i}
                    className={`absolute ${activeIndex === i ? "ring-2 ring-blue-500" : ""
                        }`}
                    style={{
                        top: `${t.y}%`,
                        left: `${t.x}%`,
                        transform: `translate(-50%, -50%)`,
                        fontSize: `${t.fontSize}px`,
                        color: t.fontColor,
                        fontFamily: t.fontFamily,
                        WebkitTextStroke: `1px ${t.strokeColor}`,
                        pointerEvents: "none",
                        whiteSpace: "pre-wrap",
                        textAlign: "center",
                    }}
                >
                    {t.text}
                </div>
            ))}
        </div>
    );
}
