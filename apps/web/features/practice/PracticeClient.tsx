"use client";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { isCodeTemplate, templateInfo, templateText } from "@typemaster/content";
import { generateText, type SessionMode } from "@typemaster/typing-engine";
import { LiveStats } from "@/components/typing/LiveStats";
import { ResultsCard } from "@/components/typing/ResultsCard";
import { TypingSurface } from "@/components/typing/TypingSurface";
import { VirtualKeyboard } from "@/components/typing/VirtualKeyboard";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Progress } from "@/components/ui/Progress";
import { Tabs } from "@/components/ui/Tabs";
import { Toggle } from "@/components/ui/Toggle";
import { saveResult, type SaveResult } from "@/lib/client/outbox";
import { toPayload } from "@/lib/session-payload";
import { useTypingSession } from "./useTypingSession";

const DURATIONS = [15, 30, 60, 120];
const FREE_LENGTHS: (number | null)[] = [25, 50, 100, null]; // null = endless (ends with "Finish now")
export type Mode = number | "free";
export type Template = { id: string; label: string };

type Props = {
  signedIn: boolean;
  showKeyboard: boolean;
  /** practise a template (a key, a row, common words, code…) instead of random words */
  template?: Template;
  initialMode?: Mode;
  initialWords?: number | null;
  /** landing page: no controls, no keyboard, fixed length */
  compact?: boolean;
  lockedSeconds?: number;
};

export function PracticeClient({ signedIn, showKeyboard, template, initialMode, initialWords, compact = false, lockedSeconds }: Props) {
  const [mode, setMode] = useState<Mode>(lockedSeconds ?? initialMode ?? 60);
  const [words, setWords] = useState<number | null>(initialWords === undefined ? 50 : initialWords);
  const [punctuation, setPunctuation] = useState(false);
  const [numbers, setNumbers] = useState(false);
  const [seed, setSeed] = useState<number | null>(null); // null until mounted (avoids SSR text mismatch)

  useEffect(() => setSeed(Math.floor(Math.random() * 2 ** 31)), []);
  const restart = useCallback(() => setSeed(Math.floor(Math.random() * 2 ** 31)), []);

  if (seed === null) return <Card className="h-64 animate-pulse" aria-busy="true" aria-label="Loading" />;

  const controls = compact ? null : (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <Tabs
          items={[...DURATIONS.map((d) => `${d}s`), "No timer"]}
          defaultIndex={mode === "free" ? DURATIONS.length : DURATIONS.indexOf(mode)}
          onChange={(i) => setMode(i === DURATIONS.length ? "free" : DURATIONS[i])}
        />
        {mode === "free" && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted">Length</span>
            <Tabs items={["25 words", "50 words", "100 words", "Endless"]} defaultIndex={FREE_LENGTHS.indexOf(words)} onChange={(i) => setWords(FREE_LENGTHS[i])} />
          </div>
        )}
      </div>
      {template ? (
        <div className="flex items-center gap-2 text-sm font-semibold">
          <span className="rounded-full bg-accent-soft px-3 py-1 text-accent">Focus: {template.label}</span>
          <Link href="/app/practice/keys" className="text-muted underline hover:text-fg">Change</Link>
        </div>
      ) : (
        <div className="flex items-center gap-5 text-sm font-semibold">
          <label className="flex items-center gap-2">Punctuation <Toggle label="Punctuation" defaultOn={punctuation} onChange={setPunctuation} /></label>
          <label className="flex items-center gap-2">Numbers <Toggle label="Numbers" defaultOn={numbers} onChange={setNumbers} /></label>
        </div>
      )}
    </div>
  );

  return (
    <Run
      key={`${seed}-${mode}-${words}-${punctuation}-${numbers}`}
      mode={mode} words={words} seed={seed} punctuation={punctuation} numbers={numbers} template={template}
      restart={restart} signedIn={signedIn} showKeyboard={showKeyboard} compact={compact} controls={controls}
    />
  );
}

