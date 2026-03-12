import { DashboardMobileNav } from "@/components/dashboard/mobile-nav";
import { DashboardSidebar } from "@/components/dashboard/sidebar";
import { requireAdminSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getRequestBasePath } from "@/lib/request-base-path";
import { withBasePath } from "@/lib/utils";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAdminSession();
  const basePath = await getRequestBasePath();
  const [favoriteMailboxCandidates, recentMailboxCandidates] = await Promise.all([
    prisma.mailbox.findMany({
      where: {
        status: {
          not: "REMOTE_DELETED",
        },
        isFavorite: true,
      },
      orderBy: { updatedAt: "desc" },
      take: 24,
      select: {
        id: true,
        address: true,
        lastViewedAt: true,
        updatedAt: true,
      },
    }),
    prisma.mailbox.findMany({
      where: {
        status: {
          not: "REMOTE_DELETED",
        },
      },
      orderBy: { updatedAt: "desc" },
      take: 48,
      select: {
        id: true,
        address: true,
        lastViewedAt: true,
        updatedAt: true,
      },
    }),
  ]);

  const sortByRecentActivity = <
    T extends { lastViewedAt: Date | null; updatedAt: Date },
  >(
    items: T[],
  ) =>
    [...items].sort((left, right) => {
      const leftTimestamp = left.lastViewedAt?.getTime() ?? 0;
      const rightTimestamp = right.lastViewedAt?.getTime() ?? 0;

      if (rightTimestamp !== leftTimestamp) {
        return rightTimestamp - leftTimestamp;
      }

      return right.updatedAt.getTime() - left.updatedAt.getTime();
    });

  const favoriteMailboxes = sortByRecentActivity(favoriteMailboxCandidates)
    .slice(0, 8)
    .map(({ id, address }) => ({ id, address }));
  const recentMailboxes = sortByRecentActivity(recentMailboxCandidates)
    .slice(0, 16)
    .map(({ id, address }) => ({ id, address }));

  const recentMailboxItems = recentMailboxes.filter(
    (mailbox) => !favoriteMailboxes.some((favorite) => favorite.id === mailbox.id),
  );
  const firstMailbox = favoriteMailboxes[0] ?? recentMailboxes[0] ?? null;

  return (
    <div className="min-h-screen" style={{ backgroundColor: "var(--bg)" }}>
      <DashboardMobileNav
        firstMailboxHref={
          firstMailbox
            ? withBasePath(`/dashboard/mailboxes/${firstMailbox.id}`, basePath)
            : withBasePath("/dashboard/mailboxes", basePath)
        }
      />
      <div className="grid min-h-screen grid-cols-1 lg:grid-cols-[310px_minmax(0,1fr)]">
        <div className="hidden min-h-screen lg:block">
          <DashboardSidebar favoriteMailboxes={favoriteMailboxes} recentMailboxes={recentMailboxItems} />
        </div>
        <div className="min-w-0" style={{ backgroundColor: "var(--bg)" }}>{children}</div>
      </div>
    </div>
  );
}
