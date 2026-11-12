"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { weakKeyDrill } from "@typemaster/content";
import { generateText } from "@typemaster/typing-engine";
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

export function PracticeClient({ signedIn, showKeyboard, drillKeys, compact = false, lockedSeconds }: { signedIn: boolean; showKeyboard: boolean; drillKeys?: string[]; compact?: boolean; lockedSeconds?: number }) {
  const [seconds, setSeconds] = useState(lockedSeconds ?? 60);
  const [punctuation, setPunctuation] = useState(false);
  const [numbers, setNumbers] = useState(false);
  const [seed, setSeed] = useState<number | null>(null); // null until mounted (avoids SSR text mismatch)

  useEffect(() => setSeed(Math.floor(Math.random() * 2 ** 31)), []);
  const restart = useCallback(() => setSeed(Math.floor(Math.random() * 2 ** 31)), []);

  if (seed === null) return <Card className="h-64 animate-pulse" aria-busy="true" aria-label="Loading" />;

  return (
    <Run key={`${seed}-${seconds}-${punctuation}-${numbers}`} seconds={seconds} seed={seed}
      punctuation={punctuation} numbers={numbers} restart={restart} signedIn={signedIn} showKeyboard={showKeyboard} drillKeys={drillKeys} compact={compact}
      controls={compact ? null : (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Tabs items={DURATIONS.map((d) => `${d}s`)} defaultIndex={DURATIONS.indexOf(seconds)} onChange={(i) => setSeconds(DURATIONS[i])} />
          {drillKeys ? (
            <div className="flex items-center gap-2 text-sm font-semibold" aria-label="Weak-key drill">
              Weak-key drill:
              {drillKeys.map((k) => <kbd key={k} className="grid h-7 min-w-7 place-items-center rounded-md border border-line bg-bad/15 px-1.5 font-mono uppercase">{k}</kbd>)}
            </div>
          ) : (
            <div className="flex items-center gap-5 text-sm font-semibold">
              <label className="flex items-center gap-2">Punctuation <Toggle label="Punctuation" defaultOn={punctuation} onChange={setPunctuation} /></label>
              <label className="flex items-center gap-2">Numbers <Toggle label="Numbers" defaultOn={numbers} onChange={setNumbers} /></label>
            </div>
          )}
        </div>
      )}
    />
  );
}

function Run({ seconds, seed, punctuation, numbers, restart, controls, signedIn, showKeyboard, drillKeys, compact }: {
  seconds: number; seed: number; punctuation: boolean; numbers: boolean; restart: () => void; controls: React.ReactNode;
  signedIn: boolean; showKeyboard: boolean; drillKeys?: string[]; compact: boolean;
}) {
  const drill = !!drillKeys?.length;
  // Enough words that nobody finishes the text before the timer (≈ 250 WPM ceiling).
  const words = Math.ceil((seconds / 60) * 250) + 20;
  const text = useRef(drill ? weakKeyDrill(drillKeys!, seed, words) : generateText({ words, seed, punctuation, numbers })).current;
  const { session, snap, type, back, pause, resume } = useTypingSession(text, { kind: "time", seconds });
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
  const [save, setSave] = useState<SaveResult>({ state: "saving" });
  const saved = useRef(false);
  const clientId = useRef<string>("");
  const doSave = useCallback(async () => {
    if (!result) return;
    clientId.current ||= crypto.randomUUID();
    setSave({ state: "saving" });
    setSave(await saveResult(toPayload(result, { seconds, punctuation, numbers }, clientId.current, drill ? "drill" : "test"), signedIn));
  }, [result, seconds, punctuation, numbers, signedIn, drill]);
  useEffect(() => {
    if (result && !saved.current) { saved.current = true; void doSave(); }
  }, [result, doSave]);
  const progress = snap.remainingMs === null ? 0 : (1 - snap.remainingMs / (seconds * 1000)) * 100;

  return (
    <div className="space-y-4">
      {!finished && controls}
      {finished ? (
        <ResultsCard result={result!} onRetry={restart} save={save} onRetrySave={doSave} signedIn={signedIn} drill={drill} compact={compact} />
      ) : (
        <>
          <Card className="space-y-4 p-6">
            <LiveStats snap={snap} />
            <Progress value={progress} label="Time elapsed" />
            <TypingSurface
              session={session} version={version} onChar={onChar} onBackspace={onBack} onRestart={restart}
              onFocusChange={(f) => (f ? resume() : pause())} autoFocus={!compact}
            />
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs text-muted">Timer starts on your first key · Backspace works · Tab then Enter restarts · Esc pauses</span>
              <Button size="sm" variant="secondary" onClick={restart}>Restart</Button>
            </div>
          </Card>
          {showKeyboard && !compact && <Card className="hidden md:block"><VirtualKeyboard next={session.nextChar} pressed={pressed} /></Card>}
        </>
      )}
    </div>
  );
}
