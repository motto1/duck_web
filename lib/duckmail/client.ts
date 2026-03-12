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
import { duckMailTransport } from "@/lib/duckmail/transport";
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

    if (this.auth.type !== "none") {
      headers.set("Authorization", `Bearer ${this.auth.value}`);
    }

    return headers;
  }

  private headersToObject(extra?: HeadersInit) {
    const headers = this.headers(extra);
    const record: Record<string, string> = {};

    headers.forEach((value, key) => {
      record[key] = value;
    });

    return record;
  }

  private async request<T>(path: string, init?: RequestInit): Promise<T> {
    const baseUrl = await this.getBaseUrl();
    const proxy = await appConfigService.getDuckMailProxyConfig();
    const headers = this.headersToObject(init?.headers);

    if (init?.body) {
      headers["content-type"] = "application/json";
    }

    const response = await duckMailTransport.request(new URL(path, baseUrl), {
      method: init?.method,
      headers,
      body:
        typeof init?.body === "string"
          ? init.body
          : init?.body instanceof Uint8Array
            ? init.body
            : undefined,
      timeoutMs: 10000,
      proxy,
    });

    const rawText = Buffer.from(response.body).toString("utf8");
    const data = rawText ? (JSON.parse(rawText) as T | DuckMailErrorPayload) : null;

    if (response.status < 200 || response.status >= 300) {
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
    const proxy = await appConfigService.getDuckMailProxyConfig();
    const response = await duckMailTransport.request(
      normalizeRelativePath(path, baseUrl),
      {
        headers:
          this.auth.type === "none"
            ? undefined
            : {
                Authorization: `Bearer ${this.auth.value}`,
              },
        timeoutMs: 20000,
        proxy,
      },
    );

    if (response.status < 200 || response.status >= 300) {
      throw new DuckMailApiError(
        response.status,
        "DownloadFailed",
        `无法下载资源：${response.status}`,
      );
    }

    return {
      status: response.status,
      headers: response.headers,
      body: response.body,
    };
  }
}
