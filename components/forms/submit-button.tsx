"use client";

import { useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";

export function SubmitButton({
  children,
  pendingText,
  variant,
  size,
  className,
}: {
  children: React.ReactNode;
  pendingText?: string;
  variant?: Parameters<typeof Button>[0]["variant"];
  size?: Parameters<typeof Button>[0]["size"];
  className?: string;
}) {
  const { pending } = useFormStatus();

  return (
    <Button
      className={className}
      variant={variant}
      size={size}
      disabled={pending}
      type="submit"
    >
      {pending ? pendingText ?? "处理中..." : children}
    </Button>
  );
}
