import { MailboxStatus } from "@prisma/client";
import { NextResponse } from "next/server";

import { DuckMailApiError, DuckMailClient } from "@/lib/duckmail/client";
import { fingerprintString } from "@/lib/crypto";
import { env } from "@/lib/env";
import type {
  DuckMailAccount,
  DuckMailCollection,
  DuckMailDomain,
  DuckMailMessageDetail,
  DuckMailSource,
  DuckMailTokenResponse,
} from "@/lib/duckmail/types";
import { prisma } from "@/lib/prisma";
import { mailboxPersistenceService } from "@/lib/services/mailbox-persistence-service";
import { mailboxSyncService } from "@/lib/services/mailbox-sync-service";
import { secretsService } from "@/lib/services/secrets-service";

type RelayContext = {
  type: "relay";
};

type MailboxContext = {
  type: "mailbox";
  token: string;
};

class BridgeAccessError extends Error {
  constructor(
    public readonly status: number,
    public readonly errorType: string,
    message: string,
  ) {
    super(message);
  }
}

const RELAY_DOMAINS_PAGE_SIZE = 30;

function parseBearerToken(header: string | null) {
  if (!header) {
    throw new BridgeAccessError(401, "Unauthorized", "Authorization header is required");
  }

  const [scheme, ...rest] = header.trim().split(/\s+/);
  if (scheme?.toLowerCase() !== "bearer" || rest.length === 0) {
    throw new BridgeAccessError(401, "Unauthorized", "Authorization header is invalid");
  }

  const token = rest.join(" ").trim();
  if (!token) {
    throw new BridgeAccessError(401, "Unauthorized", "Authorization header is invalid");
  }

  return token;
}

function extractDomain(address: string) {
  const atIndex = address.lastIndexOf("@");
  if (atIndex === -1 || atIndex === address.length - 1) {
    throw new BridgeAccessError(400, "BadRequest", "Email address is invalid");
  }

  return address.slice(atIndex + 1).trim().toLowerCase();
}

function buildRelayDomainsResponse(
  page: number,
  totalItems: number,
  items: Array<{
    id: string;
    domain: string;
    ownerId: string | null;
    isVerified: boolean;
    verificationToken: string | null;
    createdAt: Date;
    updatedAt: Date;
  }>,
): DuckMailCollection<DuckMailDomain> {
  const lastPage = Math.max(1, Math.ceil(totalItems / RELAY_DOMAINS_PAGE_SIZE));

  return {
    "hydra:member": items.map((item) => ({
      id: item.id,
      domain: item.domain,
      ownerId: item.ownerId,
      isVerified: item.isVerified,
      verificationToken: item.verificationToken,
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString(),
    })),
    "hydra:totalItems": totalItems,
    "hydra:view": {
      "@id": `/domains?page=${page}`,
      "@type": "hydra:PartialCollectionView",
      "hydra:first": "/domains?page=1",
      "hydra:last": `/domains?page=${lastPage}`,
      ...(page < lastPage ? { "hydra:next": `/domains?page=${page + 1}` } : {}),
    },
  };
}

async function findRelayDomain(domainName: string) {
  return prisma.domainCache.findFirst({
    where: {
      domain: domainName,
      isEnabledForRelay: true,
      apiKey: {
        isEnabled: true,
      },
    },
    include: {
      apiKey: true,
    },
  });
}

export function bridgeErrorResponse(error: unknown) {
  if (error instanceof BridgeAccessError) {
    return NextResponse.json(
      {
        error: error.errorType,
        message: error.message,
      },
      { status: error.status },
    );
  }

  if (error instanceof DuckMailApiError) {
    return NextResponse.json(
      {
        error: error.errorType,
        message: error.message,
      },
      { status: error.status },
    );
  }

  return NextResponse.json(
    {
      error: "InternalServerError",
      message: error instanceof Error ? error.message : "Unexpected bridge error",
    },
    { status: 500 },
  );
}

function assertRequestBody<T extends object>(
  body: T | null,
  keys: (keyof T)[],
): asserts body is T & { [K in keyof T]-?: string } {
  if (!body) {
    throw new BridgeAccessError(400, "BadRequest", "Request body is required");
  }

  for (const key of keys) {
    if (typeof body[key] !== "string" || !(body[key] as string).trim()) {
      throw new BridgeAccessError(400, "BadRequest", `Missing field: ${String(key)}`);
    }
  }
}

export class DuckMailBridgeService {
  async authorizeRelayRequest(request: Request): Promise<RelayContext> {
    const token = parseBearerToken(request.headers.get("authorization"));

    const managedRelayClient = await prisma.relayClient.findUnique({
      where: {
        tokenFingerprint: fingerprintString(token),
      },
      select: {
        id: true,
        isEnabled: true,
      },
    });

    if (managedRelayClient?.isEnabled) {
      return { type: "relay" };
    }

    if (token !== env.RELAY_API_TOKEN) {
      throw new BridgeAccessError(401, "Unauthorized", "Relay API token is invalid");
    }

    return { type: "relay" };
  }

  async authorizeMailboxRequest(request: Request): Promise<MailboxContext> {
    const token = parseBearerToken(request.headers.get("authorization"));

    const relayClient = await prisma.relayClient.findUnique({
      where: {
        tokenFingerprint: fingerprintString(token),
      },
      select: {
        id: true,
      },
    });

    if (token === env.RELAY_API_TOKEN || token.startsWith("dk_") || relayClient) {
      throw new BridgeAccessError(401, "Unauthorized", "Mailbox token is required");
    }

    return {
      type: "mailbox",
      token,
    };
  }

