import type { Snapshot } from "@typemaster/typing-engine";

export function LiveStats({ snap, words }: { snap: Snapshot; words?: { done: number; total: number | null } }) {
  const left = snap.remainingMs === null ? null : Math.ceil(snap.remainingMs / 1000);
  const items: [string, string][] = [
    ["WPM", String(Math.round(snap.wpm))],
    ["Accuracy", `${Math.round(snap.accuracy)}%`],
    [left === null ? "Time" : "Time left", left === null ? `${Math.floor(snap.elapsedMs / 1000)}s` : `${left}s`],
  ];
  if (words) items.push(["Words", words.total === null ? String(words.done) : `${words.done} / ${words.total}`]);
  return (
    <div className="flex gap-8" aria-live="off">
      {items.map(([k, v]) => (
        <div key={k} className="min-w-[4.5rem]">
          <div className="text-xs text-muted">{k}</div>
          <div className="font-mono text-3xl font-bold tabular-nums">{v}</div>
        </div>
      ))}
    </div>
  );
}
