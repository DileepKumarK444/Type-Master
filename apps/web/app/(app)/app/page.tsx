import { redirect } from "next/navigation";
import { LESSONS, getLesson, isUnlocked, levelProgress } from "@typemaster/content";
import { auth } from "@/auth";
import { TrendChart } from "@/components/charts/TrendChart";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Progress } from "@/components/ui/Progress";
import { delta } from "@/lib/delta";
import { getProfile } from "@/lib/server/account";
import { getDb } from "@/lib/server/db";
import { getProgress, starsMap } from "@/lib/server/lessons";
import { getXp } from "@/lib/server/progression";
import { compare, dailySeries, dayKey, getStreakInfo, getWeakKeys, inWindow, sessionsSince } from "@/lib/server/stats";
import { cn } from "@/lib/utils";

export const metadata = { title: "Dashboard" };
export const dynamic = "force-dynamic";

const short = new Intl.DateTimeFormat("en", { month: "short", day: "numeric", timeZone: "UTC" });
const tone = { up: "text-ok", down: "text-bad", flat: "text-muted", none: "text-muted" };

export default async function Page() {
  const user = (await auth())?.user;
  if (!user?.id) redirect("/login");
  const db = getDb();
  const now = new Date();

  const [profile, progress, rows, weak, streakInfo, xp] = await Promise.all([
    getProfile(db, user.id),
    getProgress(db, user.id),
    sessionsSince(db, user.id, new Date(now.getTime() - 60 * 86_400_000)),
    getWeakKeys(db, user.id, 4),
    getStreakInfo(db, user.id),
    getXp(db, user.id),
  ]);
  const streak = streakInfo.streak;
  const lvl = levelProgress(xp);
  if (!profile) redirect("/login");

  const stars = starsMap(progress);
  const next = LESSONS.find((l) => (stars.get(l.id) ?? 0) === 0 && isUnlocked(l.id, stars));
  const started = progress.some((p) => p.attempts > 0);
  const { current, previous } = compare(rows, now, 7);
  const series30 = dailySeries(inWindow(rows, now, 30), now, 30);
  const week = dailySeries(inWindow(rows, now, 7), now, 7);
  const today = week[week.length - 1];
  const goal = profile.dailyMinutes ?? 10;
  const first = profile.displayName.split(" ")[0];
  const isNew = rows.length === 0 && !started;
  const hasTests = current.avgWpm > 0 || rows.some((r) => r.type === "test");

  const stats = [
    { k: "Avg speed", v: current.avgWpm ? Math.round(current.avgWpm) : "—", u: "WPM", d: delta(current.avgWpm, previous.avgWpm) },
    { k: "Accuracy", v: current.avgAccuracy ? `${Math.round(current.avgAccuracy)}%` : "—", u: "", d: delta(current.avgAccuracy, previous.avgAccuracy, "%") },
    { k: "Practice time", v: current.minutes, u: "min", d: delta(current.minutes, previous.minutes, " min") },
  ];

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="text-3xl font-bold tracking-tight">{isNew ? `Welcome, ${first}!` : `Welcome back, ${first}`}</h1>
      <p className="mb-6 mt-1 text-muted">{isNew ? "Take your first lesson to start building your stats." : "Your next lesson, this week’s numbers and your weak keys."}</p>

      <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
        <div className="space-y-4">
          <Card className="flex flex-wrap items-center justify-between gap-4">
            {next ? (
              <>
                <div className="min-w-0">
                  <span className="rounded-full bg-accent-soft px-2.5 py-0.5 text-xs font-bold text-accent">{isNew ? "Start here" : "Recommended next"}</span>
                  <h2 className="mt-2 text-xl font-bold">Lesson {next.id} · {getLesson(next.id)!.title}</h2>
                  <p className="text-sm text-muted">{getLesson(next.id)!.blurb} · about 5 minutes</p>
                </div>
                <Button size="lg" href={`/app/lesson/${next.id}`}>{started ? "Continue" : "Start"} →</Button>
              </>
            ) : (
              <>
                <div><h2 className="text-xl font-bold">All {LESSONS.length} lessons passed 🎉</h2><p className="text-sm text-muted">Keep your speed growing with timed tests and weak-key drills.</p></div>
                <Button size="lg" href="/app/practice">Take a test</Button>
              </>
            )}
          </Card>

          <div className="grid grid-cols-3 gap-4">
            {stats.map((s) => (
              <Card key={s.k} className="p-4">
                <div className="text-xs text-muted sm:text-sm">{s.k}</div>
                <div className="font-mono text-2xl font-bold sm:text-3xl">{s.v}<span className="ml-1 text-xs font-normal text-muted">{s.u}</span></div>
                <div className={cn("text-xs", tone[s.d.tone])}>{s.d.text}{s.d.tone !== "none" && " vs last week"}</div>
              </Card>
            ))}
          </div>

          <Card>
            <h2 className="mb-2 font-bold">Speed · last 30 days</h2>
            {hasTests ? <TrendChart points={series30.map((d) => ({ label: short.format(new Date(d.day)), value: d.wpm }))} /> : (
              <div className="grid place-items-center gap-3 py-10 text-center"><p className="text-sm text-muted">Your speed trend appears after your first timed test.</p><Button variant="secondary" href="/app/practice">Take a 60s test</Button></div>
            )}
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <div className="flex items-baseline justify-between"><h2 className="font-bold">Level {lvl.level}</h2><span className="text-sm text-muted">{lvl.into} / {lvl.needed} XP</span></div>
            <div className="my-3"><Progress value={lvl.fraction * 100} label="Progress to next level" /></div>
            <a href="/app/achievements" className="text-xs font-semibold text-accent">Badges &amp; achievements →</a>
          </Card>
          <Card>
            <div className="flex items-baseline justify-between"><h2 className="font-bold">Daily goal</h2><span className="text-sm text-muted">{Math.min(Math.round(today.minutes), 999)} / {goal} min</span></div>
            <div className="my-3"><Progress value={(today.minutes / goal) * 100} label="Minutes practised today" /></div>
            <div className="flex justify-between" aria-label="Practice days this week">
              {week.map((d) => (
                <div key={d.day} className="flex flex-col items-center gap-1">
                  <div className={cn("grid h-8 w-8 place-items-center rounded-full text-xs", d.sessions ? "bg-accent text-white [[data-theme=dark]_&]:text-bg" : d.day === dayKey(now) ? "border-2 border-accent" : "bg-surface2")}>{d.sessions ? "✓" : ""}</div>
                  <span className="text-[10px] text-muted">{new Date(d.day).toLocaleDateString("en", { weekday: "narrow", timeZone: "UTC" })}</span>
                </div>
              ))}
            </div>
            <p className="mt-3 text-xs text-muted">🔥 {streak}-day streak · {streakInfo.freezeUsed ? "❄ freeze used this week" : "❄ 1 freeze available"}</p>
          </Card>
          <Card className="space-y-2">
            <h2 className="font-bold">Quick start</h2>
            <Button className="w-full" href="/app/practice">Take a 60s test</Button>
            <Button className="w-full" variant="secondary" href="/app/learn">Learning path</Button>
          </Card>
          <Card>
            <div className="flex items-center justify-between"><h2 className="font-bold">Weak keys</h2><a href="/app/progress" className="text-xs font-semibold text-accent">See all</a></div>
            {weak.length === 0 ? <p className="mt-2 text-sm text-muted">None yet. We’ll point out keys that slow you down as you practise.</p> : (
              <>
                <div className="mt-3 flex gap-3">
                  {weak.map((k) => <div key={k.key} className="text-center"><kbd className="grid h-10 w-10 place-items-center rounded-lg bg-bad/15 font-mono uppercase">{k.key}</kbd><div className="mt-1 text-xs text-muted">{Math.round(k.accuracy)}%</div></div>)}
                </div>
                <Button className="mt-3 w-full" variant="secondary" href="/app/practice?drill=weak">Drill these keys</Button>
              </>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
