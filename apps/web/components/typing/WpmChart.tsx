/** Minimal SVG line chart of cumulative WPM per second. */
export function WpmChart({ series }: { series: number[] }) {
  if (series.length < 2) return <p className="py-6 text-center text-sm text-muted">Not enough data for a chart.</p>;
  const w = 600, h = 170, pad = 24;
  const max = Math.max(...series, 10) * 1.1;
  const pts = series.map((v, i) => [pad + (i * (w - pad * 2)) / (series.length - 1), h - pad - (v / max) * (h - pad * 2)] as const);
  const d = pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`).join(" ");
  const last = pts[pts.length - 1];
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full" role="img" aria-label={`WPM over time, ending at ${Math.round(series[series.length - 1])}`}>
      {[0, 1, 2].map((i) => (
        <line key={i} x1={pad} x2={w - pad} y1={pad + (i * (h - pad * 2)) / 2} y2={pad + (i * (h - pad * 2)) / 2}
          stroke="rgb(var(--line))" strokeDasharray="3 4" />
      ))}
      <path d={`${d} L${last[0]} ${h - pad} L${pad} ${h - pad}Z`} fill="rgb(var(--accent))" opacity="0.1" />
      <path d={d} fill="none" stroke="rgb(var(--accent))" strokeWidth="2.5" strokeLinejoin="round" />
      <circle cx={last[0]} cy={last[1]} r="4.5" fill="rgb(var(--accent))" />
    </svg>
  );
}
