"use client";
import Link from "next/link";
import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import { WordRush, type WordRushResult, type WordRushSnapshot } from "@typemaster/typing-engine";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { RewardsPanel, type RewardsView } from "@/components/ui/RewardsPanel";
import { cn } from "@/lib/utils";

type Phase = "intro" | "countdown" | "playing" | "done";
type Reply = { personalBest?: boolean; previousBest?: number | null; rewards?: RewardsView };

export function WordRushClient({ bestScore }: { bestScore: number }) {
  const [phase, setPhase] = useState<Phase>("intro");
  const [count, setCount] = useState(3);
  const [round, setRound] = useState(0); // new seed per round
  const [result, setResult] = useState<WordRushResult | null>(null);

  const begin = () => { setResult(null); setRound((r) => r + 1); setCount(3); setPhase("countdown"); };

  useEffect(() => {
    if (phase !== "countdown") return;
    if (count === 0) { setPhase("playing"); return; }
    const t = setTimeout(() => setCount((c) => c - 1), 800);
    return () => clearTimeout(t);
  }, [phase, count]);

  return (
    <main id="main" tabIndex={-1} className="mx-auto max-w-3xl space-y-4 p-4 outline-none md:p-8">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" href="/app/games">✕ Exit</Button>
        <div className="text-right"><div className="text-xs text-muted">Game</div><h1 className="text-xl font-bold">Word Rush</h1></div>
      </div>

      {phase === "intro" && (
        <Card className="space-y-4 p-7 text-center">
          <div className="text-5xl" aria-hidden="true">⚡</div>
          <h2 className="text-2xl font-bold">Ready to rush?</h2>
          <ul className="mx-auto max-w-md space-y-1 text-left text-sm text-muted">
            <li>• Type the word, then press <b>Space</b> or <b>Enter</b>.</li>
            <li>• Each word has its own timer — miss it and your combo resets.</li>
            <li>• Every 4 correct words in a row raises your multiplier, up to ×4.</li>
            <li>• 60 seconds. Accuracy of 90% or better earns XP.</li>
          </ul>
          {bestScore > 0 && <p className="text-sm">Your best: <b>{bestScore.toLocaleString()}</b></p>}
          <Button size="lg" onClick={begin}>▶ Start</Button>
        </Card>
      )}

      {phase === "countdown" && <Card className="grid h-64 place-items-center" aria-live="assertive"><div className="font-mono text-8xl font-bold text-accent">{count || "Go!"}</div></Card>}

      {phase === "playing" && <Play key={round} seed={round * 7919 + 17} onDone={(r) => { setResult(r); setPhase("done"); }} />}

      {phase === "done" && result && <Done result={result} bestScore={bestScore} onAgain={begin} />}
    </main>
  );
}

function Play({ seed, onDone }: { seed: number; onDone: (r: WordRushResult) => void }) {
  const game = useRef<WordRush | null>(null);
  if (!game.current) { game.current = new WordRush({ seed }); game.current.start(Date.now()); }
  const g = game.current;
  const [, bump] = useReducer((n: number) => n + 1, 0);
  const inputRef = useRef<HTMLInputElement>(null);
  const [focused, setFocused] = useState(false);
  const [flash, setFlash] = useState<"correct" | "wrong" | null>(null);
  const finished = useRef(false);

  const finishIfOver = useCallback(() => {
    if (g.status === "finished" && !finished.current) { finished.current = true; onDone(g.result(Date.now())); }
  }, [g, onDone]);

  useEffect(() => {
    const id = setInterval(() => { g.tick(Date.now()); bump(); finishIfOver(); }, 100);
    return () => clearInterval(id);
  }, [g, finishIfOver]);

  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.focus();
    const judge = () => {
      const r = g.submit(Date.now());
      if (r) { setFlash(r); setTimeout(() => setFlash(null), 250); }
    };
    const before = (e: InputEvent) => {
      e.preventDefault();
      const now = Date.now();
      if (e.inputType === "insertText" && e.data) for (const ch of e.data) { if (ch === " ") judge(); else g.input(ch, now); }
      else if (e.inputType === "deleteContentBackward") g.backspace(now);
      else if (e.inputType === "insertLineBreak") judge();
      bump(); finishIfOver();
    };
    const key = (e: KeyboardEvent) => { if (e.key === "Enter") { e.preventDefault(); judge(); bump(); finishIfOver(); } };
    el.addEventListener("beforeinput", before);
    el.addEventListener("keydown", key);
    return () => { el.removeEventListener("beforeinput", before); el.removeEventListener("keydown", key); };
  }, [g, finishIfOver]);

  const s: WordRushSnapshot = g.snapshot(Date.now());
  const wordPct = (s.wordTimeLeftMs / s.wordBudgetMs) * 100;
  const timeLeft = Math.ceil(s.timeLeftMs / 1000);

  return (
    <div className="space-y-4" onClick={() => inputRef.current?.focus()}>
      <input
        ref={inputRef} aria-label="Type the word" className="absolute h-px w-px opacity-0" autoCapitalize="off" autoComplete="off" autoCorrect="off" spellCheck={false}
        onFocus={() => { setFocused(true); g.resume(Date.now()); bump(); }}
        onBlur={() => { setFocused(false); g.pause(Date.now()); bump(); }}
        onKeyDownCapture={(e) => { if (e.key === "Escape") inputRef.current?.blur(); }}
      />
      <Card className={cn("space-y-5 p-6 text-center transition-colors", flash === "correct" && "border-ok", flash === "wrong" && "border-bad")}>
        <div className="flex items-center justify-between">
          <div className="text-left"><div className="text-xs text-muted">Score</div><div className="font-mono text-3xl font-bold tabular-nums" data-testid="score">{s.score.toLocaleString()}</div></div>
          <span className={cn("rounded-full px-3 py-1 text-sm font-bold", s.combo > 0 ? "bg-warn/15 text-warn" : "bg-surface2 text-muted")} data-testid="combo">🔥 Combo {s.combo} · ×{s.multiplier}</span>
          <div className="text-right"><div className="text-xs text-muted">Time</div><div className={cn("font-mono text-3xl font-bold tabular-nums", timeLeft <= 10 && "text-bad")}>{timeLeft}s</div></div>
        </div>
        <div className="h-3 overflow-hidden rounded-full bg-surface2" role="progressbar" aria-label="Time for this word" aria-valuenow={Math.round(wordPct)} aria-valuemin={0} aria-valuemax={100}>
          <div className={cn("h-full rounded-full", wordPct < 30 ? "bg-bad" : "bg-accent")} style={{ width: `${wordPct}%` }} />
        </div>
        <div className="py-4 font-mono text-5xl font-bold tracking-wide sm:text-6xl" data-testid="word" aria-label={`Type: ${s.word}`}>
          {[...s.word].map((c, i) => (
            <span key={i} className={cn(i < s.typed.length ? (s.typed[i] === c ? "text-ok" : "text-bad underline") : "text-fg", i === s.typed.length && "border-b-4 border-accent")}>{c}</span>
          ))}
          {s.typed.length > s.word.length && <span className="text-bad">{s.typed.slice(s.word.length)}</span>}
        </div>
        <div className="mx-auto min-h-9 max-w-xs rounded-token border border-line bg-surface2 px-4 py-2 font-mono text-xl" aria-hidden="true">{s.typed || <span className="text-muted">type here…</span>}</div>
        <div className="flex flex-wrap items-center justify-center gap-2 text-sm text-muted">Up next: {s.upcoming.map((w) => <span key={w} className="rounded-full border border-line px-2.5 py-0.5 font-mono">{w}</span>)}</div>
      </Card>
      {!focused && <div className="text-center text-sm text-muted" role="status">Paused — click here to continue</div>}
      <p className="text-center text-xs text-muted">Space or Enter submits · Backspace edits · Esc pauses</p>
    </div>
  );
}

