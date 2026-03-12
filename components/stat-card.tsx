import type { ReactNode } from "react";

import { Card } from "@/components/ui/card";

export function StatCard({
  label,
  value,
  hint,
  icon,
}: {
  label: string;
  value: ReactNode;
  hint: string;
  icon: ReactNode;
}) {
  return (
    <Card className="relative overflow-hidden">
      <div className="mb-4 flex items-center justify-between">
        <span className="text-sm font-medium text-slate-500">{label}</span>
        <div className="rounded-full bg-blue-100 p-2 text-blue-600">{icon}</div>
      </div>
      <div className="text-3xl font-semibold text-slate-950">{value}</div>
      <div className="mt-2 text-sm text-slate-500">{hint}</div>
    </Card>
  );
}
