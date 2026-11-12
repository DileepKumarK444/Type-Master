import { and, eq, gte, sql } from "drizzle-orm";
import { typingSessions, type Db } from "@typemaster/db";
import { getKeyStats } from "./sessions";

/**
 * Analytics (docs/02 M6). Pure helpers first (unit-tested), then thin DB wrappers.
 * Days are UTC calendar days for now; per-user timezones arrive with streak rules in M5.
 * Speed/accuracy/consistency come from timed tests only (lesson drills are not comparable);
 * practice time counts every session.
 */

export interface SessionLite {
  createdAt: Date;
  type: string;
  durationS: number;
  wpm: number;
  accuracy: number;
  consistency: number;
}

export interface Summary { sessions: number; avgWpm: number; bestWpm: number; avgAccuracy: number; avgConsistency: number; minutes: number }

const DAY = 86_400_000;
export const dayKey = (d: Date) => d.toISOString().slice(0, 10);
const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
const r1 = (n: number) => Math.round(n * 10) / 10;

/** Rows whose timestamp is in (now - days, now]. */
export const inWindow = (rows: SessionLite[], now: Date, days: number, offsetDays = 0) =>
  rows.filter((r) => {
    const age = now.getTime() - offsetDays * DAY - r.createdAt.getTime();
    return age >= 0 && age < days * DAY;
  });

export function summarize(rows: SessionLite[]): Summary {
  const tests = rows.filter((r) => r.type === "test");
  return {
    sessions: rows.length,
    avgWpm: r1(avg(tests.map((r) => r.wpm))),
    bestWpm: r1(Math.max(0, ...tests.map((r) => r.wpm))),
    avgAccuracy: r1(avg(tests.map((r) => r.accuracy))),
    avgConsistency: r1(avg(tests.map((r) => r.consistency))),
    minutes: Math.round(rows.reduce((a, r) => a + r.durationS, 0) / 60),
  };
}

/** Summary of the last `days` days and of the `days` before that, for "+4 vs last period" deltas. */
export function compare(rows: SessionLite[], now: Date, days: number) {
  return { current: summarize(inWindow(rows, now, days)), previous: summarize(inWindow(rows, now, days, days)) };
}

/** One entry per UTC day ending today; `wpm` is the day's average test speed, or null if no test that day. */
export function dailySeries(rows: SessionLite[], now: Date, days: number): { day: string; wpm: number | null; minutes: number; sessions: number }[] {
  const byDay = new Map<string, SessionLite[]>();
  for (const r of rows) {
    const k = dayKey(r.createdAt);
    byDay.set(k, [...(byDay.get(k) ?? []), r]);
  }
  return Array.from({ length: days }, (_, i) => {
    const day = dayKey(new Date(now.getTime() - (days - 1 - i) * DAY));
    const list = byDay.get(day) ?? [];
    const tests = list.filter((r) => r.type === "test");
    return { day, wpm: tests.length ? r1(avg(tests.map((r) => r.wpm))) : null, minutes: Math.round((list.reduce((a, r) => a + r.durationS, 0) / 60) * 10) / 10, sessions: list.length };
  });
}

export interface StreakInfo {
  /** consecutive practice days (a bridged day does not add to the count) */
  streak: number;
  /** true if a missed day was forgiven within the last 7 days, so no freeze is available right now */
  freezeUsed: boolean;
}

/**
 * Consecutive practice days ending today (or yesterday, so an unfinished today does not reset the count).
 * One free "freeze" per rolling 7 days: a single missed day is bridged when the days either side were both
 * practised and no other day was bridged in the 7 days before it.
 */
