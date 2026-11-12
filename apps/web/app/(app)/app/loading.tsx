export default function Loading() {
  return (
    <div className="mx-auto max-w-5xl space-y-4" aria-busy="true" aria-label="Loading">
      <div className="h-9 w-56 animate-pulse rounded-token bg-surface2" />
      <div className="grid gap-4 md:grid-cols-3">{[0, 1, 2].map((i) => <div key={i} className="h-28 animate-pulse rounded-token bg-surface2" />)}</div>
      <div className="h-60 animate-pulse rounded-token bg-surface2" />
    </div>
  );
}
