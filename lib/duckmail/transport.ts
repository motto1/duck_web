import * as http from "node:http";
import * as https from "node:https";

import { HttpProxyAgent } from "http-proxy-agent";
import { HttpsProxyAgent } from "https-proxy-agent";
import { SocksProxyAgent } from "socks-proxy-agent";

import type { DuckMailProxyConfig } from "@/lib/services/app-config-service";

type DuckMailTransportRequest = {
  method?: string;
  headers?: Record<string, string>;
  body?: string | Uint8Array;
  timeoutMs?: number;
  proxy?: DuckMailProxyConfig | null;
};

export type DuckMailTransportResponse = {
  status: number;
  headers: Headers;
  body: Uint8Array;
};

function toHeaders(
  headers: http.IncomingHttpHeaders | http.OutgoingHttpHeaders,
) {
  const nextHeaders = new Headers();

  for (const [key, value] of Object.entries(headers)) {
    if (value === undefined) {
      continue;
    }

    if (Array.isArray(value)) {
      nextHeaders.set(key, value.join(", "));
      continue;
    }

    nextHeaders.set(key, String(value));
  }

  return nextHeaders;
}

function buildProxyUrl(proxy: DuckMailProxyConfig | null | undefined) {
  if (!proxy?.enabled) {
    return null;
  }

  const credentials = proxy.username
    ? `${encodeURIComponent(proxy.username)}:${encodeURIComponent(proxy.password ?? "")}@`
    : "";

  return `${proxy.type}://${credentials}${proxy.host}:${proxy.port}`;
}

function createProxyAgent(
  targetUrl: URL,
  proxy: DuckMailProxyConfig | null | undefined,
) {
  const proxyUrl = buildProxyUrl(proxy);

  if (!proxyUrl) {
    return undefined;
  }

  if (proxy?.type === "socks5") {
    return new SocksProxyAgent(proxyUrl);
  }

  return targetUrl.protocol === "https:"
    ? new HttpsProxyAgent(proxyUrl)
    : new HttpProxyAgent(proxyUrl);
}

export class DuckMailTransport {
  async request(
    input: URL | string,
    options: DuckMailTransportRequest = {},
  ): Promise<DuckMailTransportResponse> {
    const url = typeof input === "string" ? new URL(input) : input;
    const client = url.protocol === "https:" ? https : http;
    const agent = createProxyAgent(url, options.proxy);

    return new Promise((resolve, reject) => {
      const request = client.request(
        url,
        {
          method: options.method ?? "GET",
          headers: options.headers,
          agent,
        },
        (response) => {
          const chunks: Buffer[] = [];

          response.on("data", (chunk) => {
            chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
          });
          response.on("end", () => {
            resolve({
              status: response.statusCode ?? 500,
              headers: toHeaders(response.headers),
              body: Buffer.concat(chunks),
            });
          });
          response.on("error", reject);
        },
      );

      request.on("error", reject);
      request.setTimeout(options.timeoutMs ?? 10000, () => {
        request.destroy(new Error("DuckMail request timed out"));
      });

      if (options.body) {
        request.write(options.body);
      }

      request.end();
    });
  }
}

export const duckMailTransport = new DuckMailTransport();
