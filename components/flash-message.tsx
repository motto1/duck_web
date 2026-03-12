import { AlertCircle, CircleCheckBig } from "lucide-react";

import { cn } from "@/lib/utils";

export function FlashMessage({
  success,
  error,
}: {
  success?: string;
  error?: string;
}) {
  if (!success && !error) {
    return null;
  }

  const isError = Boolean(error);
  const message = error ?? success;

  return (
    <div
      className={cn(
        "mb-6 flex items-center gap-3 rounded-2xl border px-4 py-3 text-sm shadow-sm",
        isError
          ? "border-red-200 bg-red-50 text-red-700"
          : "border-emerald-200 bg-emerald-50 text-emerald-700",
      )}
    >
      {isError ? <AlertCircle className="h-4 w-4" /> : <CircleCheckBig className="h-4 w-4" />}
      <span>{message}</span>
    </div>
  );
}
