"use server";

import { MailboxStatus, Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { adminSessionService } from "@/lib/services/admin-session-service";
import { verifyAdminPassword } from "@/lib/auth";
import { domainSyncService } from "@/lib/services/domain-sync-service";
import { DuckMailClient } from "@/lib/duckmail/client";
import { env } from "@/lib/env";
import { prisma } from "@/lib/prisma";
import { getRequestBasePath, withRequestBasePath } from "@/lib/request-base-path";
import { fingerprintString } from "@/lib/crypto";
import { mailboxSyncService } from "@/lib/services/mailbox-sync-service";
import { mailboxPersistenceService } from "@/lib/services/mailbox-persistence-service";
import { secretsService } from "@/lib/services/secrets-service";
import { appConfigService } from "@/lib/services/app-config-service";
import { withStatusMessage } from "@/lib/utils";

function getString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function isMissingConfigTableError(error: unknown) {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    (error.code === "P2021" || error.code === "P2022")
  );
}

async function requireAdmin() {
  const session = await adminSessionService.getSession();
  if (!session) {
    redirect(await withRequestBasePath("/login"));
  }

  return session;
}

export async function loginAction(formData: FormData) {
  const basePath = await getRequestBasePath();
  const username = getString(formData, "username");
  const password = getString(formData, "password");

  if (username !== env.ADMIN_USERNAME) {
    redirect(withStatusMessage("/login", "error", "管理员用户名不正确", basePath));
  }

  const success = await adminSessionService.login(password);
  if (!success) {
    redirect(withStatusMessage("/login", "error", "管理员密码不正确", basePath));
  }

  redirect(withStatusMessage("/dashboard", "success", "登录成功", basePath));
}

export async function logoutAction() {
  const basePath = await getRequestBasePath();
  await adminSessionService.logout();
  redirect(withStatusMessage("/login", "success", "已安全退出", basePath));
}

export async function createApiKeyAction(formData: FormData) {
  await requireAdmin();
  const basePath = await getRequestBasePath();

  const name = getString(formData, "name");
  const note = getString(formData, "note");
  const key = getString(formData, "key");

  if (!name || !key.startsWith("dk_")) {
    redirect(withStatusMessage("/dashboard/settings", "error", "请输入有效的 dk_ API Key", basePath));
  }

  const record = await prisma.apiKey.create({
    data: {
      name,
      note: note || null,
      encryptedKey: secretsService.encrypt(key),
    },
  });

  const result = await domainSyncService.syncApiKey(record.id);
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/api-keys");
  revalidatePath("/dashboard/mailboxes");

  redirect(
    withStatusMessage(
      "/dashboard/settings",
      result.success ? "success" : "error",
      result.message,
      basePath,
    ),
  );
}

export async function toggleApiKeyAction(formData: FormData) {
  await requireAdmin();
  const basePath = await getRequestBasePath();
  const id = getString(formData, "id");

  const apiKey = await prisma.apiKey.findUnique({ where: { id } });
  if (!apiKey) {
    redirect(withStatusMessage("/dashboard/settings", "error", "API Key 不存在", basePath));
  }

  await prisma.apiKey.update({
    where: { id },
    data: {
      isEnabled: !apiKey.isEnabled,
    },
  });

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/api-keys");
  redirect(
    withStatusMessage(
      "/dashboard/settings",
      "success",
      apiKey.isEnabled ? "已停用 API Key" : "已启用 API Key",
      basePath,
    ),
  );
}

export async function deleteApiKeyAction(formData: FormData) {
  await requireAdmin();
  const basePath = await getRequestBasePath();
  const id = getString(formData, "id");

  await prisma.apiKey.delete({
    where: { id },
  });

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/api-keys");
  revalidatePath("/dashboard/mailboxes");
  redirect(withStatusMessage("/dashboard/settings", "success", "API Key 已删除", basePath));
}

export async function syncApiKeyDomainsAction(formData: FormData) {
  await requireAdmin();
  const basePath = await getRequestBasePath();
  const id = getString(formData, "id");

  const result = await domainSyncService.syncApiKey(id);
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/api-keys");
  revalidatePath("/dashboard/mailboxes");

  redirect(
    withStatusMessage(
      "/dashboard/settings",
      result.success ? "success" : "error",
      result.message,
      basePath,
    ),
  );
}

