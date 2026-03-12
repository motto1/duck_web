import { getDictionary } from "@/lib/i18n";
import { getServerUiPreferences } from "@/lib/server-ui-preferences";

export async function getServerDictionary() {
  const { locale } = await getServerUiPreferences();
  return getDictionary(locale);
}
