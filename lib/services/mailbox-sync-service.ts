import { MailboxStatus, type SyncTargetType } from "@prisma/client";

import { DuckMailApiError, DuckMailClient } from "@/lib/duckmail/client";
import type {
  DuckMailMessageDetail,
  DuckMailMessageSummary,
  DuckMailSource,
} from "@/lib/duckmail/types";
import { prisma } from "@/lib/prisma";
import { createSyncLog } from "@/lib/services/logging-service";
import { secretsService } from "@/lib/services/secrets-service";
import type { SyncResult } from "@/lib/types";

function parseJsonArray(value: string | null | undefined) {
  if (!value) {
    return [];
  }

  try {
    return JSON.parse(value) as string[];
  } catch {
    return [];
  }
}

function stringifyRecipients(
  recipients: { name: string; address: string }[] | undefined,
) {
  return JSON.stringify(recipients ?? []);
}

function chunkItems<T>(items: T[], size: number) {
  const chunks: T[][] = [];

  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }

  return chunks;
}

async function getMailboxClient(mailboxId: string) {
  const mailbox = await prisma.mailbox.findUnique({
    where: { id: mailboxId },
    include: {
      secrets: true,
    },
  });

  if (!mailbox || !mailbox.secrets) {
    throw new Error("邮箱或登录凭据不存在");
  }

  const token = secretsService.decrypt(mailbox.secrets.encryptedToken);

  return {
    mailbox,
    client: DuckMailClient.withToken(token),
  };
}

export class MailboxSyncService {
  async cacheMessageSummaries(mailboxId: string, items: DuckMailMessageSummary[]) {
    let updatedCount = 0;

    for (const chunk of chunkItems(items, 50)) {
      await prisma.$transaction(
        chunk.map((item) =>
          prisma.message.upsert({
            where: {
              mailboxId_messageId: {
                mailboxId,
                messageId: item.id,
              },
            },
            update: {
              msgid: item.msgid,
              accountId: item.accountId,
              fromName: item.from?.name ?? null,
              fromAddress: item.from?.address ?? null,
              toJson: stringifyRecipients(item.to),
              subject: item.subject,
              seen: item.seen,
              isDeleted: item.isDeleted,
              hasAttachments: item.hasAttachments,
              size: item.size,
              downloadUrl: item.downloadUrl,
              remoteCreatedAt: new Date(item.createdAt),
              remoteUpdatedAt: new Date(item.updatedAt),
              syncedAt: new Date(),
            },
            create: {
              mailboxId,
              messageId: item.id,
              msgid: item.msgid,
              accountId: item.accountId,
              fromName: item.from?.name ?? null,
              fromAddress: item.from?.address ?? null,
              toJson: stringifyRecipients(item.to),
              subject: item.subject,
              seen: item.seen,
              isDeleted: item.isDeleted,
              hasAttachments: item.hasAttachments,
              size: item.size,
              downloadUrl: item.downloadUrl,
              remoteCreatedAt: new Date(item.createdAt),
              remoteUpdatedAt: new Date(item.updatedAt),
              syncedAt: new Date(),
            },
          }),
        ),
      );

      updatedCount += chunk.length;
    }

    return updatedCount;
  }

