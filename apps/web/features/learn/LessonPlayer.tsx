"use client";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { SessionResult } from "@typemaster/typing-engine";
import { failureTip, fingerName, type LessonStep } from "@typemaster/content";
import { LiveStats } from "@/components/typing/LiveStats";
import { TypingSurface } from "@/components/typing/TypingSurface";
import { VirtualKeyboard } from "@/components/typing/VirtualKeyboard";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Icon } from "@/components/ui/Icon";
import { RewardsPanel, type RewardsView } from "@/components/ui/RewardsPanel";
import { useTypingSession } from "@/features/practice/useTypingSession";
import { toLessonPayload } from "@/lib/session-payload";
import { cn } from "@/lib/utils";

type Lesson = { id: number; title: string; level: string; tip: string; newKeys: string[]; passAccuracy: number; targetWpm: number };
type Props = { lesson: Lesson; steps: LessonStep[]; nextLessonId: number | null; bestStars: number; showKeyboard: boolean };

export function LessonPlayer({ lesson, steps, nextLessonId, bestStars, showKeyboard }: Props) {
  const [stepIdx, setStepIdx] = useState(0);
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<SessionResult | null>(null);
  const step = steps[stepIdx];
  const last = stepIdx === steps.length - 1;
  const redo = useCallback(() => { setResult(null); setAttempt((a) => a + 1); }, []);

  return (
    <main id="main" tabIndex={-1} className="mx-auto max-w-4xl space-y-4 p-4 outline-none md:p-8">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" href="/app/learn">✕ Exit</Button>
          <div>
            <div className="text-xs text-muted">Lesson {lesson.id} · <span className="capitalize">{lesson.level}</span></div>
            <h1 className="text-xl font-bold">{lesson.title}</h1>
          </div>
        </div>
        {bestStars > 0 && <span className="text-warn" aria-label={`Best: ${bestStars} stars`}>{"★".repeat(bestStars)}{"☆".repeat(3 - bestStars)}</span>}
      </div>

      <ol className="flex gap-1.5" aria-label="Lesson steps">
        {steps.map((s, i) => (
          <li key={s.kind} className="flex-1" aria-current={i === stepIdx ? "step" : undefined}>
            <div className="h-2 overflow-hidden rounded-full bg-surface2"><div className={cn("h-full rounded-full bg-accent transition-all", i < stepIdx ? "w-full" : i === stepIdx ? (result ? "w-full" : "w-1/2") : "w-0")} /></div>
            <span className={cn("text-xs", i === stepIdx ? "font-bold text-accent" : "text-muted")}>{i + 1}. {s.title}</span>
          </li>
        ))}
      </ol>

      <Card className="flex flex-wrap items-start gap-4">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-token bg-accent-soft text-accent"><Icon name="book" /></div>
        <div className="min-w-0 flex-1 space-y-2">
          <p className="text-sm"><b>{step.title}.</b> <span className="text-muted">{stepIdx === 0 ? lesson.tip : step.hint}</span></p>
          {stepIdx === 0 && lesson.newKeys.length > 0 && (
            <div className="flex flex-wrap gap-3">
              {lesson.newKeys.map((k) => (
                <div key={k} className="flex items-center gap-2 text-xs">
                  <kbd className="grid h-8 min-w-8 place-items-center rounded-md border border-line bg-surface2 px-1.5 font-mono text-sm uppercase">{k}</kbd>
                  <span className="text-muted">{k === "shift" ? "opposite-hand pinky" : fingerName(k) ?? ""}</span>
                </div>
              ))}
            </div>
          )}
        </div>
        {last && <div className="text-right text-xs text-muted">Pass mark<div className="text-base font-bold text-fg">{lesson.passAccuracy}% accuracy</div></div>}
      </Card>

      <StepRun key={`${attempt}-${stepIdx}`} text={step.text} onFinish={setResult} onRestart={redo} showKeyboard={showKeyboard} highlight={lesson.newKeys.filter((k) => k.length === 1)} code={lesson.level === "advanced"} />

      {result && !last && (
        <Card className="flex flex-wrap items-center justify-between gap-3" role="status">
          <div>
            <p className="font-bold">{result.accuracy >= 90 ? "Nice work!" : "Keep practising"} · {Math.round(result.accuracy)}% accuracy · {Math.round(result.wpm)} WPM</p>
            <p className="text-sm text-muted">{result.accuracy >= 90 ? "Ready for the next step." : "You can repeat this step before moving on."}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={redo}>Repeat step</Button>
            <Button onClick={() => { setResult(null); setStepIdx(stepIdx + 1); }}>Continue →</Button>
          </div>
        </Card>
      )}
      {result && last && <FinalPanel key={attempt} lesson={lesson} result={result} nextLessonId={nextLessonId} onRetry={redo} />}
    </main>
  );
}

