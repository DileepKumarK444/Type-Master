import { clamp } from "@/lib/utils";

export function Progress({ value, label }: { value: number; label?: string }) {
  const v = clamp(value);
  return (
    <div role="progressbar" aria-valuenow={v} aria-valuemin={0} aria-valuemax={100} aria-label={label}
      className="h-2 w-full overflow-hidden rounded-full bg-surface2">
      <div className="h-full rounded-full bg-accent" style={{ width: `${v}%` }} />
    </div>
  );
}