  async cacheMessageDetail(
    mailboxId: string,
    detail: DuckMailMessageDetail,
    source?: DuckMailSource | null,
  ) {
    const message = await prisma.message.upsert({
      where: {
        mailboxId_messageId: {
          mailboxId,
          messageId: detail.id,
        },
      },
      update: {
        msgid: detail.msgid,
        accountId: detail.accountId,
        fromName: detail.from?.name ?? null,
        fromAddress: detail.from?.address ?? null,
        toJson: stringifyRecipients(detail.to),
        subject: detail.subject,
        seen: detail.seen,
        isDeleted: detail.isDeleted,
        hasAttachments: detail.hasAttachments,
        size: detail.size,
        downloadUrl: detail.downloadUrl,
        textBody: detail.text ?? null,
        htmlBodiesJson: JSON.stringify(detail.html ?? []),
        rawSourceData: source?.data,
        sourceDownloadUrl: source?.downloadUrl,
        remoteCreatedAt: new Date(detail.createdAt),
        remoteUpdatedAt: new Date(detail.updatedAt),
        syncedAt: new Date(),
      },
      create: {
        mailboxId,
        messageId: detail.id,
        msgid: detail.msgid,
        accountId: detail.accountId,
        fromName: detail.from?.name ?? null,
        fromAddress: detail.from?.address ?? null,
        toJson: stringifyRecipients(detail.to),
        subject: detail.subject,
        seen: detail.seen,
        isDeleted: detail.isDeleted,
        hasAttachments: detail.hasAttachments,
        size: detail.size,
        downloadUrl: detail.downloadUrl,
        textBody: detail.text ?? null,
        htmlBodiesJson: JSON.stringify(detail.html ?? []),
        rawSourceData: source?.data,
        sourceDownloadUrl: source?.downloadUrl,
        remoteCreatedAt: new Date(detail.createdAt),
        remoteUpdatedAt: new Date(detail.updatedAt),
        syncedAt: new Date(),
      },
      include: {
        attachments: true,
      },
    });

    await prisma.attachment.deleteMany({
      where: {
        messageDbId: message.id,
      },
    });

    if ((detail.attachments ?? []).length > 0) {
      await prisma.attachment.createMany({
        data: (detail.attachments ?? []).map((attachment) => ({
          messageDbId: message.id,
          attachmentId: attachment.id,
          filename: attachment.filename,
          contentType: attachment.contentType,
          disposition: attachment.disposition,
          transferEncoding: attachment.transferEncoding,
          related: attachment.related,
          size: attachment.size,
          downloadUrl: attachment.downloadUrl,
        })),
      });
    }

    const refreshed = await prisma.message.findUniqueOrThrow({
      where: {
        mailboxId_messageId: {
          mailboxId,
          messageId: detail.id,
        },
      },
      include: {
        attachments: true,
      },
    });

    return {
      ...refreshed,
      htmlBodies: parseJsonArray(refreshed.htmlBodiesJson),
    };
  }

  async cacheMessageSource(mailboxId: string, messageId: string, source: DuckMailSource) {
    await prisma.message.updateMany({
      where: {
        mailboxId,
        messageId,
      },
      data: {
        rawSourceData: source.data,
        sourceDownloadUrl: source.downloadUrl,
        syncedAt: new Date(),
      },
    });
  }

  async syncMailbox(mailboxId: string, options?: { rebuild?: boolean }): Promise<SyncResult> {
    const { mailbox, client } = await getMailboxClient(mailboxId);

    const latestKnown = options?.rebuild
      ? null
      : await prisma.message.findFirst({
          where: { mailboxId },
          orderBy: { remoteCreatedAt: "desc" },
          select: { messageId: true },
        });

    try {
      if (options?.rebuild) {
        await prisma.attachment.deleteMany({
          where: {
            message: {
              mailboxId,
            },
          },
        });
        await prisma.message.deleteMany({
          where: { mailboxId },
        });
      }

      let page = 1;
      let stop = false;
      let updatedCount = 0;

      while (!stop) {
        const response = await client.getMessages(page);
        const batch: DuckMailMessageSummary[] = [];

        for (const item of response["hydra:member"]) {
          if (!options?.rebuild && latestKnown?.messageId === item.id) {
            stop = true;
            break;
          }

          batch.push(item);
        }

        updatedCount += await this.cacheMessageSummaries(mailboxId, batch);

        if (
          stop ||
          response["hydra:member"].length === 0 ||
          !response["hydra:view"]?.["hydra:next"]
        ) {
          break;
        }

        page += 1;
      }

      await prisma.mailbox.update({
        where: { id: mailboxId },
        data: {
          lastSyncedAt: new Date(),
          lastMessageSyncAt: new Date(),
          lastError: null,
          status: MailboxStatus.ACTIVE,
        },
      });

      await createSyncLog({
        targetType: "MAILBOX",
        targetId: mailboxId,
        action: options?.rebuild ? "rebuild-mailbox-cache" : "sync-mailbox",
        success: true,
        details: { updatedCount, address: mailbox.address },
      });

      return {
        action: options?.rebuild ? "rebuild-mailbox-cache" : "sync-mailbox",
        targetType: "MAILBOX",
        targetId: mailboxId,
        success: true,
        message: `已同步 ${updatedCount} 封邮件`,
        updatedCount,
      };
    } catch (error) {
      await prisma.mailbox.update({
        where: { id: mailboxId },
        data: {
          lastError: error instanceof Error ? error.message : "同步失败",
          status:
            error instanceof DuckMailApiError && error.status === 401
              ? MailboxStatus.AUTH_ERROR
              : mailbox.status,
        },
      });

      await createSyncLog({
        targetType: "MAILBOX",
        targetId: mailboxId,
        action: options?.rebuild ? "rebuild-mailbox-cache" : "sync-mailbox",
        success: false,
        errorType: error instanceof DuckMailApiError ? error.errorType : "Unknown",
        errorMessage: error instanceof Error ? error.message : "Unknown error",
      });

      return {
        action: options?.rebuild ? "rebuild-mailbox-cache" : "sync-mailbox",
        targetType: "MAILBOX",
        targetId: mailboxId,
        success: false,
        message: error instanceof Error ? error.message : "同步失败",
      };
    }
  }

