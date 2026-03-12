import {
  clearAdminSession,
  getAdminSession,
  persistAdminSession,
  verifyAdminPassword,
} from "@/lib/auth";

export class AdminSessionService {
  async login(password: string) {
    const isValid = await verifyAdminPassword(password);
    if (!isValid) {
      return false;
    }

    await persistAdminSession();
    return true;
  }

  async logout() {
    await clearAdminSession();
  }

  async getSession() {
    return getAdminSession();
  }
}

export const adminSessionService = new AdminSessionService();
