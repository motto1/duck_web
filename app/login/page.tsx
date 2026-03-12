import { ShieldCheck } from "lucide-react";

import { FlashMessage } from "@/components/flash-message";
import { SubmitButton } from "@/components/forms/submit-button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { loginAction } from "@/app/actions";
import { redirectIfAuthenticated } from "@/lib/auth";
import { getServerDictionary } from "@/lib/server-i18n";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string; error?: string }>;
}) {
  await redirectIfAuthenticated();
  const [params, t] = await Promise.all([searchParams, getServerDictionary()]);

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-16">
      <div className="absolute inset-0 -z-10 bg-hero-glow" />
      <Card className="w-full max-w-md border-white/80 bg-white/85">
        <div className="mb-8 flex items-center gap-4">
          <div className="rounded-2xl bg-blue-100 p-3 text-blue-600">
            <ShieldCheck className="h-8 w-8" />
          </div>
          <div>
            <CardTitle className="text-2xl">{t.loginTitle}</CardTitle>
            <CardDescription className="mt-1">
              {t.loginDescription}
            </CardDescription>
          </div>
        </div>

        <FlashMessage success={params.success} error={params.error} />

        <form action={loginAction} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700" htmlFor="username">
              {t.username}
            </label>
            <Input id="username" name="username" placeholder="admin" required />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700" htmlFor="password">
              {t.password}
            </label>
            <Input
              id="password"
              name="password"
              placeholder={t.enterAdminPassword}
              required
              type="password"
            />
          </div>
          <SubmitButton className="w-full" pendingText={t.signingIn}>
            {t.enterConsole}
          </SubmitButton>
        </form>
      </Card>
    </main>
  );
}
