import { CheckCircle2, ShieldAlert } from "lucide-react";

import {
  clearDuckMailProxyAction,
  rebuildAllCachesAction,
  resetDuckMailApiBaseUrlAction,
  syncAllDomainsAction,
  updateAdminPasswordAction,
  updateDuckMailApiBaseUrlAction,
  updateDuckMailProxyAction,
} from "@/app/actions";
import { ApiSettingsSection } from "@/components/dashboard/api-settings-section";
import { DashboardTopbar } from "@/components/dashboard/topbar";
import { SubmitButton } from "@/components/forms/submit-button";
import { Badge } from "@/components/ui/badge";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { env } from "@/lib/env";
import { formatText } from "@/lib/i18n";
import { prisma } from "@/lib/prisma";
import { getServerDictionary } from "@/lib/server-i18n";
import { appConfigService } from "@/lib/services/app-config-service";
import { formatDateTime } from "@/lib/utils";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string; error?: string }>;
}) {
  const [
    params,
    t,
    runtimeDuckMailApi,
    appConfig,
    proxyConfig,
    adminPasswordSource,
    mailboxCount,
    latestLogs,
  ] = await Promise.all([
    searchParams,
    getServerDictionary(),
    appConfigService.getDuckMailApiBaseUrl(),
    appConfigService.getConfig(),
    appConfigService.getDuckMailProxyConfig(),
    appConfigService.getAdminPasswordSource(),
    prisma.mailbox.count(),
    prisma.syncLog.findMany({
      orderBy: { startedAt: "desc" },
      take: 10,
    }),
  ]);

  const adminPasswordSourceLabel =
    adminPasswordSource === "database"
      ? t.adminPasswordSourceDatabase
      : adminPasswordSource === "env"
        ? t.adminPasswordSourceEnv
        : adminPasswordSource === "hash"
          ? t.adminPasswordSourceHash
          : t.adminPasswordSourceMissing;

  const healthChecks = [
    { label: t.database, value: env.DATABASE_URL, ok: true },
    { label: t.envDefaultApi, value: env.DUCKMAIL_API_BASE_URL, ok: true },
    { label: t.runtimeApi, value: runtimeDuckMailApi, ok: true },
    {
      label: t.overrideState,
      value: appConfig?.duckmailApiBaseUrl ? t.overrideEnabled : t.overrideDisabled,
      ok: true,
    },
    { label: t.adminAccount, value: env.ADMIN_USERNAME, ok: true },
    { label: t.adminPasswordSource, value: adminPasswordSourceLabel, ok: true },
    { label: t.defaultRelayToken, value: env.RELAY_API_TOKEN ? t.configuredOptional : t.notConfigured, ok: true },
    {
      label: t.sessionSecret,
      value: env.SESSION_SECRET ? t.dedicatedConfigured : t.reusingEncryptionKey,
      ok: true,
    },
  ];

  return (
    <main className="min-h-screen" style={{ backgroundColor: "var(--bg)" }}>
      <DashboardTopbar
        leftSlot={<div className="text-sm font-medium text-slate-500">{t.settings}</div>}
      />

      <section className="grid gap-6 px-5 pb-8 pt-4 sm:px-7">
        <Card>
          <CardTitle>{t.duckmailApiSettings}</CardTitle>
          <CardDescription className="mt-1">
            {t.duckmailApiSettingsDescription}
          </CardDescription>
          <div className="mt-6 grid gap-4 xl:grid-cols-[minmax(0,1fr)_auto_auto]">
            <form action={updateDuckMailApiBaseUrlAction} className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_auto]">
              <Input
                defaultValue={appConfig?.duckmailApiBaseUrl ?? runtimeDuckMailApi}
                name="duckmailApiBaseUrl"
                placeholder={env.DUCKMAIL_API_BASE_URL}
                required
              />
              <SubmitButton className="justify-center px-6" pendingText={t.savingAndSyncing}>
                {t.saveApiAddress}
              </SubmitButton>
            </form>
            <form action={resetDuckMailApiBaseUrlAction}>
              <SubmitButton className="w-full justify-center xl:w-auto" pendingText={t.processing} variant="secondary">
                {t.resetToEnvDefault}
              </SubmitButton>
            </form>
          </div>
        </Card>

        <Card>
          <CardTitle>{t.duckmailProxySettings}</CardTitle>
          <CardDescription className="mt-1">
            {t.duckmailProxySettingsDescription}
          </CardDescription>
          <div className="mt-6 grid gap-4 xl:grid-cols-[minmax(0,1fr)_auto]">
            <form action={updateDuckMailProxyAction} className="grid gap-4">
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <label className="grid gap-2 text-sm">
                  <span className="font-medium text-slate-900">{t.proxyEnabled}</span>
                  <select
                    className="flex h-11 w-full rounded-2xl border border-slate-200 bg-[#f8f8f9] px-4 text-sm outline-none focus:border-[#3867d6] focus:ring-2 focus:ring-[#dcd8ff]"
                    defaultValue={proxyConfig ? "true" : "false"}
                    name="duckmailProxyEnabled"
                  >
                    <option value="false">{t.disabled}</option>
                    <option value="true">{t.enabled}</option>
                  </select>
                </label>
                <label className="grid gap-2 text-sm">
                  <span className="font-medium text-slate-900">{t.proxyType}</span>
                  <select
                    className="flex h-11 w-full rounded-2xl border border-slate-200 bg-[#f8f8f9] px-4 text-sm outline-none focus:border-[#3867d6] focus:ring-2 focus:ring-[#dcd8ff]"
                    defaultValue={proxyConfig?.type ?? "http"}
                    name="duckmailProxyType"
                  >
                    <option value="http">HTTP</option>
                    <option value="https">HTTPS</option>
                    <option value="socks5">SOCKS5</option>
                  </select>
                </label>
                <label className="grid gap-2 text-sm md:col-span-2">
                  <span className="font-medium text-slate-900">{t.proxyHost}</span>
                  <Input
                    defaultValue={proxyConfig?.host ?? ""}
                    name="duckmailProxyHost"
                    placeholder="127.0.0.1"
                  />
                </label>
                <label className="grid gap-2 text-sm">
                  <span className="font-medium text-slate-900">{t.proxyPort}</span>
                  <Input
                    defaultValue={proxyConfig?.port?.toString() ?? ""}
                    name="duckmailProxyPort"
                    placeholder="7890"
                    type="number"
                  />
                </label>
                <label className="grid gap-2 text-sm">
                  <span className="font-medium text-slate-900">
                    {t.proxyUsername} <span className="text-slate-400">({t.optional})</span>
                  </span>
                  <Input
                    defaultValue={proxyConfig?.username ?? ""}
                    name="duckmailProxyUsername"
                    placeholder="proxy-user"
                  />
                </label>
                <label className="grid gap-2 text-sm md:col-span-2">
                  <span className="font-medium text-slate-900">
                    {t.proxyPassword} <span className="text-slate-400">({t.optional})</span>
                  </span>
                  <Input
                    defaultValue=""
                    name="duckmailProxyPassword"
                    placeholder={proxyConfig?.password ? t.keepExistingPassword : "proxy-password"}
                    type="password"
                  />
                </label>
              </div>
              <SubmitButton className="justify-center px-6 sm:w-fit" pendingText={t.processing}>
                {t.saveProxySettings}
              </SubmitButton>
            </form>
            <form action={clearDuckMailProxyAction}>
              <SubmitButton className="w-full justify-center xl:w-auto" pendingText={t.processing} variant="secondary">
                {t.clearProxySettings}
              </SubmitButton>
            </form>
          </div>
        </Card>

        <Card>
          <CardTitle>{t.adminSecuritySettings}</CardTitle>
          <CardDescription className="mt-1">
            {t.adminSecuritySettingsDescription}
          </CardDescription>
          <form action={updateAdminPasswordAction} className="mt-6 grid gap-4 md:grid-cols-3">
            <label className="grid gap-2 text-sm">
              <span className="font-medium text-slate-900">{t.currentPasswordLabel}</span>
              <Input name="currentPassword" required type="password" />
            </label>
            <label className="grid gap-2 text-sm">
              <span className="font-medium text-slate-900">{t.newPasswordLabel}</span>
              <Input minLength={8} name="nextPassword" required type="password" />
            </label>
            <label className="grid gap-2 text-sm">
              <span className="font-medium text-slate-900">{t.confirmPasswordLabel}</span>
              <Input minLength={8} name="confirmPassword" required type="password" />
            </label>
            <div className="md:col-span-3">
              <SubmitButton className="justify-center px-6" pendingText={t.processing}>
                {t.updateAdminPassword}
              </SubmitButton>
            </div>
          </form>
        </Card>

        <ApiSettingsSection success={params.success} error={params.error} />

        <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
          <Card>
            <CardTitle>{t.environmentChecks}</CardTitle>
            <CardDescription className="mt-1">{t.serverEnvDescription}</CardDescription>
            <div className="mt-6 space-y-4">
              {healthChecks.map((item) => (
                <div
                  className="flex items-start justify-between gap-4 rounded-2xl border border-slate-200 bg-white/60 p-4"
                  key={item.label}
                >
                  <div>
                    <div className="text-sm font-medium text-slate-900">{item.label}</div>
                    <div className="mt-1 break-all text-sm text-slate-500">{item.value}</div>
                  </div>
                  <Badge variant={item.ok ? "success" : "destructive"}>
                    {item.ok ? t.healthy : "Error"}
                  </Badge>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <CardTitle>{t.cacheMaintenance}</CardTitle>
            <CardDescription className="mt-1">
              {t.cacheMaintenanceDescription}
            </CardDescription>
            <div className="mt-6 grid gap-4">
              <form action={syncAllDomainsAction}>
                <SubmitButton className="w-full justify-center" pendingText={t.syncing} variant="outline">
                  {t.syncAllDomains}
                </SubmitButton>
              </form>
              <form action={rebuildAllCachesAction}>
                <SubmitButton className="w-full justify-center" pendingText={t.rebuilding} variant="secondary">
                  {t.rebuildAllCaches}
                </SubmitButton>
              </form>
            </div>

            <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50/70 p-4 text-sm text-slate-500">
              {formatText(t.hostedMailboxCountHint, { count: mailboxCount })}
            </div>
          </Card>
        </div>

        <Card>
          <CardTitle>{t.recentSyncLogs}</CardTitle>
          <CardDescription className="mt-1">{t.recentSyncLogsDescription}</CardDescription>
          <div className="mt-6 space-y-4">
            {latestLogs.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 p-6 text-sm text-slate-500">
                {t.noSyncLogs}
              </div>
            ) : (
              latestLogs.map((log) => (
                <div
                  className="flex items-start justify-between gap-4 rounded-2xl border border-slate-200 bg-white/60 p-4"
                  key={log.id}
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-slate-900">{log.action}</span>
                      <Badge variant={log.success ? "success" : "destructive"}>
                        {log.targetType}
                      </Badge>
                    </div>
                    <div className="mt-1 text-sm text-slate-500">
                      {formatDateTime(log.startedAt)}
                    </div>
                    {log.errorMessage ? (
                      <div className="mt-2 text-sm text-red-600">{log.errorMessage}</div>
                    ) : null}
                  </div>
                  {log.success ? (
                    <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                  ) : (
                    <ShieldAlert className="h-5 w-5 text-red-500" />
                  )}
                </div>
              ))
            )}
          </div>
        </Card>
      </section>
    </main>
  );
}
