import type { Metadata } from "next";

import "@/app/globals.css";
import { getRequestBasePath } from "@/lib/request-base-path";
import { getServerUiPreferences } from "@/lib/server-ui-preferences";
import { UiPreferencesProvider } from "@/components/providers/ui-preferences-provider";

export const metadata: Metadata = {
  title: "duck_web",
  description: "DuckMail 托管邮箱控制台",
  icons: {
    icon: "/brand-icon.png",
    shortcut: "/brand-icon.png",
    apple: "/brand-icon.png",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [basePath, preferences] = await Promise.all([
    getRequestBasePath(),
    getServerUiPreferences(),
  ]);

  return (
    <html data-theme={preferences.theme} lang={preferences.locale} suppressHydrationWarning>
      <body data-base-path={basePath}>
        <UiPreferencesProvider
          initialLocale={preferences.locale}
          initialTheme={preferences.theme}
        >
          {children}
        </UiPreferencesProvider>
      </body>
    </html>
  );
}
