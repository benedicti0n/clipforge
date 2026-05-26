"use client";

import { FolderOpen } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "./button";
import { useEffect, useState } from "react";

interface AppFolder {
  name: string;
  path: string;
  description: string;
}

const APP_FOLDERS: AppFolder[] = [
  {
    name: "Whisper Models",
    path: "whisperModels",
    description: "Downloaded Whisper AI models",
  },
  {
    name: "Generated Clips",
    path: "generatedClips",
    description: "Video clips created by the app",
  },
];

export const FolderExplorer = () => {
  const [userDataPath, setUserDataPath] = useState<string | null>(null);

  useEffect(() => {
    if (window.electronAPI?.getUserDataPath) {
      window.electronAPI.getUserDataPath().then((path: string) => {
        setUserDataPath(path);
      });
    }
  }, []);

  const handleOpenFolder = async (folderPath: string) => {
    if (!userDataPath) return;
    const fullPath = `${userDataPath}/${folderPath}`;
    if (window.electronAPI?.openClipsFolder) {
      await window.electronAPI.openClipsFolder(fullPath);
    }
  };

  return (
    <div className="fixed bottom-5 right-20 z-50">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="icon"
            className="rounded-full shadow-md bg-background/80 backdrop-blur border hover:bg-accent transition"
            title="Open App Folders"
          >
            <FolderOpen className="w-5 h-5" />
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" side="top" className="w-64">
          <div className="px-2 py-1.5 text-sm font-semibold text-muted-foreground">
            App Folders
          </div>
          <DropdownMenuSeparator />
          {APP_FOLDERS.map((folder) => (
            <DropdownMenuItem
              key={folder.path}
              onClick={() => handleOpenFolder(folder.path)}
              className="flex flex-col items-start gap-1 cursor-pointer"
            >
              <span className="font-medium">{folder.name}</span>
              <span className="text-xs text-muted-foreground">
                {folder.description}
              </span>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};
