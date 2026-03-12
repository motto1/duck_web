import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().min(1).default("file:./dev.db"),
  DUCKMAIL_API_BASE_URL: z.string().url().default("https://api.duckmail.sbs"),
  ADMIN_USERNAME: z.string().min(1).default("admin"),
  ADMIN_PASSWORD: z.string().min(1).optional(),
  ADMIN_PASSWORD_HASH: z.string().min(1).optional(),
  DUCKMAIL_PROXY_ENABLED: z.string().optional(),
  DUCKMAIL_PROXY_TYPE: z.string().optional(),
  DUCKMAIL_PROXY_HOST: z.string().optional(),
  DUCKMAIL_PROXY_PORT: z.string().optional(),
  DUCKMAIL_PROXY_USERNAME: z.string().optional(),
  DUCKMAIL_PROXY_PASSWORD: z.string().optional(),
  APP_ENCRYPTION_KEY: z
    .string()
    .min(16)
    .default("change-me-to-a-long-random-secret"),
  SESSION_SECRET: z.string().min(16).optional(),
  RELAY_API_TOKEN: z.string().min(16).default("change-me-to-a-relay-api-token"),
  BRIDGE_API_TOKEN: z.string().min(16).optional(),
});

export const env = envSchema.parse({
  DATABASE_URL: process.env.DATABASE_URL ?? "file:./dev.db",
  DUCKMAIL_API_BASE_URL:
    process.env.DUCKMAIL_API_BASE_URL ?? "https://api.duckmail.sbs",
  ADMIN_USERNAME: process.env.ADMIN_USERNAME ?? "admin",
  ADMIN_PASSWORD: process.env.ADMIN_PASSWORD,
  ADMIN_PASSWORD_HASH: process.env.ADMIN_PASSWORD_HASH,
  DUCKMAIL_PROXY_ENABLED: process.env.DUCKMAIL_PROXY_ENABLED,
  DUCKMAIL_PROXY_TYPE: process.env.DUCKMAIL_PROXY_TYPE,
  DUCKMAIL_PROXY_HOST: process.env.DUCKMAIL_PROXY_HOST,
  DUCKMAIL_PROXY_PORT: process.env.DUCKMAIL_PROXY_PORT,
  DUCKMAIL_PROXY_USERNAME: process.env.DUCKMAIL_PROXY_USERNAME,
  DUCKMAIL_PROXY_PASSWORD: process.env.DUCKMAIL_PROXY_PASSWORD,
  APP_ENCRYPTION_KEY: process.env.APP_ENCRYPTION_KEY,
  SESSION_SECRET: process.env.SESSION_SECRET,
  RELAY_API_TOKEN:
    process.env.RELAY_API_TOKEN ??
    process.env.BRIDGE_API_TOKEN ??
    "change-me-to-a-relay-api-token",
  BRIDGE_API_TOKEN: process.env.BRIDGE_API_TOKEN,
});
