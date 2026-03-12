import type { ButtonHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

const variants = {
  default:
    "bg-[#3867d6] text-white shadow-sm hover:bg-[#2f58b8] focus-visible:ring-primary",
  outline:
    "border focus-visible:ring-primary",
  ghost: "focus-visible:ring-primary",
  destructive:
    "bg-destructive text-destructive-foreground shadow-sm hover:bg-red-500 focus-visible:ring-destructive",
  secondary: "focus-visible:ring-primary",
};

const sizes = {
  default: "h-10 px-4 py-2 text-sm",
  sm: "h-8 px-3 text-xs",
  lg: "h-11 px-5 text-sm",
};

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: keyof typeof variants;
  size?: keyof typeof sizes;
};

export function Button({
  className,
  variant = "default",
  size = "default",
  type = "button",
  ...props
}: Props) {
  const style =
    variant === "outline"
      ? {
          borderColor: "var(--border)",
          backgroundColor: "var(--surface)",
          color: "var(--text)",
        }
      : variant === "ghost"
        ? {
            color: "var(--text)",
          }
        : variant === "secondary"
          ? {
              backgroundColor: "var(--surface-strong)",
              color: "var(--text)",
            }
          : undefined;

  return (
    <button
      className={cn(
        "inline-flex items-center justify-center rounded-xl font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60",
        variants[variant],
        sizes[size],
        className,
      )}
      style={style}
      type={type}
      {...props}
    />
  );
}
