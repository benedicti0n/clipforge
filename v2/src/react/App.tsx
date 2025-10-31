// src/react/App.tsx
"use client";
import React from "react";
import { AppTabs } from "./components/ui/AppTabs";
import { ThemeSelector } from "./components/ui/ThemeSelector";

export default function App() {
  return (
    <div className="h-dvh w-full flex flex-col bg-background text-foreground p-4">
      <div className="flex-1 min-h-0">
        <AppTabs />
      </div>
      <ThemeSelector />
    </div>
  );
}
