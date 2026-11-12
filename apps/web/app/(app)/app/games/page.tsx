import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { getDb } from "@/lib/server/db";
import { getUserStats } from "@/lib/server/progression";
import { listSessions } from "@/lib/server/sessions";

export const metadata = { title: "Games" };
export const dynamic = "force-dynamic";

const fmt = new Intl.DateTimeFormat("en", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "UTC" });

export default async function Page() {
  const user = (await auth())?.user;
  if (!user?.id) redirect("/login");
  const db = getDb();
  const [stats, recent] = await Promise.all([getUserStats(db, user.id), listSessions(db, user.id, 60)]);
  const plays = recent.filter((r) => r.type === "game").slice(0, 8);

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Games</h1>
        <p className="mt-1 text-muted">Fun reps that still count toward your stats and XP.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="flex flex-col gap-3">
          <div className="flex items-center justify-between"><span className="text-3xl" aria-hidden="true">⚡</span><span className="rounded-full bg-ok/15 px-2.5 py-0.5 text-xs font-bold text-ok">Playable</span></div>
          <h2 className="text-xl font-bold">Word Rush</h2>
          <p className="flex-1 text-sm text-muted">Type each word before its timer runs out. Chain correct words for up to a ×4 score multiplier.</p>
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted">{stats.gamesPlayed ? `Best ${stats.bestGameScore.toLocaleString()} · ${stats.gamesPlayed} played` : "Not played yet"}</span>
            <Button size="sm" href="/app/games/word-rush">▶ Play</Button>
          </div>
        </Card>
        {[["🌧️", "Falling Words", "Clear words before they hit the ground. Three lives.", "v1.1"], ["🏁", "Typing Racer", "Race your past runs and bots to the finish line.", "v1.2"]].map(([e, t, d, v]) => (
          <Card key={t} className="flex flex-col gap-3 border-dashed bg-surface2">
            <div className="flex items-center justify-between"><span className="text-3xl grayscale" aria-hidden="true">{e}</span><span className="rounded-full bg-warn/15 px-2.5 py-0.5 text-xs font-bold text-warn">Coming in {v}</span></div>
            <h2 className="text-xl font-bold">{t}</h2>
            <p className="flex-1 text-sm text-muted">{d}</p>
          </Card>
        ))}
      </div>
      <Card className="overflow-x-auto">
        <h2 className="mb-2 font-bold">Recently played</h2>
        {plays.length === 0 ? <p className="py-4 text-sm text-muted">No games yet. Try Word Rush — it takes a minute.</p> : (
          <table className="w-full text-sm">
            <thead><tr className="text-left text-xs text-muted"><th className="py-2">When (UTC)</th><th>Game</th><th>Score</th><th>WPM</th><th>Accuracy</th></tr></thead>
            <tbody>{plays.map((r) => (
              <tr key={r.id} className="border-t border-line"><td className="py-2.5">{fmt.format(r.createdAt)}</td><td>Word Rush</td><td className="font-bold">{(r.score ?? 0).toLocaleString()}</td><td>{Math.round(r.wpm)}</td><td>{Math.round(r.accuracy)}%</td></tr>
            ))}</tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
