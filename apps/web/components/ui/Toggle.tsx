"use client";
import { useState } from "react";
import { cn } from "@/lib/utils";

export function Toggle({ label, defaultOn = false, onChange }: { label: string; defaultOn?: boolean; onChange?: (on: boolean) => void }) {
  const [on, setOn] = useState(defaultOn);
  return (
    <button type="button" role="switch" aria-checked={on} aria-label={label}
      onClick={() => { setOn(!on); onChange?.(!on); }}
      className={cn("relative h-6 w-11 shrink-0 rounded-full transition-colors", on ? "bg-accent" : "bg-line")}>
      <span className={cn("absolute top-[3px] h-[18px] w-[18px] rounded-full bg-white transition-all", on ? "left-[23px]" : "left-[3px]")} />
    </button>
  );
}
