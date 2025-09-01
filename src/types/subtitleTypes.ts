// Shared types for subtitles, styles, and overlays

export interface SubtitleEntry {
    start: string;   // e.g. "00:00:01,000"
    end: string;     // e.g. "00:00:04,500"
    text: string;
}

export interface SubtitleStyle {
    fontSize: number;
    fontColor: string;
    strokeColor: string;
    fontFamily: string;
    x: number; // %
    y: number; // %
    strokeWidth: number; // NEW
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
