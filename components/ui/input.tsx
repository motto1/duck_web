import type { InputHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

export function Input({
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "flex h-11 w-full rounded-2xl border px-4 py-2 text-sm outline-none transition placeholder:text-slate-400 focus:ring-2",
        className,
      )}
      style={{
        borderColor: "var(--border)",
        backgroundColor: "var(--surface-subtle)",
        color: "var(--text)",
        boxShadow: "none",
      }}
      {...props}
    />
  );
}
