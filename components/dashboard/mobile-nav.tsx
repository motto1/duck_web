"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Inbox, MailPlus, RefreshCcw, Settings, UserPlus } from "lucide-react";

import { BrandMark } from "@/components/dashboard/brand-mark";
import { useUiPreferences } from "@/components/providers/ui-preferences-provider";
import { getClientPath } from "@/lib/client-base-path";

export function DashboardMobileNav({
  firstMailboxHref,
}: {
  firstMailboxHref: string;
}) {
  const router = useRouter();
  const { t } = useUiPreferences();

  return (
    <div className="border-b px-4 py-4 lg:hidden" style={{ borderColor: "var(--border)", backgroundColor: "var(--surface-muted)" }}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full shadow-sm">
            <BrandMark />
          </div>
          <div className="text-[18px] font-semibold tracking-[-0.02em]" style={{ color: "var(--text-strong)" }}>
            {t.appName}
          </div>
        </div>
        <Link
          className="flex h-10 w-10 items-center justify-center rounded-full text-slate-600 hover:bg-slate-200/70"
          href={getClientPath("/dashboard/settings")}
          title={t.settings}
        >
          <Settings className="h-4 w-4" />
        </Link>
      </div>
      <div className="mt-4 grid grid-cols-4 gap-2">
        <Link
          className="flex flex-col items-center gap-2 rounded-2xl px-2 py-3 text-xs font-medium text-slate-700"
          style={{ backgroundColor: "var(--surface)", color: "var(--text)" }}
          href={firstMailboxHref}
        >
          <Inbox className="h-4 w-4" />
          {t.managedMailboxes}
        </Link>
        <button
          className="flex flex-col items-center gap-2 rounded-2xl px-2 py-3 text-xs font-medium text-slate-700"
          style={{ backgroundColor: "var(--surface)", color: "var(--text)" }}
          onClick={() => router.refresh()}
          type="button"
        >
          <RefreshCcw className="h-4 w-4" />
          {t.refresh}
        </button>
        <Link
          className="flex flex-col items-center gap-2 rounded-2xl px-2 py-3 text-xs font-medium text-slate-700"
          style={{ backgroundColor: "var(--surface)", color: "var(--text)" }}
          href={getClientPath("/dashboard/mailboxes?action=register")}
        >
          <UserPlus className="h-4 w-4" />
          {t.registerMailbox}
        </Link>
        <Link
          className="flex flex-col items-center gap-2 rounded-2xl px-2 py-3 text-xs font-medium text-slate-700"
          style={{ backgroundColor: "var(--surface)", color: "var(--text)" }}
          href={getClientPath("/dashboard/mailboxes?action=join")}
        >
          <MailPlus className="h-4 w-4" />
          {t.joinMailbox}
        </Link>
      </div>
    </div>
  );
}
