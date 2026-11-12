import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { BarChart } from "@/components/charts/BarChart";
import { TrendChart } from "@/components/charts/TrendChart";
import { VirtualKeyboard } from "@/components/typing/VirtualKeyboard";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { delta } from "@/lib/delta";
import { modeLabel } from "@/lib/mode-label";
import { getDb } from "@/lib/server/db";
import { listSessions } from "@/lib/server/sessions";
import { compare, dailySeries, getKeyAccuracy, getWeakKeys, inWindow, sessionsSince } from "@/lib/server/stats";
import { cn } from "@/lib/utils";

export const metadata = { title: "Progress" };
export const dynamic = "force-dynamic";

const RANGES = [7, 30, 90] as const;
const fmt = new Intl.DateTimeFormat("en", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "UTC" });
const short = new Intl.DateTimeFormat("en", { month: "short", day: "numeric", timeZone: "UTC" });
const tone = { up: "text-ok", down: "text-bad", flat: "text-muted", none: "text-muted" };

export default async function Page({ searchParams }: { searchParams: Promise<{ range?: string }> }) {
  const user = (await auth())?.user;
  if (!user?.id) redirect("/login");
  const q = Number((await searchParams).range);
  const range = (RANGES as readonly number[]).includes(q) ? q : 30;

  const db = getDb();
  const now = new Date();
  const [rows, history, weak, heat] = await Promise.all([
    sessionsSince(db, user.id, new Date(now.getTime() - 2 * range * 86_400_000)),
    listSessions(db, user.id, 25),
    getWeakKeys(db, user.id),
    getKeyAccuracy(db, user.id),
  ]);

  if (history.length === 0) {
    return (
      <div className="mx-auto max-w-5xl">
        <h1 className="text-3xl font-bold tracking-tight">Progress</h1>
        <p className="mb-6 mt-1 text-muted">Find out what is really holding your speed back.</p>
        <Card className="grid place-items-center gap-3 border-dashed py-16 text-center">
          <p className="text-lg font-bold">No data yet</p>
          <p className="max-w-sm text-sm text-muted">Complete a typing test or a lesson and your trends will appear here.</p>
          <Button href="/app/practice">Take a 60s test</Button>
        </Card>
      </div>
    );
  }

  const { current, previous } = compare(rows, now, range);
  const series = dailySeries(inWindow(rows, now, range), now, range);
  const last14 = dailySeries(inWindow(rows, now, 14), now, 14);
  const cards = [
    { k: "Avg WPM", v: current.avgWpm ? String(Math.round(current.avgWpm)) : "—", d: delta(current.avgWpm, previous.avgWpm) },
    { k: "Best WPM", v: current.bestWpm ? String(Math.round(current.bestWpm)) : "—", d: delta(current.bestWpm, previous.bestWpm) },
    { k: "Accuracy", v: current.avgAccuracy ? `${Math.round(current.avgAccuracy)}%` : "—", d: delta(current.avgAccuracy, previous.avgAccuracy, "%") },
    { k: "Consistency", v: current.avgConsistency ? `${Math.round(current.avgConsistency)}%` : "—", d: delta(current.avgConsistency, previous.avgConsistency, "%") },
  ];

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Progress</h1>
        <p className="mt-1 text-muted">Find out what is really holding your speed back.</p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <nav className="inline-flex gap-0.5 rounded-token bg-surface2 p-1" aria-label="Time range">
          {RANGES.map((r) => (
            <Link key={r} href={`/app/progress?range=${r}`} aria-current={r === range ? "page" : undefined}
              className={cn("rounded-[7px] px-4 py-1.5 text-sm font-semibold", r === range ? "bg-surface text-fg shadow-sm" : "text-muted")}>{r}d</Link>
          ))}
        </nav>
        <span className="text-sm text-muted">{current.sessions} sessions · {current.minutes} min practised</span>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {cards.map((c) => (
          <Card key={c.k}>
            <div className="text-sm text-muted">{c.k}</div>
            <div className="font-mono text-3xl font-bold">{c.v}</div>
            <div className={cn("text-xs", tone[c.d.tone])}>{c.d.text}{c.d.tone !== "none" && " vs previous"}</div>
          </Card>
        ))}
      </div>
      <p className="-mt-2 text-xs text-muted">Speed, accuracy and consistency come from timed tests. Lessons and drills count toward practice time.</p>

      <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
        <Card><h2 className="mb-2 font-bold">Speed over time</h2><TrendChart points={series.map((d) => ({ label: short.format(new Date(d.day)), value: d.wpm }))} /></Card>
        <Card><h2 className="mb-3 font-bold">Practice time · last 14 days</h2><BarChart bars={last14.map((d) => ({ label: d.day.slice(8), value: d.minutes }))} /></Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
        <Card>
          <h2 className="font-bold">Accuracy by key</h2>
          <p className="mb-3 text-sm text-muted">Red keys have the most mistakes. Keys with fewer than 10 attempts are left blank.</p>
          {Object.keys(heat).length === 0 ? <p className="py-6 text-center text-sm text-muted">Type a little more and your key map appears here.</p> : <div className="overflow-x-auto"><VirtualKeyboard heat={heat} fingers={false} /></div>}
        </Card>
        <Card>
          <h2 className="font-bold">Weak keys</h2>
          {weak.length === 0 ? (
            <p className="mt-2 text-sm text-muted">No weak keys found. Nothing is below 95% accuracy with enough attempts. Nice!</p>
          ) : (
            <>
              <ul className="mt-3 space-y-2">
                {weak.map((k) => (
                  <li key={k.key} className="flex items-center gap-3">
                    <kbd className="grid h-9 w-9 place-items-center rounded-lg bg-bad/15 font-mono uppercase">{k.key}</kbd>
                    <div className="flex-1 text-sm"><b>{Math.round(k.accuracy)}%</b> <span className="text-muted">· {k.misses} misses in {k.attempts}</span></div>
                  </li>
                ))}
              </ul>
              <Button className="mt-4 w-full" href="/app/practice?drill=weak">Drill these keys</Button>
            </>
          )}
        </Card>
      </div>

      <Card className="overflow-x-auto">
        <h2 className="mb-2 font-bold">Recent sessions</h2>
        <table className="w-full text-sm">
          <thead><tr className="text-left text-xs text-muted"><th className="py-2">When (UTC)</th><th>Type</th><th>WPM</th><th>Accuracy</th><th className="hidden sm:table-cell">Consistency</th></tr></thead>
          <tbody>
            {history.map((r) => (
              <tr key={r.id} className="border-t border-line">
                <td className="py-2.5"><Link className="font-medium text-accent hover:underline" href={`/app/results/${r.id}`}>{fmt.format(r.createdAt)}</Link></td>
                <td>{modeLabel(r.type, r.mode)}</td>
                <td className="font-bold">{Math.round(r.wpm)}</td>
                <td>{Math.round(r.accuracy)}%</td>
                <td className="hidden sm:table-cell">{Math.round(r.consistency)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
