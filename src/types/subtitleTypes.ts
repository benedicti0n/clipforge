// Shared types for subtitles, styles, and overlays

export interface SubtitleEntry {
    start: string;   // e.g. "00:00:01,000"
    end: string;     // e.g. "00:00:04,500"
    text: string;
}

export interface SubtitleStyle {
    fontSize: number;     // px
    fontColor: string;    // "#RRGGBB"
    strokeColor: string;  // "#RRGGBB"
    fontFamily: string;   // "Arial", "Helvetica", etc.
    x: number;            // 0..100 (percentage across width)
    y: number;            // 0..100 (percentage across height)
}

export interface CustomText {
    text: string;
    fontSize: number;
    fontColor: string;    // "#RRGGBB"
    strokeColor: string;  // "#RRGGBB"
    fontFamily: string;
    x: number;            // 0..100 (%)
    y: number;            // 0..100 (%)
}