function StepRun({ text, onFinish, onRestart, showKeyboard, highlight, code }: {
  text: string; onFinish: (r: SessionResult) => void; onRestart: () => void; showKeyboard: boolean; highlight: string[]; code: boolean;
}) {
  const { session, snap, type, back, pause, resume } = useTypingSession(text, { kind: "text" });
  const [version, setVersion] = useState(0);
  const [pressed, setPressed] = useState<string>();
  const done = useRef(false);
  const finished = snap.status === "finished";

  useEffect(() => {
    if (finished && !done.current) { done.current = true; onFinish(session.result(Date.now())); }
  }, [finished, session, onFinish]);

  const onChar = (ch: string) => { type(ch); setPressed(ch); setVersion((v) => v + 1); setTimeout(() => setPressed(undefined), 110); };
  const onBack = () => { back(); setVersion((v) => v + 1); };

  return (
    <div className="space-y-4">
      <Card className="space-y-4 p-5">
        <LiveStats snap={snap} />
        <TypingSurface session={session} version={version} onChar={onChar} onBackspace={onBack} onRestart={onRestart} onFocusChange={(f) => (f ? resume() : pause())} />
        <p className="text-xs text-muted">{code ? "Press Enter at the end of each line · indent with spaces (not Tab) · " : ""}Backspace works · Tab then Enter restarts this step · Esc pauses</p>
      </Card>
      {showKeyboard && <Card className="hidden md:block"><VirtualKeyboard next={finished ? undefined : session.nextChar} pressed={pressed} highlight={highlight} /></Card>}
    </div>
  );
}

type Outcome = { passed: boolean; stars: number; bestStars: number; rewards?: RewardsView };

function FinalPanel({ lesson, result, nextLessonId, onRetry }: { lesson: Lesson; result: SessionResult; nextLessonId: number | null; onRetry: () => void }) {
  const [state, setState] = useState<"saving" | "error" | "rejected" | "done">("saving");
  const [outcome, setOutcome] = useState<Outcome>();
  const clientId = useRef("");
  const started = useRef(false);

  const submit = useCallback(async () => {
    clientId.current ||= crypto.randomUUID(); // same id on retry → server treats it as the same attempt
    setState("saving");
    try {
      const res = await fetch(`/api/lessons/${lesson.id}/complete`, {
        method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(toLessonPayload(result, clientId.current)),
      });
      if (res.status === 400 || res.status === 422) { setState("rejected"); return; } // permanent: retrying the same data cannot succeed
      if (!res.ok) throw new Error(String(res.status));
      setOutcome(await res.json());
      setState("done");
    } catch {
      setState("error");
    }
  }, [lesson.id, result]);

  useEffect(() => {
    if (!started.current) { started.current = true; void submit(); }
  }, [submit]);

  const tip = useMemo(() => failureTip({ keyStats: result.keyStats, confusions: result.confusions, accuracy: result.accuracy, passAccuracy: lesson.passAccuracy }), [result, lesson.passAccuracy]);

  if (state === "saving") return <Card role="status" className="text-center text-muted">Saving your result…</Card>;
  if (state === "rejected") {
    return (
      <Card role="alert" className="space-y-3 text-center">
        <p className="font-bold">This run couldn’t be counted.</p>
        <p className="text-sm text-muted">It was too short or its numbers didn’t add up. Type the step again at your own pace.</p>
        <Button onClick={onRetry}>Try again</Button>
      </Card>
    );
  }
  if (state === "error" || !outcome) {
    return (
      <Card role="alert" className="space-y-3 text-center">
        <p className="font-bold text-bad">Couldn’t save your result.</p>
        <p className="text-sm text-muted">Check your connection and try again. Your typing is not lost until you leave this page.</p>
        <Button onClick={submit}>Try saving again</Button>
      </Card>
    );
  }

  const { passed, stars } = outcome;
  return (
    <Card className="space-y-4 text-center" role="status" data-testid="lesson-outcome">
      <div className={cn("text-2xl font-bold", passed ? "text-ok" : "text-bad")}>{passed ? "Lesson passed!" : "Not quite yet"}</div>
      {passed && <div className="text-3xl tracking-widest text-warn" aria-label={`${stars} of 3 stars`}>{"★".repeat(stars)}{"☆".repeat(3 - stars)}</div>}
      <div className="flex justify-center gap-8">
        <div><div className="text-xs text-muted">Accuracy</div><div className="text-xl font-bold">{Math.round(result.accuracy)}%</div></div>
        <div><div className="text-xs text-muted">Speed</div><div className="text-xl font-bold">{Math.round(result.wpm)} WPM</div></div>
        <div><div className="text-xs text-muted">Needed</div><div className="text-xl font-bold">{lesson.passAccuracy}%</div></div>
      </div>
      {passed ? (
        stars < 3 && <p className="text-sm text-muted">{stars === 1 ? "Reach 96% accuracy for 2 stars." : `For 3 stars: 98% accuracy at ${lesson.targetWpm}+ WPM.`}</p>
      ) : (
        <p className="mx-auto max-w-lg rounded-token bg-accent-soft px-4 py-3 text-sm"><b>Tip:</b> {tip}</p>
      )}
      <div className="mx-auto max-w-sm"><RewardsPanel rewards={outcome.rewards} /></div>
      <div className="flex flex-wrap justify-center gap-3">
        {passed && nextLessonId && <Button href={`/app/lesson/${nextLessonId}`} size="lg">Next lesson →</Button>}
        {passed && !nextLessonId && <Button href="/app/learn" size="lg">Back to path</Button>}
        <Button variant={passed ? "secondary" : "primary"} size={passed ? "md" : "lg"} onClick={onRetry}>{passed ? "Try for more stars" : "Try again (same text)"}</Button>
        <Link href="/app/learn" className="inline-flex items-center px-3 py-2.5 text-sm font-semibold text-muted hover:text-fg">Back to path</Link>
      </div>
    </Card>
  );
}
