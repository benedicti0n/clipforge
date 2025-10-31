// src/react/App.tsx
"use client";

import { useEffect } from "react";
import { AppTabs } from "./components/ui/AppTabs";
import { ThemeSelector } from "./components/ui/ThemeSelector";
import { Toaster } from "./components/ui/sonner";

export default function App() {
  useEffect(() => {
    console.log("window.electronAPI =", window.electronAPI);
  }, []);
  return (
    <div className="h-dvh w-full flex flex-col bg-background text-foreground p-4">
      <div className="flex-1 min-h-0">
        <AppTabs />
      </div>
      <ThemeSelector />
      <Toaster position="top-right" richColors />
    </div>
  );
}
