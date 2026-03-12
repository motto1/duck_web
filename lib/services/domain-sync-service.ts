import { type DomainCache, type SyncTargetType } from "@prisma/client";

import { DuckMailApiError, DuckMailClient } from "@/lib/duckmail/client";
import type { DuckMailDomain } from "@/lib/duckmail/types";
import { prisma } from "@/lib/prisma";
import { createSyncLog } from "@/lib/services/logging-service";
import { secretsService } from "@/lib/services/secrets-service";
import type { SyncResult } from "@/lib/types";

export class DomainSyncService {
  async cacheDomains(apiKeyId: string, domains: DuckMailDomain[]) {
    await prisma.$transaction(async (tx) => {
      const existingDomains = await tx.domainCache.findMany({
        where: { apiKeyId },
        select: {
          domain: true,
          isEnabledForRelay: true,
        },
      });
      const relayFlags = new Map(
        existingDomains.map((domain) => [domain.domain.toLowerCase(), domain.isEnabledForRelay]),
      );

      await tx.domainCache.deleteMany({
        where: { apiKeyId },
      });

      if (domains.length > 0) {
        await tx.domainCache.createMany({
          data: domains.map((domain) => ({
            apiKeyId,
            domain: domain.domain,
            ownerId: domain.ownerId,
            isPrivate: Boolean(domain.ownerId),
            isEnabledForRelay: relayFlags.get(domain.domain.toLowerCase()) ?? false,
            isVerified: domain.isVerified,
            verificationToken: domain.verificationToken,
            lastSyncedAt: new Date(),
          })),
        });
      }

      await tx.apiKey.update({
        where: { id: apiKeyId },
        data: {
          lastSyncedAt: new Date(),
        },
      });
    });
  }

  async syncApiKey(apiKeyId: string): Promise<SyncResult> {
    const apiKey = await prisma.apiKey.findUnique({
      where: { id: apiKeyId },
    });

    if (!apiKey) {
      return {
        action: "sync-domains",
        targetType: "API_KEY" satisfies SyncTargetType,
        targetId: apiKeyId,
        success: false,
        message: "API Key 不存在",
      };
    }

    try {
      const keyValue = secretsService.decrypt(apiKey.encryptedKey);
      const client = DuckMailClient.withApiKey(keyValue);

      const allDomains: DuckMailDomain[] = [];
      let page = 1;

      while (true) {
        const response = await client.getDomains(page);
        allDomains.push(...response["hydra:member"]);

        if (!response["hydra:view"]?.["hydra:next"]) {
          break;
        }

        page += 1;
      }

      await this.cacheDomains(apiKeyId, allDomains);

      await createSyncLog({
        targetType: "API_KEY",
        targetId: apiKeyId,
        action: "sync-domains",
        success: true,
        details: { count: allDomains.length },
      });

      return {
        action: "sync-domains",
        targetType: "API_KEY",
        targetId: apiKeyId,
        success: true,
        message: `已同步 ${allDomains.length} 个域名`,
        updatedCount: allDomains.length,
      };
    } catch (error) {
      await createSyncLog({
        targetType: "API_KEY",
        targetId: apiKeyId,
        action: "sync-domains",
        success: false,
        errorType: error instanceof DuckMailApiError ? error.errorType : "Unknown",
        errorMessage: error instanceof Error ? error.message : "Unknown error",
      });

      return {
        action: "sync-domains",
        targetType: "API_KEY",
        targetId: apiKeyId,
        success: false,
        message: error instanceof Error ? error.message : "同步域名失败",
      };
    }
  }

  async syncAllEnabledKeys() {
    const keys = await prisma.apiKey.findMany({
      where: { isEnabled: true },
      select: { id: true },
    });

    const results = [];
    for (const key of keys) {
      results.push(await this.syncApiKey(key.id));
    }

    return results;
  }

  async getGroupedDomains() {
    const domains = await prisma.domainCache.findMany({
      include: {
        apiKey: true,
      },
      orderBy: [{ isPrivate: "desc" }, { domain: "asc" }],
    });

    return domains.reduce<
      Record<string, { apiKey: DomainCache["apiKeyId"] | "public"; items: typeof domains }>
    >((acc, domain) => {
      const key = domain.apiKeyId ?? "public";
      if (!acc[key]) {
        acc[key] = {
          apiKey: key,
          items: [],
        };
      }
      acc[key].items.push(domain);
      return acc;
    }, {});
  }
}

export const domainSyncService = new DomainSyncService();