export async function toggleRelayDomainAction(formData: FormData) {
  await requireAdmin();
  const basePath = await getRequestBasePath();
  const id = getString(formData, "id");

  const domain = await prisma.domainCache.findUnique({
    where: { id },
  });

  if (!domain) {
    redirect(withStatusMessage("/dashboard/settings", "error", "域名不存在", basePath));
  }

  await prisma.domainCache.update({
    where: { id },
    data: {
      isEnabledForRelay: !domain.isEnabledForRelay,
    },
  });

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/settings");
  redirect(
    withStatusMessage(
      "/dashboard/settings",
      "success",
      domain.isEnabledForRelay ? "已关闭该域名的 API 中继" : "已启用该域名的 API 中继",
      basePath,
    ),
  );
}

export async function createRelayClientAction(formData: FormData) {
  await requireAdmin();
  const basePath = await getRequestBasePath();
  const name = getString(formData, "name");
  const token = getString(formData, "token");
  const note = getString(formData, "note");

  if (!name || token.length < 8) {
    redirect(withStatusMessage("/dashboard/settings", "error", "请输入有效的中继 Token", basePath));
  }

  const tokenFingerprint = fingerprintString(token);
  const existing = await prisma.relayClient.findUnique({
    where: { tokenFingerprint },
    select: { id: true },
  });

  if (existing) {
    redirect(withStatusMessage("/dashboard/settings", "error", "该中继 Token 已存在", basePath));
  }

  await prisma.relayClient.create({
    data: {
      name,
      note: note || null,
      encryptedToken: secretsService.encrypt(token),
      tokenFingerprint,
    },
  });

  revalidatePath("/dashboard/settings");
  redirect(withStatusMessage("/dashboard/settings", "success", "中继配置已创建", basePath));
}

export async function toggleRelayClientAction(formData: FormData) {
  await requireAdmin();
  const basePath = await getRequestBasePath();
  const id = getString(formData, "id");

  const relayClient = await prisma.relayClient.findUnique({
    where: { id },
  });

  if (!relayClient) {
    redirect(withStatusMessage("/dashboard/settings", "error", "中继配置不存在", basePath));
  }

  await prisma.relayClient.update({
    where: { id },
    data: {
      isEnabled: !relayClient.isEnabled,
    },
  });

  revalidatePath("/dashboard/settings");
  redirect(
    withStatusMessage(
      "/dashboard/settings",
      "success",
      relayClient.isEnabled ? "已停用中继配置" : "已启用中继配置",
      basePath,
    ),
  );
}

export async function deleteRelayClientAction(formData: FormData) {
  await requireAdmin();
  const basePath = await getRequestBasePath();
  const id = getString(formData, "id");

  await prisma.relayClient.delete({
    where: { id },
  });

  revalidatePath("/dashboard/settings");
  redirect(withStatusMessage("/dashboard/settings", "success", "中继配置已删除", basePath));
}

export async function updateDuckMailApiBaseUrlAction(formData: FormData) {
  await requireAdmin();
  const basePath = await getRequestBasePath();
  const url = getString(formData, "duckmailApiBaseUrl");

  try {
    const parsed = new URL(url);
    try {
      await appConfigService.updateDuckMailApiBaseUrl(parsed.toString().replace(/\/$/, ""));
    } catch (error) {
      if (isMissingConfigTableError(error)) {
        redirect(withStatusMessage("/dashboard/settings", "error", "请先运行 npm run db:push 同步数据库结构", basePath));
      }

      throw error;
    }
  } catch {
    redirect(withStatusMessage("/dashboard/settings", "error", "请输入有效的 DuckMail API 地址", basePath));
  }

  revalidatePath("/dashboard/settings");
  redirect(withStatusMessage("/dashboard/settings", "success", "DuckMail API 地址已更新", basePath));
}

export async function resetDuckMailApiBaseUrlAction() {
  await requireAdmin();
  const basePath = await getRequestBasePath();

  try {
    await appConfigService.resetDuckMailApiBaseUrl();
  } catch (error) {
    if (isMissingConfigTableError(error)) {
      redirect(withStatusMessage("/dashboard/settings", "error", "请先运行 npm run db:push 同步数据库结构", basePath));
    }

    throw error;
  }

  revalidatePath("/dashboard/settings");
  redirect(withStatusMessage("/dashboard/settings", "success", "已恢复环境变量中的 DuckMail API 地址", basePath));
}

