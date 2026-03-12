import {
  getCookiePath,
  normalizeBasePath,
  withBasePath,
  withStatusMessage,
} from "@/lib/utils";

describe("base-path utils", () => {
  it("normalizes forwarded prefixes", () => {
    expect(normalizeBasePath(null)).toBe("");
    expect(normalizeBasePath("/")).toBe("");
    expect(normalizeBasePath("upsnap-sub-path")).toBe("/upsnap-sub-path");
    expect(normalizeBasePath("/upsnap-sub-path/")).toBe("/upsnap-sub-path");
    expect(normalizeBasePath("//upsnap-sub-path//nested/")).toBe("/upsnap-sub-path/nested");
  });

  it("prefixes app paths at runtime", () => {
    expect(withBasePath("/dashboard", "")).toBe("/dashboard");
    expect(withBasePath("/dashboard", "/upsnap-sub-path")).toBe(
      "/upsnap-sub-path/dashboard",
    );
    expect(withBasePath("/", "/upsnap-sub-path")).toBe("/upsnap-sub-path");
  });

  it("builds status-message urls under a sub-path", () => {
    expect(
      withStatusMessage("/dashboard/settings", "success", "ok", "/upsnap-sub-path"),
    ).toBe("/upsnap-sub-path/dashboard/settings?success=ok");
  });

  it("derives cookie path from the runtime prefix", () => {
    expect(getCookiePath("")).toBe("/");
    expect(getCookiePath("/upsnap-sub-path")).toBe("/upsnap-sub-path");
  });
});
