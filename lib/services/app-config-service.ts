import { DuckMailProxyType, Prisma } from "@prisma/client";

import { env } from "@/lib/env";
import { prisma } from "@/lib/prisma";
import { secretsService } from "@/lib/services/secrets-service";

const APP_CONFIG_ID = "global";

export type AdminPasswordSource = "database" | "env" | "hash" | "missing";

export type DuckMailProxyConfig = {
  enabled: true;
  type: "http" | "https" | "socks5";
  host: string;
  port: number;
  username: string | null;
  password: string | null;
  source: "database" | "env";
};

export class AppConfigService {
  private isMissingTableError(error: unknown) {
    return (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      (error.code === "P2021" || error.code === "P2022")
    );
  }

  async getConfig() {
    if (process.env.NODE_ENV === "test") {
      return null;
    }

    try {
      return await prisma.appConfig.findUnique({
        where: { id: APP_CONFIG_ID },
      });
    } catch (error) {
      if (this.isMissingTableError(error)) {
        return null;
      }

      throw error;
    }
  }

  async getDuckMailApiBaseUrl() {
    const config = await this.getConfig();
    return config?.duckmailApiBaseUrl || env.DUCKMAIL_API_BASE_URL;
  }

  private hasProxyOverride(config: Awaited<ReturnType<AppConfigService["getConfig"]>>) {
    return Boolean(
      config &&
        (
          config.duckmailProxyEnabled !== null ||
          config.duckmailProxyType !== null ||
          config.duckmailProxyHost !== null ||
          config.duckmailProxyPort !== null ||
          config.duckmailProxyUsername !== null ||
          config.encryptedDuckmailProxyPassword !== null
        ),
    );
  }

  private mapProxyType(value: DuckMailProxyType | string | null | undefined) {
    switch (value) {
      case DuckMailProxyType.HTTP:
      case "http":
      case "HTTP":
        return "http" as const;
      case DuckMailProxyType.HTTPS:
      case "https":
      case "HTTPS":
        return "https" as const;
      case DuckMailProxyType.SOCKS5:
      case "socks5":
      case "SOCKS5":
        return "socks5" as const;
      default:
        return null;
    }
  }

  private envProxyConfig(): DuckMailProxyConfig | null {
    const enabledValue = env.DUCKMAIL_PROXY_ENABLED?.trim().toLowerCase();
    const enabled = enabledValue === "1" || enabledValue === "true" || enabledValue === "yes";

    if (!enabled) {
      return null;
    }

    const type = this.mapProxyType(env.DUCKMAIL_PROXY_TYPE);
    const host = env.DUCKMAIL_PROXY_HOST?.trim();
    const port = env.DUCKMAIL_PROXY_PORT ? Number.parseInt(env.DUCKMAIL_PROXY_PORT, 10) : Number.NaN;

    if (!type || !host || !Number.isInteger(port) || port <= 0) {
      return null;
    }

    return {
      enabled: true,
      type,
      host,
      port,
      username: env.DUCKMAIL_PROXY_USERNAME?.trim() || null,
      password: env.DUCKMAIL_PROXY_PASSWORD?.trim() || null,
      source: "env",
    };
  }

  async getDuckMailProxyConfig(): Promise<DuckMailProxyConfig | null> {
    const config = await this.getConfig();

    if (this.hasProxyOverride(config)) {
      if (!config?.duckmailProxyEnabled) {
        return null;
      }

      const type = this.mapProxyType(config.duckmailProxyType);
      const host = config.duckmailProxyHost?.trim();
      const port = config.duckmailProxyPort;

      if (!type || !host || !port) {
        return null;
      }

      return {
        enabled: true,
        type,
        host,
        port,
        username: config.duckmailProxyUsername?.trim() || null,
        password: config.encryptedDuckmailProxyPassword
          ? secretsService.decrypt(config.encryptedDuckmailProxyPassword)
          : null,
        source: "database",
      };
    }

    return this.envProxyConfig();
  }

