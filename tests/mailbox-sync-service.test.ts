import { MailboxStatus } from "@prisma/client";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    $transaction: vi.fn(async (operations: Promise<unknown>[]) => Promise.all(operations)),
    mailbox: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    message: {
      findFirst: vi.fn(),
      upsert: vi.fn(),
      deleteMany: vi.fn(),
      findUnique: vi.fn(),
      findUniqueOrThrow: vi.fn(),
      update: vi.fn(),
    },
    attachment: {
      deleteMany: vi.fn(),
      createMany: vi.fn(),
    },
  },
}));

vi.mock("@/lib/services/logging-service", () => ({
  createSyncLog: vi.fn(),
}));

import { DuckMailApiError, DuckMailClient } from "@/lib/duckmail/client";
import { prisma } from "@/lib/prisma";
import { mailboxSyncService } from "@/lib/services/mailbox-sync-service";
import { secretsService } from "@/lib/services/secrets-service";

describe("MailboxSyncService", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("upserts new message summaries during sync", async () => {
    vi.spyOn(secretsService, "decrypt").mockReturnValue("token");
    vi.spyOn(DuckMailClient, "withToken").mockReturnValue({
      getMessages: vi
        .fn()
        .mockResolvedValueOnce({
          "hydra:member": [
            {
              id: "m-1",
              msgid: "msg-1",
              accountId: "acc-1",
              from: { name: "Sender", address: "sender@example.com" },
              to: [{ name: "You", address: "you@example.com" }],
              subject: "Hello",
              seen: false,
              isDeleted: false,
              hasAttachments: false,
              size: 123,
              downloadUrl: "/messages/m-1",
              createdAt: "2026-03-11T10:00:00Z",
              updatedAt: "2026-03-11T10:00:00Z",
            },
          ],
          "hydra:totalItems": 1,
          "hydra:view": {},
        })
        .mockResolvedValueOnce({
          "hydra:member": [],
          "hydra:totalItems": 1,
          "hydra:view": {},
        }),
    } as unknown as DuckMailClient);

    vi.mocked(prisma.mailbox.findUnique).mockResolvedValue({
      id: "mailbox-1",
      address: "you@example.com",
      accountId: "acc-1",
      source: "JOINED_TOKEN",
      status: MailboxStatus.ACTIVE,
      displayName: null,
      lastSyncedAt: null,
      lastMessageSyncAt: null,
      lastError: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      secrets: {
        id: "sec-1",
        mailboxId: "mailbox-1",
        encryptedPassword: null,
        encryptedToken: "cipher",
        tokenValidatedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    } as never);
    vi.mocked(prisma.message.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.message.upsert).mockResolvedValue({} as never);
    vi.mocked(prisma.mailbox.update).mockResolvedValue({} as never);

    const result = await mailboxSyncService.syncMailbox("mailbox-1");

    expect(result.success).toBe(true);
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(prisma.message.upsert).toHaveBeenCalledTimes(1);
    expect(prisma.mailbox.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "mailbox-1" },
      }),
    );
  });

  it("marks mailbox as auth error when DuckMail returns 401", async () => {
    vi.spyOn(secretsService, "decrypt").mockReturnValue("token");
    vi.spyOn(DuckMailClient, "withToken").mockReturnValue({
      getMessages: vi.fn().mockRejectedValue(new DuckMailApiError(401, "Unauthorized", "expired")),
    } as unknown as DuckMailClient);

    vi.mocked(prisma.mailbox.findUnique).mockResolvedValue({
      id: "mailbox-1",
      address: "you@example.com",
      accountId: "acc-1",
      source: "JOINED_TOKEN",
      status: MailboxStatus.ACTIVE,
      displayName: null,
      lastSyncedAt: null,
      lastMessageSyncAt: null,
      lastError: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      secrets: {
        id: "sec-1",
        mailboxId: "mailbox-1",
        encryptedPassword: null,
        encryptedToken: "cipher",
        tokenValidatedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    } as never);
    vi.mocked(prisma.message.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.mailbox.update).mockResolvedValue({} as never);

    const result = await mailboxSyncService.syncMailbox("mailbox-1");

    expect(result.success).toBe(false);
    expect(prisma.mailbox.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: MailboxStatus.AUTH_ERROR,
        }),
      }),
    );
  });
});
