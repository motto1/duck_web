import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

import { env } from "@/lib/env";

const ALGORITHM = "aes-256-gcm";

function getKey() {
  return createHash("sha256").update(env.APP_ENCRYPTION_KEY).digest();
}

export type EncryptedPayload = {
  iv: string;
  tag: string;
  data: string;
};

export function encryptString(value: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGORITHM, getKey(), iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  return JSON.stringify({
    iv: iv.toString("base64"),
    tag: tag.toString("base64"),
    data: encrypted.toString("base64"),
  } satisfies EncryptedPayload);
}

export function decryptString(payload: string) {
  const parsed = JSON.parse(payload) as EncryptedPayload;
  const decipher = createDecipheriv(
    ALGORITHM,
    getKey(),
    Buffer.from(parsed.iv, "base64"),
  );

  decipher.setAuthTag(Buffer.from(parsed.tag, "base64"));

  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(parsed.data, "base64")),
    decipher.final(),
  ]);

  return decrypted.toString("utf8");
}

export function fingerprintString(value: string) {
  return createHash("sha256").update(value).digest("hex");
}
