// src/react/components/ui/ThemeSelector.tsx
"use client";

import { useState, useEffect, useRef } from "react";
import { useThemeStore } from "../../store/themeStore";
import { THEMES } from "../../lib/themeList";
import { Button } from "./button";
import { ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export const ThemeSelector = () => {
  const { theme, setTheme, initTheme } = useThemeStore();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    initTheme();
  }, []);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={ref} className="relative inline-block">
      <Button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2"
      >
        Theme: {theme} <ChevronDown className="w-4 h-4" />
      </Button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            transition={{ duration: 0.15 }}
            className="absolute mt-2 z-50 w-56 bg-popover border rounded-xl shadow-lg overflow-hidden"
          >
            {THEMES.map((t) => (
              <button
                key={t.value}
                onClick={() => {
                  setTheme(t.value);
                  setOpen(false);
                }}
                className={`flex items-center w-full px-3 py-2 text-sm hover:bg-accent transition ${theme === t.value ? "bg-accent" : ""
                  }`}
              >
                <span
                  className="w-4 h-4 rounded-full mr-3"
                  style={{ backgroundColor: t.color }}
                />
                {t.label}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
