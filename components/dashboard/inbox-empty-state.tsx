import { Mail } from "lucide-react";
import { getServerDictionary } from "@/lib/server-i18n";

export async function InboxEmptyState({
  title,
  description,
}: {
  title?: string;
  description?: string;
}) {
  const t = await getServerDictionary();

  return (
    <div className="flex min-h-[calc(100vh-220px)] items-center justify-center">
      <div className="mx-auto max-w-xl text-center">
        <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-slate-100 text-slate-400">
          <Mail className="h-12 w-12" strokeWidth={1.75} />
        </div>
        <h2 className="mt-8 text-[24px] font-semibold tracking-[-0.02em] text-slate-700">
          {title ?? t.inboxEmpty}
        </h2>
        <p className="mx-auto mt-4 max-w-lg text-[15px] leading-8 text-slate-500">
          {description ?? t.inboxEmptyDescription}
        </p>
      </div>
    </div>
  );
}
