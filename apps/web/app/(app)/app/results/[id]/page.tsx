import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { modeLabel } from "@/lib/mode-label";
import { getDb } from "@/lib/server/db";
import { getSession, sessionsSince, summarize } from "@/lib/server/stats";

export const metadata = { title: "Test results" };
export const dynamic = "force-dynamic";

const fmt = new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" });
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** A saved result, reachable from history. Owner-only: another user's id is a 404, not a 403 (no existence leak). */
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = (await auth())?.user;
  if (!user?.id) redirect("/login");
  if (!UUID.test(id)) notFound();

  const db = getDb();
  const s = await getSession(db, user.id, id);
  if (!s) notFound();

  const recent = summarize((await sessionsSince(db, user.id, new Date(Date.now() - 30 * 86_400_000))).filter((r) => r.type === "test"));
  const isTest = s.type === "test";
  const diff = isTest && recent.sessions > 1 ? Math.round(s.wpm - recent.avgWpm) : null;
  const label = modeLabel(s.type, s.mode, true);
  const stats: [string, string][] = [["Accuracy", `${Math.round(s.accuracy)}%`], ["Consistency", `${Math.round(s.consistency)}%`], ["Time", `${s.durationS}s`], ["Errors", String(s.errors)]];

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Test results</h1>
        <p className="mt-1 text-muted">{label} · {fmt.format(s.createdAt)} UTC</p>
      </div>
      <Card className="py-8 text-center">
        <div className="text-sm text-muted">Words per minute</div>
        <div className="font-mono text-7xl font-bold leading-none text-accent">{Math.round(s.wpm)}</div>
        {diff !== null && <div className={`mt-3 text-sm ${diff >= 0 ? "text-ok" : "text-muted"}`}>{diff === 0 ? "Right on your 30-day average" : `${Math.abs(diff)} WPM ${diff > 0 ? "above" : "below"} your 30-day average (${Math.round(recent.avgWpm)})`}</div>}
        <div className="mt-6 flex flex-wrap justify-center gap-8">
          {stats.map(([k, v]) => <div key={k}><div className="text-xs text-muted">{k}</div><div className="text-xl font-bold">{v}</div></div>)}
        </div>
      </Card>
      <p className="text-xs text-muted">The per-second speed chart is only shown right after a test; it isn’t stored.</p>
      <div className="flex flex-wrap gap-3">
        <Button href="/app/practice">Take another test</Button>
        <Button variant="secondary" href="/app/practice?drill=weak">Drill weak keys</Button>
        <Button variant="ghost" href="/app/progress">Back to progress</Button>
      </div>
    </div>
  );
}
