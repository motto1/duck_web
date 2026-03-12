import type { HTMLAttributes, TableHTMLAttributes, TdHTMLAttributes, ThHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

export function TableWrapper({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("overflow-x-auto rounded-2xl border", className)}
      style={{ borderColor: "var(--border)" }}
      {...props}
    />
  );
}

export function Table({
  className,
  ...props
}: TableHTMLAttributes<HTMLTableElement>) {
  return (
    <table
      className={cn("min-w-full divide-y text-sm", className)}
      style={{ borderColor: "var(--border)" }}
      {...props}
    />
  );
}

export function TH({ className, ...props }: ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      className={cn(
        "px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.16em]",
        className,
      )}
      style={{
        backgroundColor: "var(--surface-subtle)",
        color: "var(--text-soft)",
      }}
      {...props}
    />
  );
}

export function TD({ className, ...props }: TdHTMLAttributes<HTMLTableCellElement>) {
  return (
    <td
      className={cn("px-4 py-3 align-top", className)}
      style={{ color: "var(--text)" }}
      {...props}
    />
  );
}
