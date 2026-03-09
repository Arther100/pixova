"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import en from "./en";
import ta from "./ta";
import hi from "./hi";
import ml from "./ml";
import type { TranslationKeys } from "./en";

export type Locale = "en" | "ta" | "hi" | "ml";

const translations: Record<Locale, TranslationKeys> = { en, ta, hi, ml };

export const LOCALE_NAMES: Record<Locale, string> = {
  en: "English",
  ta: "தமிழ்",
  hi: "हिन्दी",
  ml: "മലയാളം",
};

interface I18nContextValue {
  locale: Locale;
  t: TranslationKeys;
  setLocale: (locale: Locale) => void;
}

const I18nContext = createContext<I18nContextValue | undefined>(undefined);

const STORAGE_KEY = "pixova_locale";

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("en");
  const [mounted, setMounted] = useState(false);

  // Read saved locale on mount
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY) as Locale | null;
    if (saved && translations[saved]) {
      setLocaleState(saved);
    }
    setMounted(true);
  }, []);

  // Update <html lang="..."> and persist
  useEffect(() => {
    if (!mounted) return;
    document.documentElement.lang = locale;
    localStorage.setItem(STORAGE_KEY, locale);
  }, [locale, mounted]);

  const setLocale = useCallback((l: Locale) => {
    if (translations[l]) {
      setLocaleState(l);
    }
  }, []);

  const t = translations[locale];

  return (
    <I18nContext.Provider value={{ locale, t, setLocale }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error("useI18n must be used within an I18nProvider");
  }
  return context;
}

export type { TranslationKeys };
