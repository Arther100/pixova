"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { type BrandColor, applyBrandColor } from "./colors";

type Theme = "light" | "dark";

interface ThemeContextValue {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
  brandColor: BrandColor;
  setBrandColor: (color: BrandColor) => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

const THEME_KEY = "pixova_theme";
const COLOR_KEY = "pixova_brand_color";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("light");
  const [brandColor, setBrandColorState] = useState<BrandColor>("pink");
  const [mounted, setMounted] = useState(false);

  // Read saved preferences on mount
  useEffect(() => {
    const savedTheme = localStorage.getItem(THEME_KEY) as Theme | null;
    if (savedTheme === "dark" || savedTheme === "light") {
      setThemeState(savedTheme);
    } else if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
      setThemeState("dark");
    }

    const savedColor = localStorage.getItem(COLOR_KEY) as BrandColor | null;
    if (savedColor) {
      setBrandColorState(savedColor);
      applyBrandColor(savedColor);
    }

    setMounted(true);
  }, []);

  // Apply dark/light class to <html>
  useEffect(() => {
    if (!mounted) return;
    const root = document.documentElement;
    root.classList.remove("light", "dark");
    root.classList.add(theme);
    localStorage.setItem(THEME_KEY, theme);
  }, [theme, mounted]);

  // Apply brand color CSS variables
  useEffect(() => {
    if (!mounted) return;
    applyBrandColor(brandColor);
    localStorage.setItem(COLOR_KEY, brandColor);
  }, [brandColor, mounted]);

  const setTheme = useCallback((t: Theme) => setThemeState(t), []);

  const toggleTheme = useCallback(
    () => setThemeState((prev) => (prev === "light" ? "dark" : "light")),
    []
  );

  const setBrandColor = useCallback(
    (color: BrandColor) => setBrandColorState(color),
    []
  );

  return (
    <ThemeContext.Provider
      value={{ theme, toggleTheme, setTheme, brandColor, setBrandColor }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
