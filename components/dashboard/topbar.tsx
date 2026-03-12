import type { ReactNode } from "react";
import Link from "next/link";
import {
  LogOut,
  Settings,
} from "lucide-react";

import { logoutAction } from "@/app/actions";
import { TopbarLiveControls } from "@/components/dashboard/topbar-live-controls";
import { SubmitButton } from "@/components/forms/submit-button";
import { getAdminSession } from "@/lib/auth";
import { getRequestBasePath } from "@/lib/request-base-path";
import { getServerDictionary } from "@/lib/server-i18n";
import { cn, withBasePath } from "@/lib/utils";

export async function DashboardTopbar({
  leftSlot,
  actionSlot,
  className,
}: {
  leftSlot?: ReactNode;
  actionSlot?: ReactNode;
  className?: string;
}) {
  const [session, basePath, t] = await Promise.all([
    getAdminSession(),
    getRequestBasePath(),
    getServerDictionary(),
  ]);
  const initials = (session?.username?.slice(0, 2) ?? "DM").toUpperCase();

  return (
    <header
      className={cn(
        "flex min-h-[80px] items-center justify-between gap-4 border-b px-7",
        className,
      )}
      style={{
        borderColor: "var(--border)",
        backgroundColor: "var(--bg)",
      }}
    >
      <div className="min-w-0 flex-1">{leftSlot}</div>

      {actionSlot ? <div className="hidden items-center gap-2 lg:flex">{actionSlot}</div> : null}

      <div className="flex items-center gap-2 text-slate-500">
        <TopbarLiveControls />
        <Link
          className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-slate-200/80"
          href={withBasePath("/dashboard/settings", basePath)}
          title={t.settings}
        >
          <Settings className="h-4 w-4" />
        </Link>
        <div className="ml-1 flex h-10 w-10 items-center justify-center rounded-full bg-[#e4a63f] text-sm font-semibold text-slate-900">
          {initials}
        </div>
        <form action={logoutAction}>
          <SubmitButton className="h-9 w-9 rounded-full px-0" pendingText="" variant="ghost">
            <LogOut className="h-4 w-4" />
          </SubmitButton>
        </form>
      </div>
    </header>
  );
}
