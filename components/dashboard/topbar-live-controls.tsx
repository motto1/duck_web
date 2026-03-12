"use client";

import { Languages, Moon, SignalHigh, SunMedium } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { getClientPath } from "@/lib/client-base-path";
import { formatText } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { useUiPreferences } from "@/components/providers/ui-preferences-provider";

type LatencyPayload = {
  status: "ok" | "degraded" | "offline";
  latencyMs: number | null;
  checkedAt: string;
};

export function TopbarLiveControls() {
  const router = useRouter();
  const [isRefreshingLocale, startLocaleTransition] = useTransition();
  const { locale, setLocale, theme, setTheme, t } = useUiPreferences();
  const [latency, setLatency] = useState<LatencyPayload | null>(null);

  useEffect(() => {
    let isCancelled = false;

    const refreshLatency = async () => {
      try {
        const response = await fetch(getClientPath("/api/system/duckmail-latency"), {
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error("Failed");
        }

        const data = (await response.json()) as LatencyPayload;
        if (!isCancelled) {
          setLatency(data);
        }
      } catch {
        if (!isCancelled) {
          setLatency({
            status: "offline",
            latencyMs: null,
            checkedAt: new Date().toISOString(),
          });
        }
      }
    };

    void refreshLatency();
    const timer = window.setInterval(() => {
      void refreshLatency();
    }, 30_000);

    return () => {
      isCancelled = true;
      window.clearInterval(timer);
    };
  }, []);

  const latencyTitle = useMemo(() => {
    if (!latency) {
      return t.latencyChecking;
    }

    if (latency.status === "offline" || latency.latencyMs == null) {
      return t.latencyOffline;
    }

    if (latency.status === "degraded") {
      return formatText(t.latencyDegraded, { latency: latency.latencyMs });
    }

    return formatText(t.latencyOk, { latency: latency.latencyMs });
  }, [latency, t]);

  const latencyColor =
    latency?.status === "offline"
      ? "text-red-500"
      : latency?.status === "degraded"
        ? "text-amber-500"
        : "text-emerald-500";

  return (
    <>
      <Button
        className="flex h-9 w-9 items-center justify-center rounded-full px-0"
        title={latencyTitle}
        type="button"
        variant="ghost"
      >
        <SignalHigh className={cn("h-4 w-4", latencyColor)} />
      </Button>
      <Button
        className="flex h-9 w-9 items-center justify-center rounded-full px-0"
        onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        title={theme === "dark" ? t.lightMode : t.darkMode}
        type="button"
        variant="ghost"
      >
        {theme === "dark" ? <SunMedium className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      </Button>
      <Button
        className="flex h-9 w-9 items-center justify-center rounded-full px-0"
        disabled={isRefreshingLocale}
        onClick={() => {
          const nextLocale = locale === "zh-CN" ? "en-US" : "zh-CN";
          setLocale(nextLocale);
          startLocaleTransition(() => {
            router.refresh();
          });
        }}
        title={locale === "zh-CN" ? t.switchToEnglish : t.switchToChinese}
        type="button"
        variant="ghost"
      >
        <Languages className="h-4 w-4" />
      </Button>
    </>
  );
}