export function streakInfo(days: ReadonlySet<string>, now: Date): StreakInfo {
  const at = (back: number) => dayKey(new Date(now.getTime() - back * DAY));
  const has = (back: number) => days.has(at(back));
  let back = has(0) ? 0 : 1;
  if (!has(back)) return { streak: 0, freezeUsed: false };
  let streak = 0;
  let nearestBridge: number | null = null; // days back of the most recent forgiven day
  let prevBridge: number | null = null; // the forgiven day we walked past most recently (older as we go)
  while (back < 400) {
    if (has(back)) { streak++; back++; continue; }
    const canBridge = has(back + 1) && (prevBridge === null || back - prevBridge >= 7);
    if (!canBridge) break;
    nearestBridge ??= back;
    prevBridge = back;
    back++;
  }
  return { streak, freezeUsed: nearestBridge !== null && nearestBridge < 7 };
}

export const streakDays = (days: ReadonlySet<string>, now: Date): number => streakInfo(days, now).streak;

export interface KeyRow { key: string; hits: number; misses: number }
export interface WeakKey { key: string; accuracy: number; misses: number; attempts: number }

const acc = (k: KeyRow) => (k.hits / (k.hits + k.misses)) * 100;

/**
 * Keys with enough attempts to judge, a real number of misses, AND accuracy below `maxAccuracy`, worst first.
 * (Without the accuracy ceiling, your most-used keys would always look "weak" just from volume.)
 */
export function weakKeys(rows: KeyRow[], opts: { minAttempts?: number; minMisses?: number; maxAccuracy?: number; limit?: number } = {}): WeakKey[] {
  const { minAttempts = 20, minMisses = 3, maxAccuracy = 95, limit = 6 } = opts;
  return rows
    .filter((k) => k.key !== " " && k.hits + k.misses >= minAttempts && k.misses >= minMisses && acc(k) < maxAccuracy)
    .map((k) => ({ key: k.key, accuracy: r1(acc(k)), misses: k.misses, attempts: k.hits + k.misses }))
    .sort((a, b) => a.accuracy - b.accuracy || b.misses - a.misses)
    .slice(0, limit);
}

/** Accuracy per key for the heatmap (keys with too few attempts are omitted, not shown as perfect). */
export function keyAccuracy(rows: KeyRow[], minAttempts = 10): Record<string, number> {
  const out: Record<string, number> = {};
  for (const k of rows) if (k.key !== " " && k.hits + k.misses >= minAttempts) out[k.key] = r1(acc(k));
  return out;
}

// ---------- DB wrappers ----------

export async function sessionsSince(db: Db, userId: string, since: Date): Promise<SessionLite[]> {
  return db
    .select({
      createdAt: typingSessions.createdAt, type: typingSessions.type, durationS: typingSessions.durationS,
      wpm: typingSessions.wpm, accuracy: typingSessions.accuracy, consistency: typingSessions.consistency,
    })
    .from(typingSessions)
    .where(and(eq(typingSessions.userId, userId), gte(typingSessions.createdAt, since)));
}

export async function getWeakKeys(db: Db, userId: string, limit = 6): Promise<WeakKey[]> {
  return weakKeys(await getKeyStats(db, userId), { limit });
}

export async function getKeyAccuracy(db: Db, userId: string) {
  return keyAccuracy(await getKeyStats(db, userId));
}

export async function getStreakInfo(db: Pick<Db, "execute">, userId: string, now = new Date()): Promise<StreakInfo> {
  const rows = await db.execute<{ d: string }>(sql`
    select distinct to_char((created_at at time zone 'UTC')::date, 'YYYY-MM-DD') as d
    from typing_sessions where user_id = ${userId} and created_at >= ${new Date(now.getTime() - 400 * DAY).toISOString()}::timestamptz`);
  return streakInfo(new Set(rows.map((r) => r.d)), now);
}

export const getStreak = async (db: Pick<Db, "execute">, userId: string, now = new Date()) => (await getStreakInfo(db, userId, now)).streak;

/** Single saved session, only if it belongs to the user. */
export async function getSession(db: Db, userId: string, id: string) {
  const [row] = await db.select().from(typingSessions).where(and(eq(typingSessions.id, id), eq(typingSessions.userId, userId))).limit(1);
  return row ?? null;
}
