import { notFound } from "next/navigation";

import { MailboxAddressPill, MailboxContextActions } from "@/components/dashboard/mailbox-context-bar";
import { DashboardTopbar } from "@/components/dashboard/topbar";
import { getRequestBasePath } from "@/lib/request-base-path";
import { prisma } from "@/lib/prisma";
import { withBasePath } from "@/lib/utils";

export default async function MailboxContextLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const basePath = await getRequestBasePath();
  await prisma.mailbox.updateMany({
    where: { id },
    data: {
      lastViewedAt: new Date(),
    },
  });
  const mailbox = await prisma.mailbox.findUnique({
    where: { id },
    select: {
      id: true,
      address: true,
      isFavorite: true,
    },
  });

  if (!mailbox) {
    notFound();
  }

  return (
    <main className="min-h-screen" style={{ backgroundColor: "var(--bg)" }}>
      <DashboardTopbar
        actionSlot={
          <MailboxContextActions
            address={mailbox.address}
            isFavorite={mailbox.isFavorite}
            mailboxId={mailbox.id}
            redirectTo={withBasePath(`/dashboard/mailboxes/${mailbox.id}`, basePath)}
          />
        }
        leftSlot={<MailboxAddressPill address={mailbox.address} />}
      />
      {children}
    </main>
  );
}
