import { AppTabs } from "./components/ui/AppTabs";
import { ThemeSelector } from "./components/ui/ThemeSelector";
import { FolderExplorer } from "./components/ui/FolderExplorer";
import { Toaster } from "./components/ui/sonner";

export default function App() {
  return (
    <div className="h-dvh w-full flex flex-col bg-background text-foreground p-4">
      <div className="flex-1 min-h-0">
        <AppTabs />
      </div>
      <FolderExplorer />
      <ThemeSelector />
      <Toaster position="top-right" richColors />
    </div>
  );
}