export async function updateDuckMailProxyAction(formData: FormData) {
  await requireAdmin();
  const basePath = await getRequestBasePath();
  const enabled = getString(formData, "duckmailProxyEnabled") === "true";
  const type = getString(formData, "duckmailProxyType");
  const host = getString(formData, "duckmailProxyHost");
  const portValue = getString(formData, "duckmailProxyPort");
  const username = getString(formData, "duckmailProxyUsername");
  const password = getString(formData, "duckmailProxyPassword");
  const port = Number.parseInt(portValue, 10);

  if (!["http", "https", "socks5"].includes(type)) {
    redirect(withStatusMessage("/dashboard/settings", "error", "请选择有效的代理协议", basePath));
  }

  if (enabled && (!host || !Number.isInteger(port) || port <= 0)) {
    redirect(withStatusMessage("/dashboard/settings", "error", "启用代理时必须填写有效的主机和端口", basePath));
  }

  try {
    await appConfigService.updateDuckMailProxyConfig({
      enabled,
      type: type as "http" | "https" | "socks5",
      host,
      port: Number.isInteger(port) && port > 0 ? port : 0,
      username: username || null,
      password: password ? password : undefined,
    });
  } catch (error) {
    if (isMissingConfigTableError(error)) {
      redirect(withStatusMessage("/dashboard/settings", "error", "请先运行 npm run db:push 同步数据库结构", basePath));
    }

    throw error;
  }

  revalidatePath("/dashboard/settings");
  redirect(withStatusMessage("/dashboard/settings", "success", "DuckMail 代理配置已更新", basePath));
}

export async function clearDuckMailProxyAction() {
  await requireAdmin();
  const basePath = await getRequestBasePath();

  try {
    await appConfigService.clearDuckMailProxyConfig();
  } catch (error) {
    if (isMissingConfigTableError(error)) {
      redirect(withStatusMessage("/dashboard/settings", "error", "请先运行 npm run db:push 同步数据库结构", basePath));
    }

    throw error;
  }

  revalidatePath("/dashboard/settings");
  redirect(withStatusMessage("/dashboard/settings", "success", "DuckMail 代理配置已清除", basePath));
}

export async function updateAdminPasswordAction(formData: FormData) {
  await requireAdmin();
  const basePath = await getRequestBasePath();
  const currentPassword = getString(formData, "currentPassword");
  const nextPassword = getString(formData, "nextPassword");
  const confirmPassword = getString(formData, "confirmPassword");

  if (!(await verifyAdminPassword(currentPassword))) {
    redirect(withStatusMessage("/dashboard/settings", "error", "当前管理员密码不正确", basePath));
  }

  if (nextPassword.length < 8) {
    redirect(withStatusMessage("/dashboard/settings", "error", "新密码至少需要 8 位", basePath));
  }

  if (nextPassword !== confirmPassword) {
    redirect(withStatusMessage("/dashboard/settings", "error", "两次输入的新密码不一致", basePath));
  }

  try {
    await appConfigService.updateAdminPassword(nextPassword);
  } catch (error) {
    if (isMissingConfigTableError(error)) {
      redirect(withStatusMessage("/dashboard/settings", "error", "请先运行 npm run db:push 同步数据库结构", basePath));
    }

    throw error;
  }

  revalidatePath("/dashboard/settings");
  redirect(withStatusMessage("/dashboard/settings", "success", "管理员密码已更新", basePath));
}

export async function toggleFavoriteMailboxAction(formData: FormData) {
  await requireAdmin();
  const basePath = await getRequestBasePath();
  const id = getString(formData, "id");
  const redirectTo = getString(formData, "redirectTo");

  const mailbox = await prisma.mailbox.findUnique({
    where: { id },
    select: {
      id: true,
      isFavorite: true,
    },
  });

  if (!mailbox) {
    redirect(withStatusMessage("/dashboard/mailboxes", "error", "邮箱不存在", basePath));
  }

  await prisma.mailbox.update({
    where: { id },
    data: {
      isFavorite: !mailbox.isFavorite,
    },
  });

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/mailboxes");
  revalidatePath(`/dashboard/mailboxes/${id}`);
  revalidatePath("/dashboard/settings");

  redirect(
    withStatusMessage(
      redirectTo || `/dashboard/mailboxes/${id}`,
      "success",
      mailbox.isFavorite ? "已取消收藏邮箱" : "已收藏邮箱",
      basePath,
    ),
  );
}

