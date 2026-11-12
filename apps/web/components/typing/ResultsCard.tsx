import type { SessionResult } from "@typemaster/typing-engine";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { RewardsPanel } from "@/components/ui/RewardsPanel";
import type { SaveResult, SaveState } from "@/lib/client/outbox";
import { WpmChart } from "./WpmChart";

const SAVE_MSG: Record<SaveState, string> = {
  saving: "Saving…", saved: "Saved to your history.", skipped: "Runs under 10 seconds aren’t saved.",
  failed: "Couldn’t save yet — we’ll keep it and retry.", guest: "",
};

type Props = {
  result: SessionResult; onRetry: () => void; save: SaveResult; onRetrySave: () => void; signedIn: boolean;
  /** key/template practice: counts as practice but never toward personal bests */
  drill: boolean;
  /** untimed practice: no clock, so no personal bests and no XP */
  free?: boolean;
  compact?: boolean;
};

export function ResultsCard({ result, onRetry, save, onRetrySave, signedIn, drill, free = false, compact = false }: Props) {
  const noRecords = drill || free;
  const saveState = save.state;
  const problem = Object.entries(result.keyStats)
    .filter(([, s]) => s.misses > 0)
    .sort((a, b) => b[1].misses - a[1].misses)
    .slice(0, 6);
  const stats: [string, string][] = [
    ["Accuracy", `${Math.round(result.accuracy)}%`],
    ["Consistency", `${result.consistency}%`],
    ["Time", `${Math.round(result.durationMs / 1000)}s`],
    ["Errors", String(result.errors)],
  ];
  return (
    <div className="grid gap-4 lg:grid-cols-[2fr_1fr]" data-testid="results">
      <div className="space-y-4">
        <Card className="py-8 text-center">
          {!noRecords && save.personalBest && (
            <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-ok/15 px-3 py-1 text-sm font-bold text-ok" role="status" data-testid="pb-banner">
              ★ New personal best{typeof save.previousBest === "number" ? ` (was ${Math.round(save.previousBest)})` : ""}
            </div>
          )}
          {!noRecords && saveState === "saved" && !save.personalBest && save.previousBest === null && (
            <div className="mb-3 text-xs text-muted">First test of this length — this is your baseline.</div>
          )}
          {!noRecords && saveState === "saved" && !save.personalBest && typeof save.previousBest === "number" && (
            <div className="mb-3 text-xs text-muted">Personal best for this length: {Math.round(save.previousBest)} WPM</div>
          )}
          {free && <div className="mb-2 text-xs text-muted">Free practice · not compared with personal bests · no XP</div>}
          <div className="text-sm text-muted">Words per minute</div>
          <div className="font-mono text-7xl font-bold leading-none text-accent">{Math.round(result.wpm)}</div>
          <div className="mt-6 flex flex-wrap justify-center gap-8">
            {stats.map(([k, v]) => (
              <div key={k}><div className="text-xs text-muted">{k}</div><div className="text-xl font-bold">{v}</div></div>
            ))}
          </div>
        </Card>
        <Card>
          <h2 className="mb-2 font-bold">Speed through the test</h2>
          <WpmChart series={result.wpmSeries} />
        </Card>
      </div>
      <div className="space-y-4">
        <Card>
          <h2 className="font-bold">Problem keys</h2>
          {problem.length === 0 ? (
            <p className="mt-2 text-sm text-ok">No missed keys — clean run!</p>
          ) : (
            <div className="mt-3 flex flex-wrap gap-3">
              {problem.map(([k, s]) => (
                <div key={k} className="text-center">
                  <div className="grid h-11 w-11 place-items-center rounded-lg bg-bad/20 font-mono uppercase">{k === " " ? "␣" : k}</div>
                  <div className="mt-1 text-xs text-muted">{s.misses}×</div>
                </div>
              ))}
            </div>
          )}
        </Card>
        <RewardsPanel rewards={save.rewards} />
        {signedIn && problem.length > 0 && !drill && <Button size="lg" className="w-full" href="/app/practice?drill=weak">Drill weak keys</Button>}
        <Button size="lg" variant={signedIn && problem.length > 0 && !drill ? "secondary" : "primary"} className="w-full" onClick={onRetry}>{noRecords ? "Practise again" : "Try again"}</Button>
        {signedIn && !compact && <Button variant="ghost" className="w-full" href="/app">Back to dashboard</Button>}
        {saveState === "guest" ? (
          <Card className="space-y-2 bg-accent-soft">
            <p className="text-sm font-semibold">Save this score</p>
            <p className="text-xs">Create a free account and this run is added to your history.</p>
            <Button size="sm" href="/register">Sign up</Button>
          </Card>
        ) : (
          <p role="status" className={`text-xs ${saveState === "failed" ? "text-bad" : "text-muted"}`}>
            {SAVE_MSG[saveState]} {saveState === "failed" && <button className="font-semibold underline" onClick={onRetrySave}>Retry now</button>}
          </p>
        )}
      </div>
    </div>
  );
}
