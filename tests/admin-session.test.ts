import { verifyAdminPassword } from "@/lib/auth";
import { appConfigService } from "@/lib/services/app-config-service";

vi.mock("@/lib/services/app-config-service", () => ({
  appConfigService: {
    getAdminPassword: vi.fn().mockResolvedValue("admin123456"),
  },
}));

describe("Admin auth", () => {
  afterEach(() => {
    vi.clearAllMocks();
    vi.mocked(appConfigService.getAdminPassword).mockResolvedValue("admin123456");
  });

  it("accepts the configured admin password", async () => {
    await expect(verifyAdminPassword("admin123456")).resolves.toBe(true);
  });

  it("rejects wrong password", async () => {
    await expect(verifyAdminPassword("wrong-password")).resolves.toBe(false);
  });
});
