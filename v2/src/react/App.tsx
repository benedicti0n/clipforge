// src/react/App.tsx
"use client";

import React from "react";
import { ThemeSelector } from "./components/ui/ThemeSelector";

export default function App() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
      <ThemeSelector />
    </div>
  );
}
