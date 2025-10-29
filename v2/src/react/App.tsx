"use client";

import React from "react";
import { AppTabs } from "./components/ui/AppTabs";
import { ThemeSelector } from "./components/ui/ThemeSelector";

export default function App() {
  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground p-4">
      <AppTabs />

      <ThemeSelector />
    </div>
  );
}
