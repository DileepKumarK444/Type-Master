import type { SessionResult } from "@typemaster/typing-engine";

export type PracticeMode = { seconds: number; punctuation: boolean; numbers: boolean };

/** Shape POSTed to /api/sessions (validated server-side by sessionInputSchema). */
export function toPayload(result: SessionResult, mode: PracticeMode, clientId: string, kind: "test" | "drill" = "test") {
  return {
    kind,
    clientId,
    durationS: Math.round(result.durationMs / 1000),
    wpm: result.wpm,
    rawWpm: result.rawWpm,
    accuracy: result.accuracy,
    consistency: result.consistency,
    errors: result.errors,
    keyStats: result.keyStats,
    mode,
  };
}
export type SessionPayload = ReturnType<typeof toPayload>;

/** Shape POSTed to /api/lessons/:id/complete — the lesson's final test (text mode, float duration). */
export function toLessonPayload(result: SessionResult, clientId: string) {
  return {
    clientId,
    durationS: result.durationMs / 1000,
    wpm: result.wpm,
    rawWpm: result.rawWpm,
    accuracy: result.accuracy,
    consistency: result.consistency,
    errors: result.errors,
    keyStats: result.keyStats,
  };
}
