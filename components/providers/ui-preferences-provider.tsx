"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { getDictionary } from "@/lib/i18n";
import {
  LOCALE_COOKIE,
  THEME_COOKIE,
  normalizeLocale,
  normalizeTheme,
  type Locale,
  type ThemeMode,
} from "@/lib/ui-preferences";

type UiPreferencesContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;
  t: ReturnType<typeof getDictionary>;
};

const UiPreferencesContext = createContext<UiPreferencesContextValue | null>(null);

function persistPreference(key: string, value: string) {
  localStorage.setItem(key, value);
  document.cookie = `${key}=${encodeURIComponent(value)}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`;
}

export function UiPreferencesProvider({
  initialLocale,
  initialTheme,
  children,
}: {
  initialLocale: Locale;
  initialTheme: ThemeMode;
  children: ReactNode;
}) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale);
  const [theme, setThemeState] = useState<ThemeMode>(initialTheme);

  useEffect(() => {
    const storedLocale = normalizeLocale(localStorage.getItem(LOCALE_COOKIE));
    const storedTheme = normalizeTheme(localStorage.getItem(THEME_COOKIE));

    if (storedLocale !== locale) {
      setLocaleState(storedLocale);
    }

    if (storedTheme !== theme) {
      setThemeState(storedTheme);
    }
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dataset.theme = theme;
    persistPreference(LOCALE_COOKIE, locale);
    persistPreference(THEME_COOKIE, theme);
  }, [locale, theme]);

  const value = useMemo(
    () => ({
      locale,
      setLocale: setLocaleState,
      theme,
      setTheme: setThemeState,
      t: getDictionary(locale),
    }),
    [locale, theme],
  );

  return <UiPreferencesContext.Provider value={value}>{children}</UiPreferencesContext.Provider>;
}

export function useUiPreferences() {
  const context = useContext(UiPreferencesContext);

  if (!context) {
    throw new Error("useUiPreferences must be used within UiPreferencesProvider");
  }

  return context;
}
