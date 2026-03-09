"use client";

import { useTheme } from "@/lib/theme";
import { useI18n, LOCALE_NAMES, type Locale } from "@/lib/i18n";
import { BRAND_COLORS, BRAND_COLOR_KEYS } from "@/lib/colors";
import { useState, useRef, useEffect } from "react";
import { usePathname } from "next/navigation";

// Pages that use the photographer layout (which has its own settings in profile dropdown)
const PHOTOGRAPHER_ROUTES = ["/dashboard", "/bookings", "/galleries", "/clients", "/payments", "/settings"];

/** Floating settings button — theme toggle + language picker + color picker.
 *  Hidden on photographer pages where the layout header has its own profile menu. */
export function SettingsToggle() {
  const { theme, toggleTheme, brandColor, setBrandColor } = useTheme();
  const { locale, t, setLocale } = useI18n();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  // Hide on photographer pages (layout has its own dropdown)
  const isPhotographerPage = PHOTOGRAPHER_ROUTES.some((r) => pathname.startsWith(r));

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (isPhotographerPage) return null;

  const locales: Locale[] = ["en", "ta", "hi", "ml"];

  return (
    <div ref={menuRef} className="fixed top-3 right-3 z-50">
      {/* Toggle Button */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-gray-100 transition-colors dark:hover:bg-gray-800"
        aria-label="Settings"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-gray-500 dark:text-gray-400"
        >
          <circle cx="12" cy="12" r="1" />
          <circle cx="12" cy="5" r="1" />
          <circle cx="12" cy="19" r="1" />
        </svg>
      </button>

      {/* Dropdown Menu */}
      {open && (
        <div className="absolute top-11 right-0 w-56 rounded-xl bg-white border border-gray-200 shadow-xl overflow-hidden dark:bg-gray-800 dark:border-gray-700">
          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="flex w-full items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-700"
          >
            {theme === "light" ? (
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="4" />
                <path d="M12 2v2" /><path d="M12 20v2" />
                <path d="m4.93 4.93 1.41 1.41" /><path d="m17.66 17.66 1.41 1.41" />
                <path d="M2 12h2" /><path d="M20 12h2" />
                <path d="m6.34 17.66-1.41 1.41" /><path d="m19.07 4.93-1.41 1.41" />
              </svg>
            )}
            <span>{theme === "light" ? t.theme.dark : t.theme.light}</span>
          </button>

          {/* Divider */}
          <div className="border-t border-gray-100 dark:border-gray-700" />

          {/* Color Picker */}
          <div className="px-4 pt-2.5 pb-1">
            <p className="text-[11px] font-medium uppercase tracking-wider text-gray-400 dark:text-gray-500">
              Color
            </p>
          </div>
          <div className="grid grid-cols-5 gap-2 px-4 pb-3">
            {BRAND_COLOR_KEYS.map((c) => (
              <button
                key={c}
                onClick={() => setBrandColor(c)}
                title={BRAND_COLORS[c].label}
                className={`flex h-8 w-8 items-center justify-center rounded-full transition-all ${
                  brandColor === c
                    ? "ring-2 ring-offset-2 ring-gray-400 dark:ring-gray-500 dark:ring-offset-gray-800 scale-110"
                    : "hover:scale-110"
                }`}
                style={{ backgroundColor: BRAND_COLORS[c].swatch }}
              >
                {brandColor === c && (
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 6 9 17l-5-5" />
                  </svg>
                )}
              </button>
            ))}
          </div>

          {/* Divider */}
          <div className="border-t border-gray-100 dark:border-gray-700" />

          {/* Language Label */}
          <div className="px-4 pt-2 pb-1">
            <p className="text-[11px] font-medium uppercase tracking-wider text-gray-400 dark:text-gray-500">
              {t.language.label}
            </p>
          </div>

          {/* Language Options */}
          {locales.map((l) => (
            <button
              key={l}
              onClick={() => {
                setLocale(l);
                setOpen(false);
              }}
              className={`flex w-full items-center gap-3 px-4 py-2 text-sm transition-colors ${
                locale === l
                  ? "bg-brand-50 text-brand-700 font-medium dark:bg-brand-900/20 dark:text-brand-400"
                  : "text-gray-600 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700"
              }`}
            >
              <span className="w-4 text-center">
                {locale === l ? "✓" : ""}
              </span>
              {LOCALE_NAMES[l]}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
