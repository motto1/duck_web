import { cookies } from "next/headers";

import {
  LOCALE_COOKIE,
  THEME_COOKIE,
  normalizeLocale,
  normalizeTheme,
} from "@/lib/ui-preferences";

export async function getServerUiPreferences() {
  const store = await cookies();

  return {
    theme: normalizeTheme(store.get(THEME_COOKIE)?.value),
    locale: normalizeLocale(store.get(LOCALE_COOKIE)?.value),
  };
}
