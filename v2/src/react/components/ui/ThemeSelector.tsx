"use client";

import { useEffect } from "react";
import { useThemeStore } from "../../store/themeStore";
import { THEMES } from "../../lib/themeList";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "./button";
import { Palette } from "lucide-react";

export const ThemeSelector = () => {
  const { theme, setTheme, initTheme } = useThemeStore();

  useEffect(() => {
    initTheme();
  }, []);

  return (
    <div className="fixed bottom-5 right-5 z-50">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="icon"
            className="rounded-full shadow-md bg-background/80 backdrop-blur border hover:bg-accent transition"
            title={`Current theme: ${theme}`}
          >
            <Palette className="w-5 h-5" />
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent
          align="end"
          side="top"
          className="w-56 max-h-[70vh] overflow-y-auto [&::-webkit-scrollbar]:hidden scrollbar-hide"
        >
          {THEMES.map((t) => (
            <DropdownMenuItem
              key={t.value}
              onClick={() => setTheme(t.value)}
              className={`flex items-center gap-3 cursor-pointer ${theme === t.value ? "bg-accent" : ""
                }`}
            >
              <span
                className="w-4 h-4 rounded-full"
                style={{ backgroundColor: t.color }}
              />
              <span>{t.label}</span>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};
