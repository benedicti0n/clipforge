// src/react/store/themeStore.ts
import { create } from "zustand";

export type Theme = "light" | "dark" | "system" | string;

interface ThemeState {
    theme: Theme;
    setTheme: (theme: Theme) => void;
    initTheme: () => void;
}

export const useThemeStore = create<ThemeState>((set) => ({
    theme: "system",

    setTheme: (theme) => {
        set({ theme });
        localStorage.setItem("theme", theme);
        applyTheme(theme);
    },

    initTheme: () => {
        const saved = (localStorage.getItem("theme") as Theme) || "system";
        set({ theme: saved });
        applyTheme(saved);

        // Live system detection
        const media = window.matchMedia("(prefers-color-scheme: dark)");
        const handleChange = () => {
            const current = localStorage.getItem("theme") as Theme;
            if (current === "system") applyTheme("system");
        };
        media.addEventListener("change", handleChange);
    },
}));

function applyTheme(theme: Theme) {
    if (theme === "system") {
        const isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
        document.documentElement.className = isDark ? "dark" : "light";
    } else {
        document.documentElement.className = theme;
    }
}
