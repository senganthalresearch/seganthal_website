"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { Monitor, Moon, Sun } from "lucide-react";

type Theme = "light" | "dark" | "system";
const ThemeContext = createContext<{ theme: Theme; setTheme: (value: Theme) => void }>({ theme: "system", setTheme: () => {} });

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, updateTheme] = useState<Theme>("system");
  useEffect(() => {
    try {
      const saved = localStorage.getItem("senganthal-theme");
      if (saved === "light" || saved === "dark" || saved === "system") updateTheme(saved);
    } catch {}
  }, []);
  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = () => { document.documentElement.dataset.theme = theme === "system" ? (media.matches ? "dark" : "light") : theme; };
    apply();
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, [theme]);
  function setTheme(value: Theme) {
    updateTheme(value);
    try { localStorage.setItem("senganthal-theme", value); } catch {}
  }
  return <ThemeContext.Provider value={{ theme, setTheme }}>{children}</ThemeContext.Provider>;
}

export function ThemeToggle() {
  const { theme, setTheme } = useContext(ThemeContext);
  return <div className="theme-control" role="group" aria-label="Color theme">
    {([{ value: "light", Icon: Sun }, { value: "dark", Icon: Moon }, { value: "system", Icon: Monitor }] as const).map(({ value, Icon }) =>
      <button key={value} type="button" title={value + " theme"} aria-label={value + " theme"} aria-pressed={theme === value} onClick={() => setTheme(value)}><Icon size={16} /></button>
    )}
  </div>;
}
