import { create } from "zustand";

type ThemeState = {
    theme: "light" | "dark";
    toggleTheme: () => void;
    setTheme: (t: "light" | "dark") => void;
};

// Key for localStorage
const THEME_KEY = "app-theme";

export const useThemeStore = create<ThemeState>((set) => {
    // Load initial theme from localStorage (fallback: dark)
    const stored = (localStorage.getItem(THEME_KEY) as "light" | "dark") || "dark";

    return {
        theme: stored,
        toggleTheme: () =>
            set((state) => {
                const next = state.theme === "light" ? "dark" : "light";
                localStorage.setItem(THEME_KEY, next);
                return { theme: next };
            }),
        setTheme: (t) => {
            localStorage.setItem(THEME_KEY, t);
            set({ theme: t });
        },
    };
});