export async function createMailboxAction(formData: FormData) {
  await requireAdmin();
  const basePath = await getRequestBasePath();

  const domainCacheId = getString(formData, "domainCacheId");
  const localPart = getString(formData, "localPart");
  const password = getString(formData, "password");

  if (localPart.length < 3 || password.length < 6) {
    redirect(
      withStatusMessage(
        "/dashboard/mailboxes",
        "error",
        "用户名至少 3 位，密码至少 6 位",
        basePath,
      ),
    );
  }

  const selectedDomain = await prisma.domainCache.findUnique({
    where: { id: domainCacheId },
    include: { apiKey: true },
  });

  if (!selectedDomain) {
    redirect(withStatusMessage("/dashboard/mailboxes", "error", "请选择有效域名", basePath));
  }

  if (!selectedDomain.isPrivate) {
    redirect(
      withStatusMessage(
        "/dashboard/mailboxes",
        "error",
        "系统域名不支持直接创建邮箱，请使用私有域名",
        basePath,
      ),
    );
  }

  const address = `${localPart}@${selectedDomain.domain}`;
  const apiKeyValue = selectedDomain.apiKey
    ? secretsService.decrypt(selectedDomain.apiKey.encryptedKey)
    : null;
  const client = apiKeyValue
    ? DuckMailClient.withApiKey(apiKeyValue)
    : DuckMailClient.unauthenticated();

  const account = await client.createAccount({
    address,
    password,
  });

  const tokenResponse = await DuckMailClient.unauthenticated().createToken({
    address,
    password,
  });

  const mailbox = await mailboxPersistenceService.persistCreatedMailbox({
    account,
    password,
    token: tokenResponse.token,
  });

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/mailboxes");
  redirect(
    withStatusMessage(
      `/dashboard/mailboxes/${mailbox.id}`,
      "success",
      "邮箱已创建并加入管理面板",
      basePath,
    ),
  );
}

export async function joinMailboxWithPasswordAction(formData: FormData) {
  await requireAdmin();
  const basePath = await getRequestBasePath();

  const address = getString(formData, "address");
  const password = getString(formData, "password");
  const displayName = getString(formData, "displayName");

  const tokenResponse = await DuckMailClient.unauthenticated().createToken({
    address,
    password,
  });

  const me = await DuckMailClient.withToken(tokenResponse.token).getMe();
  const mailbox = await mailboxPersistenceService.persistPasswordMailbox({
    account: me,
    password,
    token: tokenResponse.token,
    displayName: displayName || null,
  });

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/mailboxes");
  redirect(
    withStatusMessage(
      `/dashboard/mailboxes/${mailbox.id}`,
      "success",
      "邮箱已通过密码加入管理面板",
      basePath,
    ),
  );
}

export async function joinMailboxWithTokenAction(formData: FormData) {
  await requireAdmin();
  const basePath = await getRequestBasePath();

  const token = getString(formData, "token");
  const displayName = getString(formData, "displayName");
  if (!token) {
    redirect(withStatusMessage("/dashboard/mailboxes", "error", "请输入 Bearer Token", basePath));
  }

  const me = await DuckMailClient.withToken(token).getMe();
  const mailbox = await mailboxPersistenceService.persistTokenMailbox({
    account: me,
    token,
    displayName: displayName || null,
  });

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/mailboxes");
  redirect(
    withStatusMessage(
      `/dashboard/mailboxes/${mailbox.id}`,
      "success",
      "邮箱已通过 Token 加入管理面板",
      basePath,
    ),
  );
}

export async function removeLocalMailboxAction(formData: FormData) {
  await requireAdmin();
  const basePath = await getRequestBasePath();
  const id = getString(formData, "id");

  await prisma.mailbox.delete({
    where: { id },
  });

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/mailboxes");
  redirect(withStatusMessage("/dashboard/mailboxes", "success", "邮箱已从本地管理中移除", basePath));
}

