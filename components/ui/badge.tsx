import type { HTMLAttributes } from "react";

import { cn } from "@/lib/utils";

const variants = {
  default: "bg-blue-100 text-blue-700",
  success: "bg-emerald-100 text-emerald-700",
  muted: "bg-slate-100 text-slate-600",
  warning: "bg-amber-100 text-amber-700",
  destructive: "bg-red-100 text-red-700",
};

export function Badge({
  className,
  variant = "default",
  ...props
}: HTMLAttributes<HTMLSpanElement> & {
  variant?: keyof typeof variants;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold",
        variants[variant],
        className,
      )}
      {...props}
    />
  );
}
