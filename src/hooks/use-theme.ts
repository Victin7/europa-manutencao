import { useEffect } from "react";
import { usePreferences } from "@/hooks/use-preferences";

export function useTheme() {
  const { prefs, setPref } = usePreferences();
  const theme = prefs.tema;

  useEffect(() => {
    if (typeof document === "undefined") return;
    const root = document.documentElement;
    if (theme === "dark") root.classList.add("dark");
    else root.classList.remove("dark");
  }, [theme]);

  return {
    theme,
    toggle: () => setPref("tema", theme === "dark" ? "light" : "dark"),
  };
}
