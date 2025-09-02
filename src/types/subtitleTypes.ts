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
    x: number;
    y: number;
    strokeWidth: number;
    backgroundEnabled: boolean;
    backgroundColor: string;
    backgroundOpacity: number;
    backgroundRadius: number;
    backgroundPadding: number;
    opacity: number;
    bold?: boolean;
    italic?: boolean;
    underline?: boolean;
}

export interface CustomText {
    text: string;
    fontSize: number;
    fontColor: string;
    strokeColor: string;
    strokeWidth: number; // ✅ NEW
    fontFamily: string;
    x: number; // percentage
    y: number; // percentage
    bold: boolean;
    italic: boolean;
    underline: boolean;
    opacity: number;
}
