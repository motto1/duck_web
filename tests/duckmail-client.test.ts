import { DuckMailApiError, DuckMailClient } from "@/lib/duckmail/client";

describe("DuckMailClient", () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("maps successful responses", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      text: vi.fn().mockResolvedValue(JSON.stringify({ id: "1", token: "abc" })),
    });

    const result = await DuckMailClient.unauthenticated().createToken({
      address: "a@b.com",
      password: "secret123",
    });

    expect(result.token).toBe("abc");
  });

  it("maps upstream errors", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      text: vi.fn().mockResolvedValue(
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
});
