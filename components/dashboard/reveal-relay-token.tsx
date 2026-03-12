"use client";

import { useState, useTransition } from "react";
import { Eye, EyeOff } from "lucide-react";

import { useUiPreferences } from "@/components/providers/ui-preferences-provider";
import { Button } from "@/components/ui/button";
import { getClientPath } from "@/lib/client-base-path";

export function RevealRelayToken({ relayClientId }: { relayClientId: string }) {
  const [value, setValue] = useState<string | null>(null);
  const [isVisible, setVisible] = useState(false);
  const [isPending, startTransition] = useTransition();
  const { t } = useUiPreferences();

  const fetchToken = () => {
    if (value) {
      setVisible((current) => !current);
      return;
    }

    startTransition(async () => {
      const response = await fetch(getClientPath(`/api/relay-clients/${relayClientId}/token`));
      if (!response.ok) {
        return;
      }

      const data = (await response.json()) as { value: string };
      setValue(data.value);
      setVisible(true);
    });
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white/70 p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-sm font-medium text-slate-700">{t.relayToken}</div>
          <div className="mt-1 break-all text-sm text-slate-500">
            {isVisible && value ? value : "••••••••••••"}
          </div>
        </div>
        <Button onClick={fetchToken} size="sm" variant="outline">
          {isVisible ? <EyeOff className="mr-2 h-4 w-4" /> : <Eye className="mr-2 h-4 w-4" />}
          {isPending ? t.loading : isVisible ? t.hide : t.reveal}
        </Button>
      </div>
    </div>
  );
}
