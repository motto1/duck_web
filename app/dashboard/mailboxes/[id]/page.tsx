import { notFound } from "next/navigation";
import Link from "next/link";

import { FlashMessage } from "@/components/flash-message";
import { Badge } from "@/components/ui/badge";
import { InboxEmptyState } from "@/components/dashboard/inbox-empty-state";
import { getServerDictionary } from "@/lib/server-i18n";
import { prisma } from "@/lib/prisma";
import { getRequestBasePath } from "@/lib/request-base-path";
import { formatDateTime, withBasePath } from "@/lib/utils";

const MAILBOX_MESSAGE_PAGE_SIZE = 30;

function normalizeMessagePage(value: string | undefined) {
  const page = Number(value ?? "1");
  return Number.isFinite(page) && page > 0 ? Math.floor(page) : 1;
}

function createMessageListHref(basePath: string, mailboxId: string, messagePage: number) {
  const searchParams = new URLSearchParams();
  if (messagePage > 1) {
    searchParams.set("messagePage", String(messagePage));
  }

  const query = searchParams.toString();
  return withBasePath(
    `/dashboard/mailboxes/${mailboxId}${query ? `?${query}` : ""}`,
    basePath,
  );
}

export default async function MailboxDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ success?: string; error?: string; messagePage?: string }>;
}) {
  const [{ id }, query, t] = await Promise.all([params, searchParams, getServerDictionary()]);
  const basePath = await getRequestBasePath();
  const currentMessagePage = normalizeMessagePage(query.messagePage);
  const mailbox = await prisma.mailbox.findUnique({
    where: { id },
    include: {
      secrets: true,
    },
  });

  if (!mailbox) {
    notFound();
  }

  const [totalMessages, detailMessages] = await Promise.all([
    prisma.message.count({
      where: {
        mailboxId: id,
        isDeleted: false,
      },
    }),
    prisma.message.findMany({
      where: {
        mailboxId: id,
        isDeleted: false,
      },
      orderBy: {
        remoteCreatedAt: "desc",
      },
      skip: (currentMessagePage - 1) * MAILBOX_MESSAGE_PAGE_SIZE,
      take: MAILBOX_MESSAGE_PAGE_SIZE,
    }),
  ]);
  const totalPages = Math.max(1, Math.ceil(totalMessages / MAILBOX_MESSAGE_PAGE_SIZE));
  const previousHref =
    currentMessagePage > 1
      ? createMessageListHref(basePath, mailbox.id, currentMessagePage - 1)
      : null;
  const nextHref =
    currentMessagePage < totalPages
      ? createMessageListHref(basePath, mailbox.id, currentMessagePage + 1)
      : null;

  return (
    <section className="px-5 pb-8 pt-4 sm:px-7">
      <FlashMessage success={query.success} error={query.error} />

      <div className="border-b border-slate-200 px-2 pb-5 pt-2">
        <h1 className="text-[26px] font-semibold tracking-[-0.02em] text-slate-800">{t.inbox}</h1>
      </div>

      {detailMessages.length === 0 ? (
        <InboxEmptyState />
      ) : (
        <div className="mt-6 space-y-3">
          {detailMessages.map((message) => (
            <Link
              className="block rounded-[22px] border border-slate-200 bg-white px-5 py-4 shadow-sm transition hover:border-[#dcd8ff] hover:bg-[#faf9ff]"
              href={withBasePath(`/dashboard/mailboxes/${mailbox.id}/messages/${message.messageId}`, basePath)}
              key={message.id}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-3">
                    <span className="truncate text-[15px] font-semibold text-slate-800">
                      {message.fromName || message.fromAddress || t.unknownSender}
                    </span>
                    <Badge variant={message.seen ? "muted" : "success"}>
                      {message.seen ? t.read : t.unread}
                    </Badge>
                  </div>
                  <div className="mt-2 truncate text-[16px] font-medium text-slate-700">
                    {message.subject || t.noSubject}
                  </div>
                </div>
                <div className="shrink-0 text-sm text-slate-400">
                  {formatDateTime(message.remoteCreatedAt)}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {detailMessages.length > 0 ? (
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          <div className="text-sm text-slate-500">
            当前显示 {(currentMessagePage - 1) * MAILBOX_MESSAGE_PAGE_SIZE + 1}
            {" - "}
            {Math.min(currentMessagePage * MAILBOX_MESSAGE_PAGE_SIZE, totalMessages)} / {totalMessages}
          </div>
          <div className="flex items-center gap-2">
            {previousHref ? (
              <Link
                className="inline-flex h-10 items-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 hover:bg-slate-50"
                href={previousHref}
              >
                {t.previousPage}
              </Link>
            ) : (
              <span className="inline-flex h-10 items-center rounded-xl border border-slate-200 bg-slate-100 px-4 text-sm font-medium text-slate-400">
                {t.previousPage}
              </span>
            )}
            {nextHref ? (
              <Link
                className="inline-flex h-10 items-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 hover:bg-slate-50"
                href={nextHref}
              >
                {t.nextPage}
              </Link>
            ) : (
              <span className="inline-flex h-10 items-center rounded-xl border border-slate-200 bg-slate-100 px-4 text-sm font-medium text-slate-400">
                {t.nextPage}
              </span>
            )}
          </div>
        </div>
      ) : null}
    </section>
  );
}
