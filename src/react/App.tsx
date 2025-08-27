import { Button } from "./components/ui/button"
import Counter from "./components/ui/Counter"
import { useThemeStore } from "./store/themeStore";
import { useEffect } from "react";

function App() {
  const { theme, toggleTheme } = useThemeStore();

  useEffect(() => {
    document.documentElement.className = theme;
  }, [theme]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div>hi</div>
      <Button onClick={toggleTheme}>Toggle Theme ({theme})</Button>
      <Counter />
    </div>
  )
}

export default App
