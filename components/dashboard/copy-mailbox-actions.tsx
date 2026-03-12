"use client";

import { Copy, KeyRound, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { useUiPreferences } from "@/components/providers/ui-preferences-provider";
import { Button } from "@/components/ui/button";
import { getClientPath } from "@/lib/client-base-path";

async function copyText(value: string) {
  await navigator.clipboard.writeText(value);
}

export function CopyMailboxAddressButton({
  address,
  title,
}: {
  address: string;
  title?: string;
}) {
  const [copied, setCopied] = useState(false);
  const { t } = useUiPreferences();

  return (
    <Button
      className="h-8 w-8 rounded-lg border border-slate-200 bg-white px-0 text-slate-500 hover:bg-slate-100"
      onClick={async () => {
        await copyText(address);
        setCopied(true);
        setTimeout(() => setCopied(false), 1200);
      }}
      type="button"
      variant="ghost"
    >
      <Copy className="h-4 w-4" />
      <span className="sr-only">{copied ? t.copied : title ?? t.copyAddress}</span>
    </Button>
  );
}

export function CopyMailboxSecretButton({
  mailboxId,
  kind,
}: {
  mailboxId: string;
  kind: "password" | "token";
}) {
  const [isPending, startTransition] = useTransition();
  const { t } = useUiPreferences();

  return (
    <Button
      className="h-8 rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-600 hover:bg-slate-100"
      onClick={() => {
        startTransition(async () => {
          const response = await fetch(getClientPath(`/api/mailboxes/${mailboxId}/secret/${kind}`));
          if (!response.ok) {
            return;
          }

          const data = (await response.json()) as { value: string };
          await copyText(data.value);
        });
      }}
      type="button"
      variant="ghost"
    >
      <KeyRound className="mr-2 h-3.5 w-3.5" />
      {isPending ? t.processing : kind === "password" ? t.copyPassword : t.copyToken}
    </Button>
  );
}

export function DeleteMailboxTopbarButton({
  mailboxId,
  address,
}: {
  mailboxId: string;
  address: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const { t } = useUiPreferences();

  return (
    <Button
      className="h-8 rounded-lg border border-red-200 bg-white px-3 text-xs font-medium text-red-600 hover:bg-red-50"
      onClick={() => {
        const confirmation = window.prompt(t.deleteMailboxPrompt, "");
        if (confirmation !== address) {
          return;
        }

        startTransition(async () => {
          const response = await fetch(getClientPath(`/api/mailboxes/${mailboxId}`), {
            method: "DELETE",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ confirmAddress: confirmation }),
          });

          if (!response.ok) {
            return;
          }

          router.push(getClientPath("/dashboard/mailboxes"));
          router.refresh();
        });
      }}
      type="button"
      variant="ghost"
    >
      <Trash2 className="mr-2 h-3.5 w-3.5" />
      {isPending ? t.deleting : t.deleteMailbox}
    </Button>
  );
}
