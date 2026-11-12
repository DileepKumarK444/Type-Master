import { redirect } from "next/navigation";
import { BADGES, levelProgress } from "@typemaster/content";
import { auth } from "@/auth";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Progress } from "@/components/ui/Progress";
import { getDb } from "@/lib/server/db";
import { getEarnedBadges, getUserStats, getXp } from "@/lib/server/progression";
import { cn } from "@/lib/utils";

export const metadata = { title: "Achievements" };
export const dynamic = "force-dynamic";

export default async function Page() {
  const user = (await auth())?.user;
  if (!user?.id) redirect("/login");
  const db = getDb();
  const [stats, earnedRows, xp] = await Promise.all([getUserStats(db, user.id), getEarnedBadges(db, user.id), getXp(db, user.id)]);
  const earned = new Set(earnedRows.map((b) => b.id));
  const lvl = levelProgress(xp);
  const rows = BADGES.map((b) => {
    const value = b.value(stats);
    return { b, unlocked: earned.has(b.id), value, fraction: Math.min(1, value / b.target) };
  });
  const nextUp = rows.filter((r) => !r.unlocked).sort((a, b) => b.fraction - a.fraction)[0];

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Achievements</h1>
        <p className="mt-1 text-muted">Badges, levels and milestones.</p>
      </div>

      <Card className="space-y-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <div><span className="text-sm text-muted">Level</span> <span className="font-mono text-3xl font-bold">{lvl.level}</span></div>
          <span className="text-sm text-muted">{lvl.into} / {lvl.needed} XP to level {lvl.level + 1} · {xp} XP total</span>
        </div>
        <Progress value={lvl.fraction * 100} label="Progress to next level" />
        <p className="text-xs text-muted">XP is earned for accuracy of 90% or better. Replays and daily practice are capped, so quality beats grinding.</p>
      </Card>

      <Card className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <b>{earned.size} of {BADGES.length} unlocked</b>
          <div className="text-xs text-muted">{nextUp ? `Next: ${nextUp.b.title} — ${nextUp.b.description}` : "All badges unlocked — amazing!"}</div>
        </div>
        <div className="w-60 max-w-full"><Progress value={(earned.size / BADGES.length) * 100} label="Badges unlocked" /></div>
      </Card>

      {earned.size === 0 && (
        <Card className="grid place-items-center gap-3 border-dashed py-10 text-center">
          <p className="text-lg font-bold">Nothing unlocked yet</p>
          <p className="text-sm text-muted">Finish your first lesson to earn “First Steps”.</p>
          <Button href="/app/learn">Start lesson 1</Button>
        </Card>
      )}

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4" role="list" aria-label="Badges">
        {rows.map(({ b, unlocked, value, fraction }) => (
          <Card key={b.id} role="listitem" className={cn("p-4 text-center", !unlocked && "bg-surface2")} data-badge={b.id} data-unlocked={unlocked}>
            <span className={cn("block text-4xl", !unlocked && "opacity-35 grayscale")} aria-hidden="true">{b.emoji}</span>
            <div className="mt-1 font-bold">{b.title}</div>
            <div className="text-xs text-muted">{b.description}</div>
            {unlocked ? (
              <span className="mt-2 inline-block rounded-full bg-ok/15 px-2.5 py-0.5 text-xs font-bold text-ok">Unlocked</span>
            ) : (
              <div className="mt-3">
                <Progress value={fraction * 100} label={`${b.title} progress`} />
                <div className="mt-1 text-xs text-muted">{Math.round(Math.min(value, b.target))} / {b.target} {b.unit}</div>
              </div>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}
