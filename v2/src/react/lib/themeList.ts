// src/react/lib/themeList.ts
export interface ThemeOption {
    label: string;
    value: string;
    color: string; // swatch or accent color
}

export const THEMES: ThemeOption[] = [
    { label: "Light", value: "light", color: "#f5f5f5" },
    { label: "Dark", value: "dark", color: "#1e1e1e" },
    { label: "System", value: "system", color: "#999999" },
    // ↓ Add your TweakCN themes here ↓
    { label: "Amethyst Haze", value: "amethyst-haze", color: "oklch(0.6104 0.0767 299.7335)" },
    { label: "Amethyst Haze Dark", value: "amethyst-haze-dark", color: "oklch(0.7058 0.0777 302.0489)" },
    { label: "Caffeine", value: "caffeine", color: "oklch(0.4341 0.0392 41.9938)" },
    { label: "Caffeine Dark", value: "caffeine-dark", color: " oklch(0.9247 0.0524 66.1732)" },
    { label: "Catppuccin", value: "catppuccin", color: "oklch(0.5547 0.2503 297.0156)" },
    { label: "Catppuccin Dark", value: "catppuccin-dark", color: "oklch(0.7871 0.1187 304.7693)" },
    { label: "Claude", value: "claude", color: "oklch(0.6171 0.1375 39.0427)" },
    { label: "Claude Dark", value: "claude-dark", color: "oklch(0.6724 0.1308 38.7559)" },
    { label: "Claymorphism", value: "claymorphism", color: "oklch(0.5854 0.2041 277.1173)" },
    { label: "Claymorphism Dark", value: "claymorphism-dark", color: "oklch(0.6801 0.1583 276.9349)" },
    { label: "Cosmic Night", value: "cosmic-night", color: "oklch(0.5417 0.179 288.0332)" },
    { label: "Cosmic Night Dark", value: "cosmic-night-dark", color: "oklch(0.7162 0.1597 290.3962)" },
    { label: "Darkmatter", value: "darkmatter", color: "oklch(0.6716 0.1368 48.513)" },
    { label: "Darkmatter Dark", value: "darkmatter-dark", color: "oklch(0.7214 0.1337 49.9802)" },
    { label: "Graphite", value: "graphite", color: "oklch(0.4891 0 0)" },
    { label: "Graphite Dark", value: "graphite-dark", color: "oklch(0.7058 0 0)" },
    { label: "Midnight Bloom", value: "midnight-bloom", color: "oklch(0.5676 0.2021 283.0838)" },
    { label: "Midnight Bloom Dark", value: "midnight-bloom-dark", color: "oklch(0.5676 0.2021 283.0838)" },
    { label: "Northern Lights", value: "northern-lights", color: "oklch(0.6487 0.1538 150.3071)" },
    { label: "Northern Lights Dark", value: "northern-lights-dark", color: "oklch(0.6487 0.1538 150.3071)" },
    { label: "T3 Chat", value: "t3-chat", color: "oklch(0.5316 0.1409 355.1999)" },
    { label: "T3 Chat Dark", value: "t3-chat-dark", color: "oklch(0.4607 0.1853 4.0994)" },
    { label: "Twitter", value: "twitter", color: "oklch(0.6723 0.1606 244.9955)" },
    { label: "Twitter Dark", value: "twitter-dark", color: "oklch(0.6692 0.1607 245.011)" },
    { label: "Vintage Paper", value: "vintage-paper", color: "oklch(0.618 0.0778 65.5444)" },
    { label: "Vintage Paper Dark", value: "vintage-paper-dark", color: "oklch(0.7264 0.0581 66.6967)" },
];
