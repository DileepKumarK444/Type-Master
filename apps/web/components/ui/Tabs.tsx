"use client";
import { useState } from "react";
import { cn } from "@/lib/utils";

export function Tabs({ items, defaultIndex = 0, onChange }: { items: string[]; defaultIndex?: number; onChange?: (i: number) => void }) {
  const [i, setI] = useState(defaultIndex);
  return (
    <div role="tablist" className="inline-flex gap-0.5 rounded-token bg-surface2 p-1">
      {items.map((t, n) => (
        <button key={t} role="tab" aria-selected={n === i} onClick={() => { setI(n); onChange?.(n); }}
          className={cn("rounded-[7px] px-4 py-1.5 text-sm font-semibold", n === i ? "bg-surface text-fg shadow-sm" : "text-muted")}>
          {t}
        </button>
      ))}
    </div>
  );
}
