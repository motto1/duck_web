import {
  type DuckMailAccount,
  type DuckMailCollection,
  type DuckMailDomain,
  type DuckMailErrorPayload,
  type DuckMailMessageDetail,
  type DuckMailMessageSummary,
  type DuckMailSource,
  type DuckMailTokenResponse,
} from "@/lib/duckmail/types";
import { appConfigService } from "@/lib/services/app-config-service";
import { normalizeRelativePath } from "@/lib/utils";

type AuthMode =
  | { type: "token"; value: string }
  | { type: "api-key"; value: string }
  | { type: "none" };

export class DuckMailApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly errorType: string,
    message: string,
  ) {
    super(message);
  }
}

export class DuckMailClient {
  constructor(private readonly auth: AuthMode = { type: "none" }) {}

  static withToken(token: string) {
    return new DuckMailClient({ type: "token", value: token });
  }

  static withApiKey(key: string) {
    return new DuckMailClient({ type: "api-key", value: key });
  }

  static unauthenticated() {
    return new DuckMailClient({ type: "none" });
  }

  private async getBaseUrl() {
    return appConfigService.getDuckMailApiBaseUrl();
  }

  private headers(extra?: HeadersInit) {
    const headers = new Headers(extra);
    headers.set("Content-Type", "application/json");

    if (this.auth.type !== "none") {
      headers.set("Authorization", `Bearer ${this.auth.value}`);
    }

    return headers;
  }

  private async request<T>(path: string, init?: RequestInit): Promise<T> {
    const baseUrl = await this.getBaseUrl();
    const response = await fetch(new URL(path, baseUrl), {
      ...init,
      headers: this.headers(init?.headers),
      cache: "no-store",
    });

    const rawText = await response.text();
    const data = rawText ? (JSON.parse(rawText) as T | DuckMailErrorPayload) : null;

    if (!response.ok) {
      const errorPayload = (data ?? {}) as DuckMailErrorPayload;
      throw new DuckMailApiError(
        response.status,
        errorPayload.error ?? "DuckMailError",
        errorPayload.message ?? `DuckMail request failed: ${response.status}`,
      );
    }

    return data as T;
  }

  async getDomains(page = 1) {
    return this.request<DuckMailCollection<DuckMailDomain>>(`/domains?page=${page}`);
  }

  async createAccount(input: { address: string; password: string }) {
    return this.request<DuckMailAccount>("/accounts", {
      method: "POST",
      body: JSON.stringify(input),
    });
  }

  async createToken(input: { address: string; password: string }) {
    return this.request<DuckMailTokenResponse>("/token", {
      method: "POST",
      body: JSON.stringify(input),
    });
  }

  async getMe() {
    return this.request<DuckMailAccount>("/me");
  }

  async deleteAccount(accountId: string) {
    await this.request<void>(`/accounts/${accountId}`, {
      method: "DELETE",
    });
  }

  async getMessages(page = 1) {
    return this.request<DuckMailCollection<DuckMailMessageSummary>>(
      `/messages?page=${page}`,
    );
  }

  async getMessage(messageId: string) {
    return this.request<DuckMailMessageDetail>(`/messages/${messageId}`);
  }

  async markMessageSeen(messageId: string) {
    return this.request<{ seen: true }>(`/messages/${messageId}`, {
      method: "PATCH",
      body: JSON.stringify({ seen: true }),
    });
  }

  async deleteMessage(messageId: string) {
    await this.request<void>(`/messages/${messageId}`, {
      method: "DELETE",
    });
  }

  async getSource(messageId: string) {
    return this.request<DuckMailSource>(`/sources/${messageId}`);
  }

  async download(path: string) {
    const baseUrl = await this.getBaseUrl();
    const response = await fetch(normalizeRelativePath(path, baseUrl), {
      headers:
        this.auth.type === "none"
          ? undefined
          : {
              Authorization: `Bearer ${this.auth.value}`,
            },
      cache: "no-store",
    });

    if (!response.ok) {
      throw new DuckMailApiError(
        response.status,
        "DownloadFailed",
        `无法下载资源：${response.status}`,
      );
    }

    return response;
  }
}
