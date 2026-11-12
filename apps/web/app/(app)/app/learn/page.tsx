import Link from "next/link";
import { redirect } from "next/navigation";
import { LESSONS, UNITS, isUnlocked } from "@typemaster/content";
import { auth } from "@/auth";
import { Card } from "@/components/ui/Card";
import { Icon } from "@/components/ui/Icon";
import { Progress } from "@/components/ui/Progress";
import { Button } from "@/components/ui/Button";
import { getDb } from "@/lib/server/db";
import { getProgress, starsMap } from "@/lib/server/lessons";
import { cn } from "@/lib/utils";

export const metadata = { title: "Learning path" };
export const dynamic = "force-dynamic";

export default async function Page() {
  const user = (await auth())?.user;
  if (!user?.id) redirect("/login");
  const rows = await getProgress(getDb(), user.id);
  const stars = starsMap(rows);
  const passed = LESSONS.filter((l) => (stars.get(l.id) ?? 0) >= 1).length;
  const current = LESSONS.find((l) => (stars.get(l.id) ?? 0) === 0 && isUnlocked(l.id, stars));

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="text-3xl font-bold tracking-tight">Learning path</h1>
      <p className="mb-6 mt-1 text-muted">Beginner → Intermediate. Pass each lesson to unlock the next.</p>
      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <div className="space-y-7">
          {UNITS.map((u) => (
            <section key={u.id} className="space-y-2.5" aria-label={u.title}>
              <div className="flex items-center justify-between">
                <h2 className="font-bold">Unit {u.id} · {u.title}</h2>
                <span className="rounded-full bg-accent-soft px-2.5 py-0.5 text-xs font-bold capitalize text-accent">{u.level}</span>
              </div>
              {LESSONS.filter((l) => l.unit === u.id).map((l) => {
                const s = stars.get(l.id) ?? 0;
                const open = isUnlocked(l.id, stars);
                const state = s > 0 ? "done" : open ? "current" : "locked";
                const body = (
                  <>
                    <div className={cn("grid h-10 w-10 shrink-0 place-items-center rounded-full font-bold",
                      state === "done" && "bg-ok text-white", state === "current" && "bg-accent text-white [[data-theme=dark]_&]:text-bg", state === "locked" && "bg-surface2 text-muted")}>
                      {state === "done" ? <Icon name="check" /> : state === "locked" ? <Icon name="lock" className="h-4 w-4" /> : l.id}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold">{l.id}. {l.title}</div>
                      <div className="text-xs text-muted">{state === "locked" ? "Locked — pass the previous lesson" : state === "done" ? `Best ${Math.round(rows.find((r) => r.lessonId === l.id)?.bestWpm ?? 0)} WPM · ${Math.round(rows.find((r) => r.lessonId === l.id)?.bestAccuracy ?? 0)}%` : l.blurb}</div>
                    </div>
                    {s > 0 && <span className="tracking-widest text-warn" aria-label={`${s} of 3 stars`}>{"★".repeat(s)}{"☆".repeat(3 - s)}</span>}
                    {state === "current" && <span className="rounded-token bg-accent px-3 py-1.5 text-sm font-semibold text-white [[data-theme=dark]_&]:text-bg">{(rows.find((r) => r.lessonId === l.id)?.attempts ?? 0) > 0 ? "Retry" : "Start"}</span>}
                  </>
                );
                const cls = cn("flex items-center gap-3.5 rounded-token border bg-surface p-3.5",
                  state === "current" ? "border-2 border-accent" : state === "done" ? "border-ok/60" : "border-dashed border-line bg-surface2");
                return open ? <Link key={l.id} href={`/app/lesson/${l.id}`} className={cn(cls, "hover:bg-surface2")}>{body}</Link> : <div key={l.id} className={cls} aria-disabled="true">{body}</div>;
              })}
            </section>
          ))}
          <section className="space-y-2.5">
            <div className="flex items-center justify-between"><h2 className="font-bold">Advanced</h2><span className="rounded-full bg-warn/15 px-2.5 py-0.5 text-xs font-bold text-warn">Coming in v1.3</span></div>
            <Card className="border-dashed bg-surface2 text-sm text-muted">Paragraph endurance, symbols and code.</Card>
          </section>
        </div>
        <div className="space-y-4">
          <Card>
            <h2 className="font-bold">Your path</h2>
            <div className="mt-2 font-mono text-3xl font-bold">{passed}<span className="text-base font-normal text-muted"> / {LESSONS.length} lessons</span></div>
            <div className="my-3"><Progress value={(passed / LESSONS.length) * 100} label="Lessons passed" /></div>
            <p className="text-sm text-muted">Pass mark: 90% accuracy (Beginner), 93% (Intermediate).</p>
            {current && <Button className="mt-4 w-full" href={`/app/lesson/${current.id}`}>{passed === 0 ? "Start lesson 1" : `Continue: lesson ${current.id}`}</Button>}
            {!current && passed === LESSONS.length && <p className="mt-3 text-sm font-semibold text-ok">All lessons passed — nice work!</p>}
          </Card>
          <Card>
            <h2 className="font-bold">Stars</h2>
            <ul className="mt-2 space-y-1 text-sm text-muted">
              <li><span className="text-warn">★</span> Pass the accuracy goal</li>
              <li><span className="text-warn">★★</span> 96% accuracy or better</li>
              <li><span className="text-warn">★★★</span> 98% accuracy at the target speed</li>
            </ul>
          </Card>
        </div>
      </div>
    </div>
  );
}
