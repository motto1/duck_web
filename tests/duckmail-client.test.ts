import { DuckMailApiError, DuckMailClient } from "@/lib/duckmail/client";
import { duckMailTransport } from "@/lib/duckmail/transport";
import { appConfigService } from "@/lib/services/app-config-service";

vi.mock("@/lib/duckmail/transport", () => ({
  duckMailTransport: {
    request: vi.fn(),
  },
}));

vi.mock("@/lib/services/app-config-service", () => ({
  appConfigService: {
    getDuckMailApiBaseUrl: vi.fn().mockResolvedValue("https://api.duckmail.sbs"),
    getDuckMailProxyConfig: vi.fn().mockResolvedValue(null),
  },
}));

describe("DuckMailClient", () => {
  afterEach(() => {
    vi.clearAllMocks();
    vi.mocked(appConfigService.getDuckMailApiBaseUrl).mockResolvedValue("https://api.duckmail.sbs");
    vi.mocked(appConfigService.getDuckMailProxyConfig).mockResolvedValue(null);
  });

  it("maps successful responses", async () => {
    vi.mocked(duckMailTransport.request).mockResolvedValue({
      status: 200,
      headers: new Headers({ "content-type": "application/json" }),
      body: Buffer.from(JSON.stringify({ id: "1", token: "abc" })),
    });

    const result = await DuckMailClient.unauthenticated().createToken({
      address: "a@b.com",
      password: "secret123",
    });

    expect(result.token).toBe("abc");
    expect(duckMailTransport.request).toHaveBeenCalledTimes(1);
  });

  it("maps upstream errors", async () => {
    vi.mocked(duckMailTransport.request).mockResolvedValue({
      status: 401,
      headers: new Headers({ "content-type": "application/json" }),
      body: Buffer.from(
        JSON.stringify({
          error: "Unauthorized",
          message: "Authorization header is required",
        }),
      ),
    });

    await expect(DuckMailClient.unauthenticated().getMe()).rejects.toEqual(
      expect.objectContaining({
        status: 401,
        errorType: "Unauthorized",
      }),
    );
  });

  it("passes proxy config into the transport layer", async () => {
    vi.mocked(appConfigService.getDuckMailProxyConfig).mockResolvedValue({
      enabled: true,
      type: "socks5",
      host: "127.0.0.1",
      port: 7890,
      username: "proxy-user",
      password: "proxy-pass",
      source: "database",
    });
    vi.mocked(duckMailTransport.request).mockResolvedValue({
      status: 200,
      headers: new Headers({ "content-type": "application/json" }),
      body: Buffer.from(JSON.stringify({ id: "1", token: "abc" })),
    });

    await DuckMailClient.unauthenticated().createToken({
      address: "a@b.com",
      password: "secret123",
    });

    expect(duckMailTransport.request).toHaveBeenCalledWith(
      expect.any(URL),
      expect.objectContaining({
        proxy: expect.objectContaining({
          type: "socks5",
          host: "127.0.0.1",
          port: 7890,
        }),
      }),
    );
  });
});
