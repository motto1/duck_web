import type { HTMLAttributes } from "react";

import { cn } from "@/lib/utils";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-[24px] border p-6 text-card-foreground shadow-sm",
        className,
      )}
      style={{
        backgroundColor: "var(--surface)",
        borderColor: "var(--border)",
        boxShadow: "var(--card-shadow)",
      }}
      {...props}
    />
  );
}

export function CardTitle({
  className,
  ...props
}: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={cn("text-lg font-semibold tracking-tight", className)}
      style={{ color: "var(--text-strong)" }}
      {...props}
    />
  );
}

export function CardDescription({
  className,
  ...props
}: HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("text-sm", className)} style={{ color: "var(--text-soft)" }} {...props} />;
}
