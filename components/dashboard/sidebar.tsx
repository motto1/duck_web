"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Inbox, LogIn, MailPlus, RefreshCcw, Settings, UserPlus } from "lucide-react";
import { useTransition } from "react";

import { BrandMark } from "@/components/dashboard/brand-mark";
import { useUiPreferences } from "@/components/providers/ui-preferences-provider";
import { getClientPath } from "@/lib/client-base-path";
import { cn } from "@/lib/utils";

export function DashboardSidebar({
  favoriteMailboxes,
  recentMailboxes,
}: {
  favoriteMailboxes: Array<{ id: string; address: string }>;
  recentMailboxes: Array<{ id: string; address: string }>;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const { t } = useUiPreferences();

  const primaryItems = [
    {
      href: "/dashboard/mailboxes",
      label: t.managedMailboxes,
      icon: Inbox,
    },
    {
      href: "/dashboard/settings",
      label: t.settings,
      icon: Settings,
    },
  ];

  const mailboxActions = [
    {
      id: "join",
      href: "/dashboard/mailboxes?action=join",
      label: t.joinMailbox,
      icon: MailPlus,
    },
    {
      id: "register",
      href: "/dashboard/mailboxes?action=register",
      label: t.registerMailbox,
      icon: UserPlus,
    },
    {
      id: "login",
      href: "/dashboard/mailboxes?action=login",
      label: t.loginMailbox,
      icon: LogIn,
    },
  ];

  const refreshCurrentMailbox = async () => {
    const match = pathname.match(/^\/dashboard\/mailboxes\/([^/]+)/);
    if (!match) {
      router.refresh();
      return;
    }

    startTransition(async () => {
      await fetch(getClientPath(`/api/mailboxes/${match[1]}/refresh`), {
        method: "POST",
      });
      router.refresh();
    });
  };

  return (
    <aside
      className="flex h-full flex-col border-r"
      style={{
        borderColor: "var(--border)",
        backgroundColor: "var(--surface-muted)",
      }}
    >
      <div className="flex h-20 items-center gap-4 border-b border-slate-200 px-6">
        <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full shadow-sm">
          <BrandMark />
        </div>
        <div className="text-[19px] font-semibold tracking-[-0.02em]" style={{ color: "var(--text-strong)" }}>
          {t.appName}
        </div>
      </div>

      <div className="flex-1 px-5 py-5">
        <nav className="space-y-3">
          {primaryItems.map((item) => {
            const Icon = item.icon;
            const active = pathname.startsWith(item.href);

            return (
              <Link
                className={cn(
                  "flex h-[56px] items-center gap-3 rounded-2xl px-4 text-[17px] font-medium transition",
                  active
                    ? "bg-[#dcd8ff] text-[#3867d6]"
                    : "text-slate-700 hover:bg-slate-200/70",
                )}
                href={getClientPath(item.href)}
                key={item.href}
              >
                <Icon className="h-5 w-5" />
                {item.label}
              </Link>
            );
          })}

          <button
            className="flex h-[56px] w-full items-center gap-3 rounded-2xl px-4 text-left text-[17px] font-medium text-slate-800 transition hover:bg-slate-200/70 disabled:opacity-60"
            disabled={isPending}
            onClick={refreshCurrentMailbox}
            type="button"
          >
            <RefreshCcw className={cn("h-5 w-5", isPending && "animate-spin")} />
            {t.refresh}
          </button>
        </nav>

        {favoriteMailboxes.length > 0 ? (
          <div className="mt-8">
            <div className="mb-3 px-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
              {t.favorites}
            </div>
            <div className="space-y-2">
              {favoriteMailboxes.map((mailbox) => {
                const active = pathname.startsWith(`/dashboard/mailboxes/${mailbox.id}`);

                return (
                  <Link
                    className={cn(
                      "block rounded-2xl px-4 py-3 text-[14px] font-medium transition",
                      active
                        ? "bg-white text-slate-900 shadow-sm"
                        : "text-slate-600 hover:bg-slate-200/70",
                    )}
                    href={getClientPath(`/dashboard/mailboxes/${mailbox.id}`)}
                    key={mailbox.id}
                  >
                    <span className="block truncate">{mailbox.address}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        ) : null}

        {recentMailboxes.length > 0 ? (
          <div className="mt-8">
            <div className="mb-3 px-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
              {t.recentVisits}
            </div>
            <div className="space-y-2">
              {recentMailboxes.map((mailbox) => {
                const active = pathname.startsWith(`/dashboard/mailboxes/${mailbox.id}`);

                return (
                  <Link
                    className={cn(
                      "block rounded-2xl px-4 py-3 text-[14px] font-medium transition",
                      active
                        ? "bg-white text-slate-900 shadow-sm"
                        : "text-slate-600 hover:bg-slate-200/70",
                    )}
                    href={getClientPath(`/dashboard/mailboxes/${mailbox.id}`)}
                    key={mailbox.id}
                  >
                    <span className="block truncate">{mailbox.address}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        ) : null}
      </div>

      <div className="border-t border-slate-200 px-5 py-5">
        <div className="space-y-3">
          {mailboxActions.map((item) => {
            const Icon = item.icon;
            const active =
              pathname === "/dashboard/mailboxes" && searchParams.get("action") === item.id;

            return (
              <Link
                className={cn(
                  "flex h-[52px] items-center gap-3 rounded-2xl px-4 text-[16px] font-medium transition",
                  active
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-700 hover:bg-slate-200/70",
                )}
                href={getClientPath(item.href)}
                key={item.id}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </div>
      </div>
    </aside>
  );
}
