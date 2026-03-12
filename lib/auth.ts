import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { jwtVerify, SignJWT } from "jose";
import argon2 from "argon2";

import { env } from "@/lib/env";
import { getRequestBasePath, withRequestBasePath } from "@/lib/request-base-path";
import { appConfigService } from "@/lib/services/app-config-service";
import { getCookiePath } from "@/lib/utils";

const SESSION_COOKIE = "duckmail_admin_session";

function sessionSecret() {
  return new TextEncoder().encode(env.SESSION_SECRET ?? env.APP_ENCRYPTION_KEY);
}

export async function verifyAdminPassword(password: string) {
  const storedAdminPassword = await appConfigService.getAdminPassword();
  if (storedAdminPassword) {
    return password === storedAdminPassword;
  }

  if (!env.ADMIN_PASSWORD_HASH) {
    return false;
  }

  if (!env.ADMIN_PASSWORD_HASH.startsWith("$argon2")) {
    throw new Error(
      "ADMIN_PASSWORD_HASH 配置无效：请在 .env 中将每个 $ 写成 \\$，或者直接改用 ADMIN_PASSWORD",
    );
  }

  return argon2.verify(env.ADMIN_PASSWORD_HASH, password);
}

async function isSecureRequest() {
  const requestHeaders = await headers();
  const forwardedProto = requestHeaders
    .get("x-forwarded-proto")
    ?.split(",")[0]
    ?.trim()
    .toLowerCase();

  if (forwardedProto) {
    return forwardedProto === "https";
  }

  const origin = requestHeaders.get("origin") ?? requestHeaders.get("referer") ?? "";
  return origin.startsWith("https://");
}

async function getSessionCookieOptions(
  overrides: Partial<{
    expires: Date;
    maxAge: number;
  }> = {},
) {
  const basePath = await getRequestBasePath();

  return {
    httpOnly: true as const,
    sameSite: "lax" as const,
    secure: await isSecureRequest(),
    path: getCookiePath(basePath),
    ...overrides,
  };
}

export async function createAdminSession() {
  return new SignJWT({ role: "admin", username: env.ADMIN_USERNAME })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(sessionSecret());
}

export async function persistAdminSession() {
  const token = await createAdminSession();
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    ...(await getSessionCookieOptions({
      maxAge: 60 * 60 * 24 * 7,
    })),
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function clearAdminSession() {
  const store = await cookies();
  store.set(SESSION_COOKIE, "", {
    ...(await getSessionCookieOptions({
      expires: new Date(0),
    })),
    expires: new Date(0),
  });
}

export async function getAdminSession() {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;

  if (!token) {
    return null;
  }

  try {
    const result = await jwtVerify(token, sessionSecret(), {
      algorithms: ["HS256"],
    });

    if (result.payload.role !== "admin") {
      return null;
    }

    return {
      username: String(result.payload.username),
    };
  } catch {
    return null;
  }
}

export async function requireAdminSession() {
  const session = await getAdminSession();
  if (!session) {
    redirect(await withRequestBasePath("/login"));
  }

  return session;
}

export async function redirectIfAuthenticated() {
  const session = await getAdminSession();
  if (session) {
    redirect(await withRequestBasePath("/dashboard"));
  }
}
