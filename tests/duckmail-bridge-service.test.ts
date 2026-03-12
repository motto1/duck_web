vi.mock("@/lib/prisma", () => ({
  prisma: {
    domainCache: {
      count: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
    },
    relayClient: {
      findUnique: vi.fn(),
    },
    mailbox: {
      updateMany: vi.fn(),
    },
    message: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock("@/lib/services/mailbox-persistence-service", () => ({
  mailboxPersistenceService: {
    persistCreatedMailbox: vi.fn(),
    persistPasswordMailbox: vi.fn(),
    persistTokenMailbox: vi.fn(),
  },
}));

vi.mock("@/lib/services/mailbox-sync-service", () => ({
  mailboxSyncService: {
    cacheMessageSummaries: vi.fn(),
    cacheMessageDetail: vi.fn(),
    cacheMessageSource: vi.fn(),
    recordMessageSeen: vi.fn(),
    recordMessageDeleted: vi.fn(),
  },
}));

vi.mock("@/lib/services/secrets-service", () => ({
  secretsService: {
    decrypt: vi.fn(),
  },
}));

import { DuckMailClient } from "@/lib/duckmail/client";
import { env } from "@/lib/env";
import { prisma } from "@/lib/prisma";
import { duckMailBridgeService } from "@/lib/services/duckmail-bridge-service";
import { mailboxPersistenceService } from "@/lib/services/mailbox-persistence-service";
import { mailboxSyncService } from "@/lib/services/mailbox-sync-service";
import { secretsService } from "@/lib/services/secrets-service";

describe("DuckMailBridgeService", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
  });

  it("requires relay api token for project relay endpoints", async () => {
    vi.mocked(prisma.relayClient.findUnique).mockResolvedValue(null as never);
    await expect(
      duckMailBridgeService.authorizeRelayRequest(
        new Request("http://localhost/api/domains", {
          headers: {
            authorization: "Bearer invalid-token",
          },
        }),
      ),
    ).rejects.toThrow("Relay API token is invalid");
  });

  it("returns local whitelist domains for relay requests", async () => {
    vi.mocked(prisma.domainCache.count).mockResolvedValue(1 as never);
    vi.mocked(prisma.domainCache.findMany).mockResolvedValue([
      {
        id: "domain-1",
        domain: "demo.example.com",
        ownerId: "owner-1",
        isVerified: true,
        verificationToken: null,
        createdAt: new Date("2026-03-11T00:00:00Z"),
        updatedAt: new Date("2026-03-11T00:00:00Z"),
      },
    ] as never);

    vi.mocked(prisma.relayClient.findUnique).mockResolvedValue(null as never);
    const response = await duckMailBridgeService.getDomains(
      await duckMailBridgeService.authorizeRelayRequest(
        new Request("http://localhost/api/domains", {
          headers: {
            authorization: `Bearer ${env.RELAY_API_TOKEN}`,
          },
        }),
      ),
      1,
    );

    expect(response["hydra:member"]).toEqual([
      expect.objectContaining({
        id: "domain-1",
        domain: "demo.example.com",
      }),
    ]);
    expect(response["hydra:totalItems"]).toBe(1);
  });

  it("authorizes managed relay token from frontend config", async () => {
    vi.mocked(prisma.relayClient.findUnique).mockResolvedValue({
      id: "relay-client-1",
      isEnabled: true,
    } as never);

    const context = await duckMailBridgeService.authorizeRelayRequest(
      new Request("http://localhost/api/domains", {
        headers: {
          authorization: "Bearer custom-managed-relay-token",
        },
      }),
    );

    expect(context).toEqual({
      type: "relay",
    });
  });

  it("persists mailbox after successful relay token exchange", async () => {
    const createToken = vi.fn().mockResolvedValue({
      id: "account-1",
      token: "mail-token",
    });
    const getMe = vi.fn().mockResolvedValue({
      id: "account-1",
      address: "demo@example.com",
      authType: "email",
      createdAt: "2026-03-11T00:00:00Z",
      updatedAt: "2026-03-11T00:00:00Z",
    });

    vi.mocked(prisma.domainCache.findFirst).mockResolvedValue({
      id: "domain-1",
      domain: "example.com",
      apiKeyId: "key-1",
      apiKey: {
        id: "key-1",
        isEnabled: true,
      },
    } as never);

    vi.spyOn(DuckMailClient, "unauthenticated").mockReturnValue({
      createToken,
    } as unknown as DuckMailClient);
    vi.spyOn(DuckMailClient, "withToken").mockReturnValue({
      getMe,
    } as unknown as DuckMailClient);

    await duckMailBridgeService.createToken({
        address: "demo@example.com",
        password: "secret123",
      });

    expect(mailboxPersistenceService.persistPasswordMailbox).toHaveBeenCalledWith({
      account: expect.objectContaining({
        id: "account-1",
        address: "demo@example.com",
      }),
      password: "secret123",
      token: "mail-token",
    });
  });

  it("creates account with project-managed api key for relay domains", async () => {
    const createAccount = vi.fn().mockResolvedValue({
      id: "account-1",
      address: "relay@example.com",
      authType: "email",
      createdAt: "2026-03-11T00:00:00Z",
      updatedAt: "2026-03-11T00:00:00Z",
    });
    const createToken = vi.fn().mockResolvedValue({
      id: "account-1",
      token: "mail-token",
    });

    vi.mocked(prisma.domainCache.findFirst).mockResolvedValue({
      id: "domain-1",
      domain: "example.com",
      isEnabledForRelay: true,
      apiKeyId: "key-1",
      apiKey: {
        id: "key-1",
        isEnabled: true,
        encryptedKey: "encrypted-key",
      },
    } as never);
    vi.mocked(secretsService.decrypt).mockReturnValue("dk_project_managed" as never);
    vi.spyOn(DuckMailClient, "withApiKey").mockReturnValue({
      createAccount,
    } as unknown as DuckMailClient);
    vi.spyOn(DuckMailClient, "unauthenticated").mockReturnValue({
      createToken,
    } as unknown as DuckMailClient);

    await duckMailBridgeService.createAccount(
      await duckMailBridgeService.authorizeRelayRequest(
        new Request("http://localhost/api/accounts", {
          headers: {
            authorization: `Bearer ${env.RELAY_API_TOKEN}`,
          },
        }),
      ),
      {
        address: "relay@example.com",
        password: "secret123",
      },
    );

    expect(DuckMailClient.withApiKey).toHaveBeenCalledWith("dk_project_managed");
    expect(createAccount).toHaveBeenCalledWith({
      address: "relay@example.com",
      password: "secret123",
    });
    expect(mailboxPersistenceService.persistCreatedMailbox).toHaveBeenCalled();
  });

  it("caches messages for token-authenticated bridge requests", async () => {
    const getMe = vi.fn().mockResolvedValue({
      id: "account-1",
      address: "demo@example.com",
      authType: "token",
      createdAt: "2026-03-11T00:00:00Z",
      updatedAt: "2026-03-11T00:00:00Z",
    });
    const getMessages = vi.fn().mockResolvedValue({
      "hydra:member": [
        {
          id: "message-1",
          msgid: "msg-1",
          accountId: "account-1",
          from: { name: "Sender", address: "sender@example.com" },
          to: [{ name: "Demo", address: "demo@example.com" }],
          subject: "hello",
          seen: false,
          isDeleted: false,
          hasAttachments: false,
          size: 123,
          downloadUrl: "/messages/message-1",
          createdAt: "2026-03-11T00:00:00Z",
          updatedAt: "2026-03-11T00:00:00Z",
        },
      ],
      "hydra:totalItems": 1,
      "hydra:view": {},
    });

    vi.spyOn(DuckMailClient, "withToken").mockReturnValue({
      getMe,
      getMessages,
    } as unknown as DuckMailClient);
    vi.mocked(mailboxPersistenceService.persistTokenMailbox).mockResolvedValue({
      id: "mailbox-1",
      address: "demo@example.com",
    } as never);

    vi.mocked(prisma.relayClient.findUnique).mockResolvedValue(null as never);
    const context = await duckMailBridgeService.authorizeMailboxRequest(
      new Request("http://localhost/api/messages", {
        headers: {
          authorization: "Bearer mailbox-token",
        },
      }),
    );

    await duckMailBridgeService.getMessages(context, 1);

    expect(mailboxSyncService.cacheMessageSummaries).toHaveBeenCalledWith(
      "mailbox-1",
      expect.arrayContaining([
        expect.objectContaining({
          id: "message-1",
        }),
      ]),
    );
  });

  it("rejects relay token on mailbox endpoints", async () => {
    vi.mocked(prisma.relayClient.findUnique).mockResolvedValue(null as never);
    await expect(
      duckMailBridgeService.authorizeMailboxRequest(
        new Request("http://localhost/api/messages", {
          headers: {
            authorization: `Bearer ${env.RELAY_API_TOKEN}`,
          },
        }),
      ),
    ).rejects.toThrow("Mailbox token is required");
  });

  it("allows anonymous token exchange for whitelisted domains", async () => {
    const createToken = vi.fn().mockResolvedValue({
      id: "account-2",
      token: "mail-token-2",
    });
    const getMe = vi.fn().mockResolvedValue({
      id: "account-2",
      address: "anon@example.com",
      authType: "email",
      createdAt: "2026-03-11T00:00:00Z",
      updatedAt: "2026-03-11T00:00:00Z",
    });

    vi.mocked(prisma.domainCache.findFirst).mockResolvedValue({
      id: "domain-2",
      domain: "example.com",
      apiKeyId: "key-2",
      apiKey: {
        id: "key-2",
        isEnabled: true,
      },
    } as never);
    vi.spyOn(DuckMailClient, "unauthenticated").mockReturnValue({
      createToken,
    } as unknown as DuckMailClient);
    vi.spyOn(DuckMailClient, "withToken").mockReturnValue({
      getMe,
    } as unknown as DuckMailClient);

    const result = await duckMailBridgeService.createToken({
      address: "anon@example.com",
      password: "secret123",
    });

    expect(result).toEqual({
      id: "account-2",
      token: "mail-token-2",
    });
  });
});
