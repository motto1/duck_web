import type { TextareaHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

export function Textarea({
  className,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "flex min-h-28 w-full rounded-2xl border border-slate-200 bg-[#f8f8f9] px-4 py-3 text-sm text-foreground outline-none transition placeholder:text-slate-400 focus:border-[#3867d6] focus:ring-2 focus:ring-[#dcd8ff]",
        className,
      )}
      {...props}
    />
  );
}
