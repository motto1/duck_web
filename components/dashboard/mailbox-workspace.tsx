import { SubmitButton } from "@/components/forms/submit-button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { createMailboxAction, joinMailboxWithPasswordAction, joinMailboxWithTokenAction } from "@/app/actions";
import { getServerDictionary } from "@/lib/server-i18n";

type PrivateDomainOption = {
  id: string;
  domain: string;
};

export async function MailboxWorkspace({
  action,
  privateDomains,
}: {
  action: "register" | "join" | "login";
  privateDomains: PrivateDomainOption[];
}) {
  const t = await getServerDictionary();
  const commonPanelClass =
    "mx-auto w-full max-w-4xl rounded-[24px] border border-slate-200 bg-white shadow-sm";

  if (action === "register") {
    return (
      <div className={commonPanelClass}>
        <div className="border-b border-slate-200 px-8 py-6">
          <h2 className="text-[26px] font-semibold tracking-[-0.02em] text-slate-800">
            {t.registerMailbox}
          </h2>
          <p className="mt-2 text-[15px] leading-7 text-slate-500">{t.registerMailboxDescription}</p>
        </div>
        <form action={createMailboxAction} className="grid gap-5 px-8 py-8 md:grid-cols-2">
          <div className="space-y-2 md:col-span-2">
            <label className="text-sm font-medium text-slate-700" htmlFor="domainCacheId">
              {t.privateDomain}
            </label>
            <select
              className="flex h-11 w-full rounded-2xl border border-slate-200 bg-[#f8f8f9] px-4 text-sm outline-none focus:border-[#3867d6] focus:ring-2 focus:ring-[#dcd8ff]"
              id="domainCacheId"
              name="domainCacheId"
              required
            >
              <option value="">{t.choosePrivateDomain}</option>
              {privateDomains.map((domain) => (
                <option key={domain.id} value={domain.id}>
                  {domain.domain}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700" htmlFor="localPart">
              {t.username}
            </label>
            <Input id="localPart" name="localPart" placeholder="mailbox-name" required />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700" htmlFor="registerPassword">
              {t.password}
            </label>
            <Input
              id="registerPassword"
              name="password"
              placeholder="至少 6 位"
              required
              type="password"
            />
          </div>
          <div className="md:col-span-2">
            <SubmitButton className="h-11 rounded-2xl px-6" pendingText={t.creating}>
              {t.registerMailbox}
            </SubmitButton>
          </div>
        </form>
      </div>
    );
  }

  if (action === "login") {
    return (
      <div className={commonPanelClass}>
        <div className="border-b border-slate-200 px-8 py-6">
          <h2 className="text-[26px] font-semibold tracking-[-0.02em] text-slate-800">
            {t.loginMailbox}
          </h2>
          <p className="mt-2 text-[15px] leading-7 text-slate-500">
            {t.loginMailboxDescription}
          </p>
        </div>
        <form action={joinMailboxWithPasswordAction} className="grid gap-5 px-8 py-8 md:grid-cols-2">
          <div className="space-y-2 md:col-span-2">
            <label className="text-sm font-medium text-slate-700" htmlFor="displayName">
              {t.displayName}
            </label>
            <Input id="displayName" name="displayName" placeholder="可选，用于区分多个邮箱" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700" htmlFor="address">
              {t.mailboxAddress}
            </label>
            <Input id="address" name="address" placeholder="hello@example.com" required />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700" htmlFor="loginPassword">
              {t.password}
            </label>
            <Input
              id="loginPassword"
              name="password"
              placeholder="输入邮箱密码"
              required
              type="password"
            />
          </div>
          <div className="md:col-span-2">
            <SubmitButton className="h-11 rounded-2xl px-6" pendingText={t.signingIn}>
              {t.loginMailbox}
            </SubmitButton>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className={commonPanelClass}>
      <div className="border-b border-slate-200 px-8 py-6">
        <h2 className="text-[26px] font-semibold tracking-[-0.02em] text-slate-800">
          {t.joinMailbox}
        </h2>
        <p className="mt-2 text-[15px] leading-7 text-slate-500">
          {t.joinMailboxDescription}
        </p>
      </div>
      <form action={joinMailboxWithTokenAction} className="space-y-5 px-8 py-8">
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700" htmlFor="joinDisplayName">
            {t.displayName}
          </label>
          <Input id="joinDisplayName" name="displayName" placeholder="可选，用于区分多个邮箱" />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700" htmlFor="token">
            Bearer Token
          </label>
          <Textarea id="token" name="token" placeholder="eyJhbGci..." required />
        </div>
        <SubmitButton className="h-11 rounded-2xl px-6" pendingText={t.processing}>
          {t.joinMailbox}
        </SubmitButton>
      </form>
    </div>
  );
}
