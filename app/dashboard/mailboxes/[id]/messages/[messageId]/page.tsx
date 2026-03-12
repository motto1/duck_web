import Link from "next/link";
import { notFound } from "next/navigation";

import { FlashMessage } from "@/components/flash-message";
import { SubmitButton } from "@/components/forms/submit-button";
import { MultiExpandPanels } from "@/components/ui/accordion-panels";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { deleteMessageAction } from "@/app/actions";
import { mailboxSyncService } from "@/lib/services/mailbox-sync-service";
import { prisma } from "@/lib/prisma";
import { getRequestBasePath } from "@/lib/request-base-path";
import { getServerDictionary } from "@/lib/server-i18n";
import { formatDateTime, withBasePath } from "@/lib/utils";

export default async function MessageDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string; messageId: string }>;
  searchParams: Promise<{ success?: string; error?: string }>;
}) {
  const [{ id, messageId }, query, t] = await Promise.all([
    params,
    searchParams,
    getServerDictionary(),
  ]);
  const basePath = await getRequestBasePath();
  const mailbox = await prisma.mailbox.findUnique({
    where: { id },
  });

  if (!mailbox) {
    notFound();
  }

  let message = await mailboxSyncService.hydrateMessage(id, messageId);

  if (!message.seen) {
    try {
      await mailboxSyncService.markMessageSeen(id, messageId);
      message = {
        ...message,
        seen: true,
      };
    } catch {
      // Keep page rendering even if remote read-state sync fails.
    }
  }

  return (
    <section className="space-y-6 px-5 pb-8 pt-4 sm:px-7">
      <FlashMessage success={query.success} error={query.error} />

      <div className="flex flex-wrap items-center gap-3 text-sm text-slate-500">
        <Link className="text-blue-700 hover:text-blue-600" href={withBasePath(`/dashboard/mailboxes/${id}`, basePath)}>
          {t.backToMailbox}
        </Link>
        <Badge variant={message.seen ? "muted" : "success"}>
          {message.seen ? t.read : t.unread}
        </Badge>
        <form action={deleteMessageAction}>
          <input name="mailboxId" type="hidden" value={id} />
          <input name="messageId" type="hidden" value={messageId} />
          <SubmitButton pendingText={t.deleting} size="sm" variant="ghost">
            {t.deleteMessage}
          </SubmitButton>
        </form>
      </div>

      <Card className="overflow-hidden rounded-[24px]">
        <div className="grid gap-8 xl:grid-cols-[340px_minmax(0,1fr)]">
          <div className="space-y-6 border-b border-slate-200/80 pb-6 xl:border-b-0 xl:border-r xl:pb-0 xl:pr-8">
            <div className="space-y-1">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                {t.sender}
              </div>
              <div className="text-sm font-medium text-slate-900">
                {message.fromName || t.unknownSender}{" "}
                {message.fromAddress ? `<${message.fromAddress}>` : ""}
              </div>
            </div>

            <div className="space-y-1">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                {t.time}
              </div>
              <div className="text-sm text-slate-700">{formatDateTime(message.remoteCreatedAt)}</div>
            </div>

            <div className="space-y-1">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                {t.size}
              </div>
              <div className="text-sm text-slate-700">{message.size} bytes</div>
            </div>

            <div className="space-y-3">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                {t.attachments}
              </div>
              {message.attachments.length === 0 ? (
                <div className="text-sm text-slate-500">{t.noAttachments}</div>
              ) : (
                message.attachments.map((attachment) => (
                  <a
                    className="block rounded-2xl border border-slate-200 bg-white/70 px-4 py-3 text-sm text-blue-700 hover:text-blue-600"
                    href={withBasePath(`/api/attachments/${attachment.id}`, basePath)}
                    key={attachment.id}
                  >
                    {attachment.filename} · {attachment.size} bytes
                  </a>
                ))
              )}
            </div>
          </div>

          <div className="min-w-0 space-y-4">
            {message.htmlBodies.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 p-6 text-sm text-slate-500">
                {t.noHtmlBody}
              </div>
            ) : (
              message.htmlBodies.map((html, index) => (
                <div
                  className="rounded-2xl border border-slate-200 bg-white p-5"
                  dangerouslySetInnerHTML={{ __html: html }}
                  key={`${message.id}-${index}`}
                />
              ))
            )}
          </div>
        </div>
      </Card>

      <Card>
        <MultiExpandPanels
          defaultOpenIds={[]}
          items={[
            {
              id: "text",
              label: t.plainTextBody,
              description: t.plainTextBodyDescription,
              content: (
                <div className="rounded-2xl border border-slate-200 bg-white/80 p-5 text-sm leading-7 text-slate-700">
                  {message.textBody || t.noPlainTextBody}
                </div>
              ),
            },
            {
              id: "source",
              label: t.rawSource,
              description: t.rawSourceDescription,
              content: (
                <pre className="max-h-[480px] overflow-auto rounded-2xl bg-slate-950 p-4 font-mono text-xs text-slate-100">
                  {message.rawSourceData ?? t.noSourceCache}
                </pre>
              ),
            },
          ]}
        />
      </Card>
    </section>
  );
}
