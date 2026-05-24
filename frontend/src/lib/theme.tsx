import { createContext, useContext, useEffect, useState } from "react";

type Theme = "shad" | "glass" | "angular" | "almanac";
type ColorMode = "light" | "dark" | "system";

interface ThemeContextValue {
  theme: Theme;
  setTheme: (t: Theme) => void;
  colorMode: ColorMode;
  setColorMode: (m: ColorMode) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function resolveMode(mode: ColorMode): "light" | "dark" {
  if (mode === "system") {
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }
  return mode;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(
    () => (localStorage.getItem("sq-theme") as Theme | null) ?? "almanac"
  );
  const [colorMode, setColorModeState] = useState<ColorMode>(
    () => (localStorage.getItem("sq-color-mode") as ColorMode | null) ?? "light"
  );

  useEffect(() => {
    const html = document.documentElement;

    if (theme === "shad") {
      html.removeAttribute("data-theme");
    } else {
      html.setAttribute("data-theme", theme);
    }

    const applyMode = () => {
      if (resolveMode(colorMode) === "dark") {
        html.classList.add("dark");
      } else {
        html.classList.remove("dark");
      }
    };

    applyMode();

    if (colorMode !== "system") return;

    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    mq.addEventListener("change", applyMode);
    return () => mq.removeEventListener("change", applyMode);
  }, [theme, colorMode]);

  const setTheme = (t: Theme) => {
    localStorage.setItem("sq-theme", t);
    setThemeState(t);
  };

  const setColorMode = (m: ColorMode) => {
    localStorage.setItem("sq-color-mode", m);
    setColorModeState(m);
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, colorMode, setColorMode }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