export async function deleteRemoteMailboxAction(formData: FormData) {
  await requireAdmin();
  const basePath = await getRequestBasePath();
  const id = getString(formData, "id");
  const confirmAddress = getString(formData, "confirmAddress");

  const mailbox = await prisma.mailbox.findUnique({
    where: { id },
  });

  if (!mailbox) {
    redirect(withStatusMessage("/dashboard/mailboxes", "error", "邮箱不存在", basePath));
  }

  if (confirmAddress !== mailbox.address) {
    redirect(
      withStatusMessage(
        `/dashboard/mailboxes/${mailbox.id}`,
        "error",
        "请输入完整邮箱地址进行远程删除确认",
        basePath,
      ),
    );
  }

  const token = await mailboxSyncService.getDecryptedToken(mailbox.id);
  await DuckMailClient.withToken(token).deleteAccount(mailbox.accountId);

  await prisma.mailbox.update({
    where: { id: mailbox.id },
    data: {
      status: MailboxStatus.REMOTE_DELETED,
      lastError: null,
    },
  });

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/mailboxes");
  revalidatePath(`/dashboard/mailboxes/${mailbox.id}`);
  redirect(withStatusMessage("/dashboard/mailboxes", "success", "已远程删除 DuckMail 邮箱", basePath));
}

export async function refreshMailboxAction(formData: FormData) {
  await requireAdmin();
  const basePath = await getRequestBasePath();
  const id = getString(formData, "id");

  const result = await mailboxSyncService.syncMailbox(id);
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/mailboxes");
  revalidatePath(`/dashboard/mailboxes/${id}`);

  redirect(
    withStatusMessage(
      `/dashboard/mailboxes/${id}`,
      result.success ? "success" : "error",
      result.message,
      basePath,
    ),
  );
}

export async function rebuildMailboxCacheAction(formData: FormData) {
  await requireAdmin();
  const basePath = await getRequestBasePath();
  const id = getString(formData, "id");

  const result = await mailboxSyncService.syncMailbox(id, { rebuild: true });
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/mailboxes");
  revalidatePath(`/dashboard/mailboxes/${id}`);

  redirect(
    withStatusMessage(
      `/dashboard/mailboxes/${id}`,
      result.success ? "success" : "error",
      result.message,
      basePath,
    ),
  );
}

export async function markMessageSeenAction(formData: FormData) {
  await requireAdmin();
  const basePath = await getRequestBasePath();
  const mailboxId = getString(formData, "mailboxId");
  const messageId = getString(formData, "messageId");

  await mailboxSyncService.markMessageSeen(mailboxId, messageId);
  revalidatePath(`/dashboard/mailboxes/${mailboxId}`);
  revalidatePath(`/dashboard/mailboxes/${mailboxId}/messages/${messageId}`);

  redirect(
    withStatusMessage(
      `/dashboard/mailboxes/${mailboxId}/messages/${messageId}`,
      "success",
      "邮件已标记为已读",
      basePath,
    ),
  );
}

export async function deleteMessageAction(formData: FormData) {
  await requireAdmin();
  const basePath = await getRequestBasePath();
  const mailboxId = getString(formData, "mailboxId");
  const messageId = getString(formData, "messageId");

  await mailboxSyncService.deleteMessage(mailboxId, messageId);
  revalidatePath(`/dashboard/mailboxes/${mailboxId}`);
  redirect(withStatusMessage(`/dashboard/mailboxes/${mailboxId}`, "success", "邮件已删除", basePath));
}

export async function rebuildAllCachesAction() {
  await requireAdmin();
  const basePath = await getRequestBasePath();
  const results = await mailboxSyncService.syncAllMailboxes({ rebuild: true });
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/mailboxes");
  revalidatePath("/dashboard/settings");

  const failed = results.filter((item) => !item.success).length;
  redirect(
    withStatusMessage(
      "/dashboard/settings",
      failed > 0 ? "error" : "success",
      failed > 0
        ? `缓存重建完成，但有 ${failed} 个邮箱失败`
        : "所有邮箱缓存已重建",
      basePath,
    ),
  );
}

export async function syncAllDomainsAction() {
  await requireAdmin();
  const basePath = await getRequestBasePath();
  const results = await domainSyncService.syncAllEnabledKeys();
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/api-keys");
  revalidatePath("/dashboard/settings");

  const failed = results.filter((item) => !item.success).length;
  redirect(
    withStatusMessage(
      "/dashboard/settings",
      failed > 0 ? "error" : "success",
      failed > 0 ? `域名同步完成，但有 ${failed} 个 Key 失败` : "已同步全部启用中的域名",
      basePath,
    ),
  );
}