  async syncAllMailboxes(options?: { rebuild?: boolean }) {
    const results = [];
    let cursorId: string | undefined;

    while (true) {
      const mailboxes = await prisma.mailbox.findMany({
        where: {
          status: {
            in: [MailboxStatus.ACTIVE, MailboxStatus.AUTH_ERROR],
          },
        },
        select: { id: true },
        orderBy: { id: "asc" },
        take: 100,
        ...(cursorId
          ? {
              cursor: { id: cursorId },
              skip: 1,
            }
          : {}),
      });

      if (mailboxes.length === 0) {
        break;
      }

      for (const mailbox of mailboxes) {
        results.push(await this.syncMailbox(mailbox.id, options));
      }

      cursorId = mailboxes[mailboxes.length - 1]?.id;
    }

    return results;
  }

  async hydrateMessage(mailboxId: string, messageId: string) {
    const existing = await prisma.message.findUnique({
      where: {
        mailboxId_messageId: {
          mailboxId,
          messageId,
        },
      },
      include: {
        attachments: true,
      },
    });

    if (existing?.textBody || existing?.htmlBodiesJson || existing?.rawSourceData) {
      return {
        ...existing,
        htmlBodies: parseJsonArray(existing.htmlBodiesJson),
      };
    }

    const { client } = await getMailboxClient(mailboxId);
    const [detail, source] = await Promise.all([
      client.getMessage(messageId),
      client.getSource(messageId),
    ]);

    return this.cacheMessageDetail(mailboxId, detail, source);
  }

  async markMessageSeen(mailboxId: string, messageId: string) {
    const { client } = await getMailboxClient(mailboxId);
    await client.markMessageSeen(messageId);

    await this.recordMessageSeen(mailboxId, messageId);
  }

  async recordMessageSeen(mailboxId: string, messageId: string) {
    await prisma.message.updateMany({
      where: {
        mailboxId,
        messageId,
      },
      data: {
        seen: true,
        syncedAt: new Date(),
      },
    });
  }

  async deleteMessage(mailboxId: string, messageId: string) {
    const { client } = await getMailboxClient(mailboxId);
    await client.deleteMessage(messageId);

    await this.recordMessageDeleted(mailboxId, messageId);
  }

  async recordMessageDeleted(mailboxId: string, messageId: string) {
    await prisma.message.updateMany({
      where: {
        mailboxId,
        messageId,
      },
      data: {
        isDeleted: true,
        syncedAt: new Date(),
      },
    });
  }

  async getDecryptedToken(mailboxId: string) {
    const secrets = await prisma.mailboxSecret.findUnique({
      where: { mailboxId },
    });

    if (!secrets) {
      throw new Error("邮箱凭据不存在");
    }

    return secretsService.decrypt(secrets.encryptedToken);
  }
}

export const mailboxSyncService = new MailboxSyncService();
