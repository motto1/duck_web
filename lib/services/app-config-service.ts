import { Prisma } from "@prisma/client";

import { env } from "@/lib/env";
import { prisma } from "@/lib/prisma";

const APP_CONFIG_ID = "global";

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
