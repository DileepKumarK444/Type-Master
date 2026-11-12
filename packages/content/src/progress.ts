import type { LessonDef } from "./lessons";

export interface Attempt { accuracy: number; wpm: number }

/**
 * 0 = not passed. 1 = met the accuracy gate. 2 = accuracy >= 96%. 3 = accuracy >= 98% and
 * speed at the lesson's target WPM.
 */
export function computeStars(def: Pick<LessonDef, "passAccuracy" | "targetWpm">, a: Attempt): 0 | 1 | 2 | 3 {
  if (a.accuracy < def.passAccuracy) return 0;
  if (a.accuracy >= 98 && a.wpm >= def.targetWpm) return 3;
  if (a.accuracy >= 96) return 2;
  return 1;
}

/** Lesson N unlocks once lesson N-1 has been passed (>= 1 star). Lesson 1 is always open. */
export function isUnlocked(id: number, starsByLesson: ReadonlyMap<number, number>): boolean {
  return id === 1 || (starsByLesson.get(id - 1) ?? 0) >= 1;
}

const show = (k: string) => (k === " " ? "space" : k.length === 1 ? k.toUpperCase() : k);

/** One specific, actionable sentence for a failed attempt. */
export function failureTip(r: {
  keyStats: Record<string, { hits: number; misses: number }>;
  confusions?: Record<string, Record<string, number>>;
  accuracy: number;
  passAccuracy: number;
}): string {
  let best: { expected: string; typed: string; n: number } | null = null;
  for (const [expected, row] of Object.entries(r.confusions ?? {}))
    for (const [typed, n] of Object.entries(row)) if (n >= 2 && (!best || n > best.n)) best = { expected, typed, n };
  if (best) return `You typed ${show(best.typed)} instead of ${show(best.expected)} ${best.n} times. Slow down and look for ${show(best.expected)} before you press.`;

  const worst = Object.entries(r.keyStats).filter(([, s]) => s.misses >= 2).sort((a, b) => b[1].misses - a[1].misses)[0];
  if (worst) return `${show(worst[0])} gave you the most trouble (${worst[1].misses} misses). Find it slowly a few times before speeding up.`;

  return `Accuracy was ${Math.round(r.accuracy)}% and you need ${r.passAccuracy}%. Slow down a little — accuracy comes before speed.`;
}