  async getDomains(_context: RelayContext, page: number) {
    const normalizedPage = Number.isFinite(page) && page > 0 ? Math.floor(page) : 1;
    const skip = (normalizedPage - 1) * RELAY_DOMAINS_PAGE_SIZE;
    const relayWhere = {
      isEnabledForRelay: true,
      apiKey: {
        isEnabled: true,
      },
    };

    const [totalItems, items] = await Promise.all([
      prisma.domainCache.count({
        where: relayWhere,
      }),
      prisma.domainCache.findMany({
        where: relayWhere,
        orderBy: [{ isPrivate: "desc" }, { domain: "asc" }],
        skip,
        take: RELAY_DOMAINS_PAGE_SIZE,
        select: {
          id: true,
          domain: true,
          ownerId: true,
          isVerified: true,
          verificationToken: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
    ]);

    return buildRelayDomainsResponse(normalizedPage, totalItems, items);
  }

  async createAccount(
    _context: RelayContext,
    body: { address?: string; password?: string } | null,
  ) {
    assertRequestBody(body, ["address", "password"]);
    const address = body.address.trim().toLowerCase();
    const password = body.password.trim();
    const domainName = extractDomain(address);
    const relayDomain = await findRelayDomain(domainName);

    if (!relayDomain?.apiKey) {
      throw new BridgeAccessError(403, "Forbidden", "This domain is not enabled for relay");
    }

    const client = DuckMailClient.withApiKey(
      secretsService.decrypt(relayDomain.apiKey.encryptedKey),
    );
    const account = await client.createAccount({
      address,
      password,
    });
    const tokenResponse = await DuckMailClient.unauthenticated().createToken({
      address,
      password,
    });

    await mailboxPersistenceService.persistCreatedMailbox({
      account,
      password,
      token: tokenResponse.token,
    });

    return account;
  }

  async createToken(
    body: { address?: string; password?: string } | null,
  ): Promise<DuckMailTokenResponse> {
    assertRequestBody(body, ["address", "password"]);
    const address = body.address.trim().toLowerCase();
    const password = body.password.trim();
    const domainName = extractDomain(address);
    const relayDomain = await findRelayDomain(domainName);

    if (!relayDomain) {
      throw new BridgeAccessError(403, "Forbidden", "This domain is not enabled for relay");
    }

    const tokenResponse = await DuckMailClient.unauthenticated().createToken({
      address,
      password,
    });
    const me = await DuckMailClient.withToken(tokenResponse.token).getMe();

    await mailboxPersistenceService.persistPasswordMailbox({
      account: me,
      password,
      token: tokenResponse.token,
    });

    return tokenResponse;
  }

  async requireTokenMailbox(context: MailboxContext) {
    const client = DuckMailClient.withToken(context.token);
    const account = await client.getMe();
    const mailbox = await mailboxPersistenceService.persistTokenMailbox({
      account,
      token: context.token,
    });

    return {
      client,
      account,
      mailbox,
      token: context.token,
    };
  }

  async getMe(context: MailboxContext): Promise<DuckMailAccount> {
    const { account } = await this.requireTokenMailbox(context);
    return account;
  }

  async deleteAccount(context: MailboxContext, accountId: string) {
    const { client } = await this.requireTokenMailbox(context);
    await client.deleteAccount(accountId);

    await prisma.mailbox.updateMany({
      where: { accountId },
      data: {
        status: MailboxStatus.REMOTE_DELETED,
        lastError: null,
      },
    });
  }

  async getMessages(context: MailboxContext, page: number) {
    const { client, mailbox } = await this.requireTokenMailbox(context);
    const response = await client.getMessages(page);
    await mailboxSyncService.cacheMessageSummaries(mailbox.id, response["hydra:member"]);
    return response;
  }

  async getMessage(context: MailboxContext, messageId: string): Promise<DuckMailMessageDetail> {
    const { client, mailbox } = await this.requireTokenMailbox(context);
    const [detail, source] = await Promise.all([
      client.getMessage(messageId),
      client.getSource(messageId),
    ]);
    await mailboxSyncService.cacheMessageDetail(mailbox.id, detail, source);
    return detail;
  }

  async markMessageSeen(context: MailboxContext, messageId: string) {
    const { client, mailbox } = await this.requireTokenMailbox(context);
    const response = await client.markMessageSeen(messageId);
    await mailboxSyncService.recordMessageSeen(mailbox.id, messageId);
    return response;
  }

  async deleteMessage(context: MailboxContext, messageId: string) {
    const { client, mailbox } = await this.requireTokenMailbox(context);
    await client.deleteMessage(messageId);
    await mailboxSyncService.recordMessageDeleted(mailbox.id, messageId);
  }

  async getSource(context: MailboxContext, messageId: string): Promise<DuckMailSource> {
    const { client, mailbox } = await this.requireTokenMailbox(context);
    const source = await client.getSource(messageId);

    const existing = await prisma.message.findUnique({
      where: {
        mailboxId_messageId: {
          mailboxId: mailbox.id,
          messageId,
        },
      },
    });

    if (existing) {
      await mailboxSyncService.cacheMessageSource(mailbox.id, messageId, source);
    } else {
      const detail = await client.getMessage(messageId);
      await mailboxSyncService.cacheMessageDetail(mailbox.id, detail, source);
    }

    return source;
  }
}

export const duckMailBridgeService = new DuckMailBridgeService();