function Done({ result, bestScore, onAgain }: { result: WordRushResult; bestScore: number; onAgain: () => void }) {
  const [state, setState] = useState<"saving" | "saved" | "error" | "rejected">("saving");
  const [reply, setReply] = useState<Reply>({});
  const clientId = useRef("");
  const started = useRef(false);

  const save = useCallback(async () => {
    clientId.current ||= crypto.randomUUID(); // same id on retry: the server will not count it twice
    setState("saving");
    try {
      const res = await fetch("/api/games/word-rush", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({
          clientId: clientId.current, durationS: result.durationMs / 1000, wpm: result.wpm, rawWpm: result.rawWpm, accuracy: result.accuracy,
          errors: result.errors, keyStats: result.keyStats, score: result.score, cleared: result.cleared, maxCombo: result.maxCombo,
        }),
      });
      if (res.status === 400 || res.status === 422) { setState("rejected"); return; }
      if (!res.ok) throw new Error(String(res.status));
      setReply(await res.json());
      setState("saved");
    } catch { setState("error"); }
  }, [result]);

  useEffect(() => { if (!started.current) { started.current = true; void save(); } }, [save]);

  const stats: [string, string][] = [["WPM", String(Math.round(result.wpm))], ["Accuracy", `${Math.round(result.accuracy)}%`], ["Words", String(result.cleared)], ["Best combo", String(result.maxCombo)]];
  const record = reply.personalBest || (state !== "saved" && result.score > bestScore && bestScore > 0);

  return (
    <div className="space-y-4" data-testid="game-over">
      <Card className="space-y-4 py-8 text-center">
        <div className="text-sm text-muted">Game over</div>
        {state === "saved" && reply.personalBest && <div className="mx-auto w-fit rounded-full bg-ok/15 px-3 py-1 text-sm font-bold text-ok" data-testid="pb-banner">★ New high score{typeof reply.previousBest === "number" ? ` (was ${reply.previousBest.toLocaleString()})` : ""}</div>}
        <div className="font-mono text-7xl font-bold leading-none text-accent">{result.score.toLocaleString()}</div>
        <div className="text-sm text-muted">points{record && state !== "saved" ? " — a new best!" : ""}</div>
        <div className="flex flex-wrap justify-center gap-8">{stats.map(([k, v]) => <div key={k}><div className="text-xs text-muted">{k}</div><div className="text-xl font-bold">{v}</div></div>)}</div>
      </Card>

      {state === "saving" && <p role="status" className="text-center text-sm text-muted">Saving…</p>}
      {state === "saved" && <div className="mx-auto max-w-sm"><RewardsPanel rewards={reply.rewards} /></div>}
      {state === "error" && <Card role="alert" className="space-y-2 text-center"><p className="font-bold text-bad">Couldn’t save your result.</p><Button onClick={save}>Try saving again</Button></Card>}
      {state === "rejected" && <Card role="alert" className="text-center text-sm text-muted">This run couldn’t be counted (it didn’t pass our checks). Play another round!</Card>}

      <div className="flex flex-wrap justify-center gap-3">
        <Button size="lg" onClick={onAgain}>Play again</Button>
        <Link href="/app/games" className="inline-flex items-center px-3 py-2.5 text-sm font-semibold text-muted hover:text-fg">Back to games</Link>
      </div>
    </div>
  );
}
