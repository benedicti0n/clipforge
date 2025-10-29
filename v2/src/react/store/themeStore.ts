// src/react/store/themeStore.ts
import { create } from "zustand";
import { persist } from "zustand/middleware";

export type Theme = "light" | "dark" | "system" | string;

interface ThemeState {
    theme: Theme;
    setTheme: (theme: Theme) => void;
    initTheme: () => void;
}

/**
 * Persisted Zustand store for theme management
 * - Saves theme to localStorage
 * - Restores it on app load
 * - Handles system theme changes in real time
 */
export const useThemeStore = create<ThemeState>()(
    persist(
        (set) => ({
            theme: "system",

            setTheme: (theme) => {
                set({ theme });
                applyTheme(theme);
            },

            initTheme: () => {
                const saved = (localStorage.getItem("theme") as Theme) || "system";
                set({ theme: saved });
                applyTheme(saved);

                // Listen for OS-level theme changes
                const media = window.matchMedia("(prefers-color-scheme: dark)");
                const handleChange = () => {
                    const current = (localStorage.getItem("theme") as Theme) || "system";
                    if (current === "system") applyTheme("system");
                };
                media.addEventListener("change", handleChange);
            },
        }),
        {
            name: "clipforge-theme", // key in localStorage
            partialize: (state) => ({ theme: state.theme }), // persist only theme
            onRehydrateStorage: () => (state) => {
                // Once Zustand rehydrates, immediately apply the theme
                if (state?.theme) applyTheme(state.theme);
            },
        }
    )
);

/**
 * Applies the chosen theme to the document root
 */
function applyTheme(theme: Theme) {
    if (theme === "system") {
        const isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
        document.documentElement.className = isDark ? "dark" : "light";
    } else {
        document.documentElement.className = theme;
    }

    // Store theme manually too (for external access if needed)
    localStorage.setItem("theme", theme);
}
