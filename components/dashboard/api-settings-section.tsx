import { FlashMessage } from "@/components/flash-message";
import { RevealRelayToken } from "@/components/dashboard/reveal-relay-token";
import { SubmitButton } from "@/components/forms/submit-button";
import { Badge } from "@/components/ui/badge";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableWrapper, TD, TH } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import {
  createApiKeyAction,
  createRelayClientAction,
  deleteApiKeyAction,
  deleteRelayClientAction,
  syncApiKeyDomainsAction,
  toggleRelayClientAction,
  toggleRelayDomainAction,
  toggleApiKeyAction,
} from "@/app/actions";
import { getServerDictionary } from "@/lib/server-i18n";
import { prisma } from "@/lib/prisma";
import { secretsService } from "@/lib/services/secrets-service";
import { formatDateTime, maskSecret } from "@/lib/utils";

export async function ApiSettingsSection({
  success,
  error,
}: {
  success?: string;
  error?: string;
}) {
  const [t, keys, domains, relayClients] = await Promise.all([
    getServerDictionary(),
    prisma.apiKey.findMany({
      include: {
        domains: true,
      },
      orderBy: [{ isEnabled: "desc" }, { createdAt: "desc" }],
    }),
    prisma.domainCache.findMany({
      include: {
        apiKey: true,
      },
      orderBy: [{ isPrivate: "desc" }, { domain: "asc" }],
    }),
    prisma.relayClient.findMany({
      orderBy: [{ isEnabled: "desc" }, { createdAt: "desc" }],
    }),
  ]);

  const maskedKeys = new Map(
    keys.map((key) => [key.id, maskSecret(secretsService.decrypt(key.encryptedKey))]),
  );

  return (
    <>
      <FlashMessage success={success} error={error} />

      <section className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <Card>
          <CardTitle>{t.apiSettings}</CardTitle>
          <CardDescription className="mt-1">
            {t.apiSettingsDescription}
          </CardDescription>
          <form action={createApiKeyAction} className="mt-6 space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700" htmlFor="name">
                {t.name}
              </label>
              <Input id="name" name="name" placeholder="主生产 Key" required />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700" htmlFor="key">
                {t.duckmailKey}
              </label>
              <Input id="key" name="key" placeholder="dk_xxxxx" required />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700" htmlFor="note">
                {t.note}
              </label>
              <Textarea id="note" name="note" placeholder="这个 Key 来自哪个站点或用途" />
            </div>
            <SubmitButton pendingText={t.savingAndSyncing} className="w-full">
              {t.saveAndSyncDomains}
            </SubmitButton>
          </form>
        </Card>

        <Card>
          <CardTitle>{t.savedApiKeys}</CardTitle>
          <CardDescription className="mt-1">
            {t.savedApiKeysDescription}
          </CardDescription>
          <div className="mt-6 space-y-4">
            {keys.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 p-6 text-sm text-slate-500">
                {t.noApiKeys}
              </div>
            ) : (
              keys.map((key) => (
                <div className="rounded-2xl border border-slate-200 bg-white/60 p-4" key={key.id}>
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-3">
                        <h3 className="text-base font-semibold text-slate-950">{key.name}</h3>
                        <Badge variant={key.isEnabled ? "success" : "muted"}>
                          {key.isEnabled ? t.enabled : t.disabled}
                        </Badge>
                      </div>
                      <div className="mt-2 text-sm text-slate-500">
                        {t.keyMask}：{maskedKeys.get(key.id)}
                      </div>
                      <div className="mt-1 text-sm text-slate-500">
                        {t.cachedDomainCount}：{key.domains.length}
                      </div>
                      <div className="mt-1 text-sm text-slate-500">
                        {t.lastSyncedAtLabel}：{formatDateTime(key.lastSyncedAt)}
                      </div>
                      {key.note ? (
                        <div className="mt-2 text-sm text-slate-600">{key.note}</div>
                      ) : null}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <form action={syncApiKeyDomainsAction}>
                        <input name="id" type="hidden" value={key.id} />
                        <SubmitButton pendingText={t.syncing} size="sm" variant="outline">
                          {t.syncDomains}
                        </SubmitButton>
                      </form>
                      <form action={toggleApiKeyAction}>
                        <input name="id" type="hidden" value={key.id} />
                        <SubmitButton pendingText={t.processing} size="sm" variant="secondary">
                          {key.isEnabled ? t.disable : t.enable}
                        </SubmitButton>
                      </form>
                      <form action={deleteApiKeyAction}>
                        <input name="id" type="hidden" value={key.id} />
                        <SubmitButton pendingText={t.deletingItem} size="sm" variant="destructive">
                          {t.remove}
                        </SubmitButton>
                      </form>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      </section>

      <Card>
        <CardTitle>{t.domainCache}</CardTitle>
        <CardDescription className="mt-1">
          {t.domainCacheDescription}
        </CardDescription>
        <div className="mt-6">
          <TableWrapper>
            <Table>
              <thead>
                <tr>
                  <TH>{t.domain}</TH>
                  <TH>{t.type}</TH>
                  <TH>{t.sourceApiKey}</TH>
                  <TH>{t.apiRelay}</TH>
                  <TH>{t.lastSyncedAtLabel}</TH>
                  <TH>{t.action}</TH>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white/65">
                {domains.length === 0 ? (
                  <tr>
                    <TD className="text-slate-500" colSpan={6}>
                      {t.noDomainCache}
                    </TD>
                  </tr>
                ) : (
                  domains.map((domain) => (
                    <tr key={domain.id}>
                      <TD className="font-medium text-slate-900">{domain.domain}</TD>
                      <TD>
                        <Badge variant={domain.isPrivate ? "warning" : "muted"}>
                          {domain.isPrivate ? t.privateDomain : t.systemDomain}
                        </Badge>
                      </TD>
                      <TD>{domain.apiKey?.name ?? t.publicDomain}</TD>
                      <TD>
                        <Badge variant={domain.isEnabledForRelay ? "success" : "muted"}>
                          {domain.isEnabledForRelay ? t.enabled : t.disabled}
                        </Badge>
                      </TD>
                      <TD>{formatDateTime(domain.lastSyncedAt)}</TD>
                      <TD>
                        <form action={toggleRelayDomainAction}>
                          <input name="id" type="hidden" value={domain.id} />
                          <SubmitButton pendingText={t.processing} size="sm" variant="outline">
                            {domain.isEnabledForRelay ? t.disableRelay : t.enableRelay}
                          </SubmitButton>
                        </form>
                      </TD>
                    </tr>
                  ))
                )}
              </tbody>
            </Table>
          </TableWrapper>
        </div>
      </Card>

      <section className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <Card>
          <CardTitle>{t.relayConfig}</CardTitle>
          <CardDescription className="mt-1">
            {t.relayConfigDescription}
          </CardDescription>
          <form action={createRelayClientAction} className="mt-6 space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700" htmlFor="relayName">
                {t.name}
              </label>
              <Input id="relayName" name="name" placeholder="移动端脚本 / 测试环境 / 生产前端" required />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700" htmlFor="relayToken">
                {t.relayTokenInput}
              </label>
              <Input id="relayToken" name="token" placeholder="自定义中继访问令牌" required />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700" htmlFor="relayNote">
                {t.note}
              </label>
              <Textarea id="relayNote" name="note" placeholder="这个中继配置对应哪个前端或脚本" />
            </div>
            <SubmitButton className="w-full" pendingText={t.creating}>
              {t.createRelayConfig}
            </SubmitButton>
          </form>
        </Card>

        <Card>
          <CardTitle>{t.savedRelayConfigs}</CardTitle>
          <CardDescription className="mt-1">
            {t.savedRelayConfigsDescription}
          </CardDescription>
          <div className="mt-6 space-y-4">
            {relayClients.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 p-6 text-sm text-slate-500">
                {t.noRelayConfigs}
              </div>
            ) : (
              relayClients.map((relayClient) => {
                return (
                  <div className="rounded-2xl border border-slate-200 bg-white/60 p-4" key={relayClient.id}>
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-3">
                          <h3 className="text-base font-semibold text-slate-950">{relayClient.name}</h3>
                          <Badge variant={relayClient.isEnabled ? "success" : "muted"}>
                            {relayClient.isEnabled ? t.enabled : t.disabled}
                          </Badge>
                        </div>
                        <div className="mt-2 text-sm text-slate-500">
                          {t.tokenMask}：{maskSecret(secretsService.decrypt(relayClient.encryptedToken))}
                        </div>
                        <div className="mt-1 text-sm text-slate-500">
                          {t.domainPermissionGlobal}
                        </div>
                        <div className="mt-1 text-sm text-slate-500">
                          {t.createdAt}：{formatDateTime(relayClient.createdAt)}
                        </div>
                        {relayClient.note ? (
                          <div className="mt-2 text-sm text-slate-600">{relayClient.note}</div>
                        ) : null}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <form action={toggleRelayClientAction}>
                          <input name="id" type="hidden" value={relayClient.id} />
                          <SubmitButton pendingText={t.processing} size="sm" variant="secondary">
                            {relayClient.isEnabled ? t.disable : t.enable}
                          </SubmitButton>
                        </form>
                        <form action={deleteRelayClientAction}>
                          <input name="id" type="hidden" value={relayClient.id} />
                          <SubmitButton pendingText={t.deletingItem} size="sm" variant="destructive">
                            {t.remove}
                          </SubmitButton>
                        </form>
                      </div>
                    </div>

                    <div className="mt-4">
                      <RevealRelayToken relayClientId={relayClient.id} />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </Card>
      </section>
    </>
  );
}
