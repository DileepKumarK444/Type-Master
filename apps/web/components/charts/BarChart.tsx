export interface Bar { label: string; value: number }

export function BarChart({ bars, unit = "min", height = 130 }: { bars: Bar[]; unit?: string; height?: number }) {
  const max = Math.max(...bars.map((b) => b.value), 1);
  const total = bars.reduce((a, b) => a + b.value, 0);
  return (
    <div role="img" aria-label={`${Math.round(total)} ${unit} over ${bars.length} days`}>
      <div className="flex items-end gap-1.5" style={{ height }}>
        {bars.map((b, i) => (
          <div key={i} className="flex h-full flex-1 flex-col justify-end" title={`${b.label}: ${Math.round(b.value * 10) / 10} ${unit}`}>
            <div className={i === bars.length - 1 ? "bg-accent" : "bg-accent/40"} style={{ height: `${(b.value / max) * 100}%`, minHeight: b.value > 0 ? 3 : 0, borderRadius: "4px 4px 1px 1px" }} />
          </div>
        ))}
      </div>
      <div className="mt-1 flex gap-1.5 text-[10px] text-muted">
        {bars.map((b, i) => <div key={i} className="flex-1 truncate text-center">{b.label}</div>)}
      </div>
    </div>
  );
}
