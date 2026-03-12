"use client";

import { Star } from "lucide-react";

import { toggleFavoriteMailboxAction } from "@/app/actions";
import { useUiPreferences } from "@/components/providers/ui-preferences-provider";
import { SubmitButton } from "@/components/forms/submit-button";
import { CopyMailboxAddressButton, CopyMailboxSecretButton, DeleteMailboxTopbarButton } from "@/components/dashboard/copy-mailbox-actions";

export function MailboxAddressPill({
  address,
}: {
  address: string;
}) {
  const { t } = useUiPreferences();

  return (
    <div className="flex min-w-0 items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-[14px] font-semibold text-slate-700 shadow-sm">
      <span className="truncate">{address}</span>
      <CopyMailboxAddressButton address={address} title={t.copyAddress} />
    </div>
  );
}

export function MailboxContextActions({
  mailboxId,
  address,
  isFavorite,
  redirectTo,
}: {
  mailboxId: string;
  address: string;
  isFavorite: boolean;
  redirectTo: string;
}) {
  const { t } = useUiPreferences();

  return (
    <div className="hidden items-center gap-2 lg:flex">
      <form action={toggleFavoriteMailboxAction}>
        <input name="id" type="hidden" value={mailboxId} />
        <input name="redirectTo" type="hidden" value={redirectTo} />
        <SubmitButton className="h-8 rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-600 hover:bg-slate-100" pendingText={t.processing} variant="ghost">
          <Star className="mr-2 h-3.5 w-3.5" />
          {isFavorite ? t.unfavoriteMailbox : t.favoriteMailbox}
        </SubmitButton>
      </form>
      <CopyMailboxSecretButton kind="password" mailboxId={mailboxId} />
      <CopyMailboxSecretButton kind="token" mailboxId={mailboxId} />
      <DeleteMailboxTopbarButton address={address} mailboxId={mailboxId} />
    </div>
  );
}
