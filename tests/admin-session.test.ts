import { verifyAdminPassword } from "@/lib/auth";

describe("Admin auth", () => {
  it("accepts the configured admin password", async () => {
    await expect(verifyAdminPassword("admin123456")).resolves.toBe(true);
  });

  it("rejects wrong password", async () => {
    await expect(verifyAdminPassword("wrong-password")).resolves.toBe(false);
  });
});
