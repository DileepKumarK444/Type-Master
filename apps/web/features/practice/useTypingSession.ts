"use client";
import { useCallback, useEffect, useMemo, useReducer } from "react";
import { TypingSession, type SessionMode, type Snapshot } from "@typemaster/typing-engine";

/** Owns one engine session and re-renders React at ≤5 Hz while running (plus on each keystroke). */
export function useTypingSession(text: string, mode: SessionMode) {
  const seconds = mode.kind === "time" ? mode.seconds : 0;
  // eslint-disable-next-line react-hooks/exhaustive-deps -- `mode` is a fresh object each render; kind+seconds identify it
  const session = useMemo(() => new TypingSession({ text, mode }), [text, mode.kind, seconds]);
  const [, bump] = useReducer((n: number) => n + 1, 0);

  useEffect(() => {
    const id = setInterval(() => {
      if (session.status === "running") {
        session.tick(Date.now());
        bump();
      }
    }, 200);
    return () => clearInterval(id);
  }, [session]);

  const type = useCallback((ch: string) => { if (session.input(ch, Date.now())) bump(); }, [session]);
  const back = useCallback(() => { if (session.backspace(Date.now())) bump(); }, [session]);
  const pause = useCallback(() => { session.pause(Date.now()); bump(); }, [session]);
  const resume = useCallback(() => { session.resume(Date.now()); bump(); }, [session]);
  /** End an untimed session now ("Finish now"). */
  const finish = useCallback(() => { if (session.stop(Date.now())) bump(); }, [session]);

  const snap: Snapshot = session.snapshot(Date.now());
  return { session, snap, type, back, pause, resume, finish };
}
