import type { CustomText, SubtitleStyle } from "./subtitleTypes";

export interface Preset {
    id: string; // uuid
    name: string;
    createdAt: number;
    subtitleStyle: SubtitleStyle;
    customTexts: CustomText[];
}
