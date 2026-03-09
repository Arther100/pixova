"use client";

import { ThemeProvider } from "@/lib/theme";
import { I18nProvider } from "@/lib/i18n";
import { SettingsToggle } from "@/components/SettingsToggle";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <I18nProvider>
        {children}
        <SettingsToggle />
      </I18nProvider>
    </ThemeProvider>
  );
}
