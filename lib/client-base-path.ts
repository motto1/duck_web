"use client";

import { normalizeBasePath, withBasePath } from "@/lib/utils";

export function getClientBasePath() {
  if (typeof document === "undefined") {
    return "";
  }

  return normalizeBasePath(document.body?.dataset.basePath ?? "");
}

export function getClientPath(path: string) {
  return withBasePath(path, getClientBasePath());
}
