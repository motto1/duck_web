import { headers } from "next/headers";

import { normalizeBasePath, withBasePath } from "@/lib/utils";

export async function getRequestBasePath() {
  const requestHeaders = await headers();
  return normalizeBasePath(requestHeaders.get("x-forwarded-prefix"));
}

export async function withRequestBasePath(path: string) {
  return withBasePath(path, await getRequestBasePath());
}
