export interface TrendPoint { label: string; value: number | null }

/** Line chart that skips empty days (gaps are not zeros) and labels first/last x values. */
export function TrendChart({ points, unit = "WPM", height = 190 }: { points: TrendPoint[]; unit?: string; height?: number }) {
  const real = points.map((p, i) => ({ ...p, i })).filter((p): p is { label: string; value: number; i: number } => p.value !== null);
  if (real.length < 2) return <p className="grid place-items-center py-12 text-center text-sm text-muted" style={{ minHeight: height }}>Not enough data yet — a trend appears after two days with a test.</p>;

  const w = 640, h = height, padL = 30, padR = 12, padT = 12, padB = 24;
  const vals = real.map((p) => p.value);
  const lo = Math.max(0, Math.floor(Math.min(...vals) / 10) * 10 - 10), hi = Math.ceil(Math.max(...vals) / 10) * 10 + 10;
  const x = (i: number) => padL + (i * (w - padL - padR)) / Math.max(points.length - 1, 1);
  const y = (v: number) => padT + (1 - (v - lo) / (hi - lo)) * (h - padT - padB);
  const d = real.map((p, n) => `${n ? "L" : "M"}${x(p.i).toFixed(1)} ${y(p.value).toFixed(1)}`).join(" ");
  const last = real[real.length - 1];
  const ticks = [lo, (lo + hi) / 2, hi];
  const summary = `${unit} trend: ${real.length} days with data, latest ${Math.round(last.value)}`;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full" role="img" aria-label={summary}>
      {ticks.map((t) => (
        <g key={t}>
          <line x1={padL} x2={w - padR} y1={y(t)} y2={y(t)} stroke="rgb(var(--line))" strokeDasharray="3 4" />
          <text x={0} y={y(t) + 4} fontSize="11" fill="rgb(var(--muted))">{Math.round(t)}</text>
        </g>
      ))}
      <path d={`${d} L${x(last.i)} ${h - padB} L${x(real[0].i)} ${h - padB}Z`} fill="rgb(var(--accent))" opacity="0.1" />
      <path d={d} fill="none" stroke="rgb(var(--accent))" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
      {real.map((p) => <circle key={p.i} cx={x(p.i)} cy={y(p.value)} r={real.length > 40 ? 2 : 3.5} fill="rgb(var(--accent))"><title>{`${p.label}: ${Math.round(p.value)} ${unit}`}</title></circle>)}
      <text x={padL} y={h - 6} fontSize="11" fill="rgb(var(--muted))">{points[0].label}</text>
      <text x={w - padR} y={h - 6} fontSize="11" textAnchor="end" fill="rgb(var(--muted))">{points[points.length - 1].label}</text>
    </svg>
  );
}