  async updateDuckMailProxyConfig(input: {
    enabled: boolean;
    type: "http" | "https" | "socks5";
    host: string;
    port: number;
    username?: string | null;
    password?: string | null;
  }) {
    const existing = await this.getConfig();
    const nextType =
      input.type === "http"
        ? DuckMailProxyType.HTTP
        : input.type === "https"
          ? DuckMailProxyType.HTTPS
          : DuckMailProxyType.SOCKS5;

    return prisma.appConfig.upsert({
      where: { id: APP_CONFIG_ID },
      update: {
        duckmailProxyEnabled: input.enabled,
        duckmailProxyType: nextType,
        duckmailProxyHost: input.host.trim(),
        duckmailProxyPort: input.port,
        duckmailProxyUsername: input.username?.trim() || null,
        encryptedDuckmailProxyPassword:
          input.password === undefined
            ? existing?.encryptedDuckmailProxyPassword ?? null
            : input.password
              ? secretsService.encrypt(input.password)
              : null,
      },
      create: {
        id: APP_CONFIG_ID,
        duckmailProxyEnabled: input.enabled,
        duckmailProxyType: nextType,
        duckmailProxyHost: input.host.trim(),
        duckmailProxyPort: input.port,
        duckmailProxyUsername: input.username?.trim() || null,
        encryptedDuckmailProxyPassword: input.password
          ? secretsService.encrypt(input.password)
          : null,
      },
    });
  }

  async clearDuckMailProxyConfig() {
    return prisma.appConfig.upsert({
      where: { id: APP_CONFIG_ID },
      update: {
        duckmailProxyEnabled: null,
        duckmailProxyType: null,
        duckmailProxyHost: null,
        duckmailProxyPort: null,
        duckmailProxyUsername: null,
        encryptedDuckmailProxyPassword: null,
      },
      create: {
        id: APP_CONFIG_ID,
        duckmailProxyEnabled: null,
        duckmailProxyType: null,
        duckmailProxyHost: null,
        duckmailProxyPort: null,
        duckmailProxyUsername: null,
        encryptedDuckmailProxyPassword: null,
      },
    });
  }

  async getAdminPassword() {
    const config = await this.getConfig();
    if (config?.encryptedAdminPassword) {
      return secretsService.decrypt(config.encryptedAdminPassword);
    }

    if (env.ADMIN_PASSWORD) {
      return env.ADMIN_PASSWORD;
    }

    return null;
  }

  async getAdminPasswordSource(): Promise<AdminPasswordSource> {
    const config = await this.getConfig();
    if (config?.encryptedAdminPassword) {
      return "database";
    }

    if (env.ADMIN_PASSWORD) {
      return "env";
    }

    if (env.ADMIN_PASSWORD_HASH) {
      return "hash";
    }

    return "missing";
  }

  async updateAdminPassword(password: string) {
    return prisma.appConfig.upsert({
      where: { id: APP_CONFIG_ID },
      update: {
        encryptedAdminPassword: secretsService.encrypt(password),
      },
      create: {
        id: APP_CONFIG_ID,
        encryptedAdminPassword: secretsService.encrypt(password),
      },
    });
  }

  async updateDuckMailApiBaseUrl(url: string) {
    const normalized = url.trim();

    return prisma.appConfig.upsert({
      where: { id: APP_CONFIG_ID },
      update: {
        duckmailApiBaseUrl: normalized,
      },
      create: {
        id: APP_CONFIG_ID,
        duckmailApiBaseUrl: normalized,
      },
    });
  }

  async resetDuckMailApiBaseUrl() {
    return prisma.appConfig.upsert({
      where: { id: APP_CONFIG_ID },
      update: {
        duckmailApiBaseUrl: null,
      },
      create: {
        id: APP_CONFIG_ID,
        duckmailApiBaseUrl: null,
      },
    });
  }
}

export const appConfigService = new AppConfigService();