function Run({ mode, words, seed, punctuation, numbers, template, restart, controls, signedIn, showKeyboard, compact }: {
  mode: Mode; words: number | null; seed: number; punctuation: boolean; numbers: boolean; template?: Template; restart: () => void;
  controls: React.ReactNode; signedIn: boolean; showKeyboard: boolean; compact: boolean;
}) {
  const free = mode === "free";
  const seconds = free ? 0 : mode;
  const code = !!template && isCodeTemplate(template.id);

  // Timed: enough text that nobody finishes before the clock (≈ 250 WPM). Free: the chosen length (endless ≈ 400 words).
  const targetWords = free ? (words ?? 400) : Math.ceil((seconds / 60) * 250) + 20;
  const text = useRef(template ? templateText(template.id, seed, targetWords) : generateText({ words: targetWords, seed, punctuation, numbers })).current;
  const sessionMode: SessionMode = free ? { kind: "text" } : { kind: "time", seconds };
  const { session, snap, type, back, pause, resume, finish } = useTypingSession(text, sessionMode);
  const [pressed, setPressed] = useState<string>();
  const [version, setVersion] = useState(0);

  const onChar = (ch: string) => {
    type(ch);
    setPressed(ch);
    setVersion((v) => v + 1);
    setTimeout(() => setPressed(undefined), 110);
  };
  const onBack = () => { back(); setVersion((v) => v + 1); };

  const finished = snap.status === "finished";
  const result = useMemo(() => (finished ? session.result(Date.now()) : null), [finished, session]);
  const kind = free ? "free" : template ? "drill" : "test";
  const [save, setSave] = useState<SaveResult>({ state: "saving" });
  const saved = useRef(false);
  const clientId = useRef<string>("");
  const doSave = useCallback(async () => {
    if (!result) return;
    clientId.current ||= crypto.randomUUID();
    setSave({ state: "saving" });
    const payloadMode = free ? ({ free: true, words } as const) : { seconds, punctuation, numbers };
    setSave(await saveResult(toPayload(result, payloadMode, clientId.current, kind), signedIn));
  }, [result, free, words, seconds, punctuation, numbers, signedIn, kind]);
  useEffect(() => {
    if (result && !saved.current) { saved.current = true; void doSave(); }
  }, [result, doSave]);

  // words typed so far (for the live "Words 18 / 50" counter)
  const totalWords = useMemo(() => text.split(/\s+/).filter(Boolean).length, [text]);
  const typed = text.slice(0, snap.index);
  let doneWords = typed.split(/\s+/).filter(Boolean).length;
  if (typed && !/\s$/.test(typed) && snap.index < text.length) doneWords -= 1; // the word in progress is not done yet

  const progress = free ? (snap.index / text.length) * 100 : snap.remainingMs === null ? 0 : (1 - snap.remainingMs / (seconds * 1000)) * 100;
  const keys = template ? templateInfo(template.id)?.keys ?? [] : [];

  return (
    <div className="space-y-4">
      {!finished && controls}
      {finished ? (
        <ResultsCard result={result!} onRetry={restart} save={save} onRetrySave={doSave} signedIn={signedIn} drill={!!template} free={free} compact={compact} />
      ) : (
        <>
          <Card className="space-y-4 p-6">
            <LiveStats snap={snap} words={free ? { done: doneWords, total: words === null ? null : totalWords } : undefined} />
            <Progress value={progress} label={free ? "Progress through the text" : "Time elapsed"} />
            <TypingSurface
              session={session} version={version} onChar={onChar} onBackspace={onBack} onRestart={restart}
              onFocusChange={(f) => (f ? resume() : pause())} autoFocus={!compact}
            />
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs text-muted">
                {code
                  ? "Press Enter at the end of each line · indent with spaces (not Tab) · Esc pauses"
                  : free
                    ? "No timer: take your time. Backspace works · Tab then Enter restarts · Esc pauses"
                    : "Timer starts on your first key · Backspace works · Tab then Enter restarts · Esc pauses"}
              </span>
              <div className="flex gap-2">
                <Button size="sm" variant="secondary" onClick={restart}>Restart</Button>
                {free && <Button size="sm" onClick={finish}>Finish now</Button>}
              </div>
            </div>
          </Card>
          {free && !compact && (
            <p className="rounded-token bg-accent-soft px-4 py-3 text-xs">
              <b>No timer:</b> saved to your history and key accuracy, but it earns no XP and isn’t compared with your personal bests.
            </p>
          )}
          {showKeyboard && !compact && <Card className="hidden md:block"><VirtualKeyboard next={session.nextChar} pressed={pressed} highlight={keys} /></Card>}
        </>
      )}
    </div>
  );
}
