export const THEME_COOKIE = "duck_web_theme";
export const LOCALE_COOKIE = "duck_web_locale";

export type ThemeMode = "light" | "dark";
export type Locale = "zh-CN" | "en-US";

export function normalizeTheme(value: string | null | undefined): ThemeMode {
  return value === "dark" ? "dark" : "light";
}

export function normalizeLocale(value: string | null | undefined): Locale {
  return value === "en-US" ? "en-US" : "zh-CN";
}
