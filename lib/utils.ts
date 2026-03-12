import { clsx, type ClassValue } from "clsx";
import { formatDistanceToNow } from "date-fns";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDateTime(date: Date | string | null | undefined) {
  if (!date) {
    return "未同步";
  }

  return new Date(date).toLocaleString("zh-CN", {
    hour12: false,
  });
}

export function formatRelative(date: Date | string | null | undefined) {
  if (!date) {
    return "未同步";
  }

  return `${formatDistanceToNow(new Date(date), { addSuffix: true })}`;
}

export function maskSecret(value: string | null | undefined) {
  if (!value) {
    return "未保存";
  }

  if (value.length <= 8) {
    return `${value.slice(0, 2)}••••`;
  }

  return `${value.slice(0, 4)}••••${value.slice(-4)}`;
}

export function normalizeBasePath(value: string | null | undefined) {
  if (!value) {
    return "";
  }

  const trimmed = value.trim();
  if (!trimmed || trimmed === "/") {
    return "";
  }

  const withLeadingSlash = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  const normalized = withLeadingSlash.replace(/\/{2,}/g, "/").replace(/\/$/, "");
  return normalized === "/" ? "" : normalized;
}

export function withBasePath(path: string, basePath = "") {
  if (!path) {
    return normalizeBasePath(basePath) || "/";
  }

  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }

  const normalizedBasePath = normalizeBasePath(basePath);
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;

  if (!normalizedBasePath) {
    return normalizedPath;
  }

  if (normalizedPath === "/") {
    return normalizedBasePath;
  }

  return `${normalizedBasePath}${normalizedPath}`;
}

export function getCookiePath(basePath = "") {
  return normalizeBasePath(basePath) || "/";
}

export function withStatusMessage(
  path: string,
  type: "success" | "error",
  message: string,
  basePath = "",
) {
  const url = new URL(withBasePath(path, basePath), "http://localhost");
  url.searchParams.set(type, message);
  return `${url.pathname}${url.search}`;
}

export function normalizeRelativePath(downloadUrl: string, baseUrl: string) {
  if (downloadUrl.startsWith("http://") || downloadUrl.startsWith("https://")) {
    return downloadUrl;
  }

  return new URL(downloadUrl, baseUrl).toString();
}
