"use client";

import { ChevronDown } from "lucide-react";
import type { ReactNode } from "react";
import { useState } from "react";

import { cn } from "@/lib/utils";

type PanelItem = {
  id: string;
  label: string;
  description?: string;
  content: ReactNode;
};

export function SingleExpandPanels({
  items,
  defaultOpenId,
  className,
}: {
  items: PanelItem[];
  defaultOpenId: string;
  className?: string;
}) {
  const [openId, setOpenId] = useState(defaultOpenId);

  return (
    <div className={cn("space-y-3", className)}>
      {items.map((item) => {
        const isOpen = item.id === openId;

        return (
          <div
            className={cn(
              "overflow-hidden rounded-2xl border transition",
              isOpen
                ? "border-blue-200 bg-blue-50/60 shadow-sm"
                : "border-slate-200 bg-white/70",
            )}
            key={item.id}
          >
            <button
              className="flex w-full items-center justify-between gap-4 px-4 py-4 text-left"
              onClick={() => setOpenId(item.id)}
              type="button"
            >
              <div>
                <div className="text-sm font-semibold text-slate-900">{item.label}</div>
                {item.description ? (
                  <div className="mt-1 text-sm text-slate-500">{item.description}</div>
                ) : null}
              </div>
              <ChevronDown
                className={cn(
                  "h-4 w-4 shrink-0 text-slate-500 transition-transform",
                  isOpen && "rotate-180 text-blue-600",
                )}
              />
            </button>

            {isOpen ? <div className="border-t border-slate-200/80 px-4 py-4">{item.content}</div> : null}
          </div>
        );
      })}
    </div>
  );
}

export function MultiExpandPanels({
  items,
  defaultOpenIds = [],
  className,
}: {
  items: PanelItem[];
  defaultOpenIds?: string[];
  className?: string;
}) {
  const [openIds, setOpenIds] = useState<string[]>(defaultOpenIds);

  const toggle = (id: string) => {
    setOpenIds((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
  };

  return (
    <div className={cn("space-y-3", className)}>
      {items.map((item) => {
        const isOpen = openIds.includes(item.id);

        return (
          <div
            className={cn(
              "overflow-hidden rounded-2xl border transition",
              isOpen
                ? "border-blue-200 bg-blue-50/60 shadow-sm"
                : "border-slate-200 bg-white/70",
            )}
            key={item.id}
          >
            <button
              className="flex w-full items-center justify-between gap-4 px-4 py-4 text-left"
              onClick={() => toggle(item.id)}
              type="button"
            >
              <div>
                <div className="text-sm font-semibold text-slate-900">{item.label}</div>
                {item.description ? (
                  <div className="mt-1 text-sm text-slate-500">{item.description}</div>
                ) : null}
              </div>
              <ChevronDown
                className={cn(
                  "h-4 w-4 shrink-0 text-slate-500 transition-transform",
                  isOpen && "rotate-180 text-blue-600",
                )}
              />
            </button>

            {isOpen ? <div className="border-t border-slate-200/80 px-4 py-4">{item.content}</div> : null}
          </div>
        );
      })}
    </div>
  );
}
