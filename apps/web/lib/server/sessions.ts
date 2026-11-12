import { and, desc, eq, ne, sql } from "drizzle-orm";
import { keyStats, typingSessions, type Db, type SessionMode } from "@typemaster/db";
import type { SessionInput } from "./validation";

/** Thrown when the user id (e.g. from a still-valid JWT) no longer exists, such as after account deletion. */
export class UserGoneError extends Error {}

export const pgCode = (e: unknown) => (e as { code?: string; cause?: { code?: string } })?.code ?? (e as { cause?: { code?: string } })?.cause?.code;

/** Every query below is scoped by userId: that is the ownership boundary (no cross-user reads/writes). */

/** Fields stored for a session. `mode` and `durationS` are separate so lessons can pass a rounded float duration. */
export type StoredSession = Omit<SessionInput, "mode" | "durationS" | "kind"> & { durationS: number; mode: SessionMode };
export interface SessionMeta { type: "test" | "drill" | "lesson" | "game"; lessonId?: number; score?: number }

export interface SaveOutcome {
  id: string;
  duplicate: boolean;
  /** Timed tests (WPM, per test length) and games (score): true when this beats every earlier one. */
  personalBest?: boolean;
  /** Best earlier WPM / score; null the first time. */
  previousBest?: number | null;
  /** XP, level and badges earned by this session (set by recordPractice / recordGame / completeLesson). */
  rewards?: import("./progression").Rewards;
}

/** Runs inside an existing transaction (or any db handle). Idempotent on (userId, clientId). */
export async function saveSessionIn(
  tx: Pick<Db, "insert" | "select">,
  userId: string,
  input: StoredSession,
  meta: SessionMeta = { type: "test" },
): Promise<SaveOutcome> {
  const inserted = await tx
    .insert(typingSessions)
    .values({
      userId, clientId: input.clientId, type: meta.type, lessonId: meta.lessonId ?? null, durationS: Math.round(input.durationS), score: meta.score ?? null,
      wpm: input.wpm, rawWpm: input.rawWpm, accuracy: input.accuracy, consistency: input.consistency, errors: input.errors, mode: input.mode,
    })
    .onConflictDoNothing({ target: [typingSessions.userId, typingSessions.clientId] })
    .returning({ id: typingSessions.id });

  if (inserted.length === 0) {
    const [existing] = await tx
      .select({ id: typingSessions.id }).from(typingSessions)
      .where(and(eq(typingSessions.userId, userId), eq(typingSessions.clientId, input.clientId))).limit(1);
    return { id: existing.id, duplicate: true };
  }

  for (const [key, s] of Object.entries(input.keyStats)) {
    await tx
      .insert(keyStats)
      .values({ userId, key, hits: s.hits, misses: s.misses })
      .onConflictDoUpdate({
        target: [keyStats.userId, keyStats.key],
        set: { hits: sql`${keyStats.hits} + ${s.hits}`, misses: sql`${keyStats.misses} + ${s.misses}` },
      });
  }
  const id = inserted[0].id;
  if (meta.type === "test" && "seconds" in input.mode) {
    const [row] = await tx
      .select({ best: sql<number | null>`max(${typingSessions.wpm})` })
      .from(typingSessions)
      .where(and(eq(typingSessions.userId, userId), eq(typingSessions.type, "test"), ne(typingSessions.id, id), sql`${typingSessions.mode}->>'seconds' = ${String(input.mode.seconds)}`));
    const previousBest = row?.best ?? null;
    return { id, duplicate: false, previousBest, personalBest: previousBest !== null && input.wpm > previousBest };
  }
  if (meta.type === "game") {
    const [row] = await tx
      .select({ best: sql<number | null>`max(${typingSessions.score})` })
      .from(typingSessions)
      .where(and(eq(typingSessions.userId, userId), eq(typingSessions.type, "game"), ne(typingSessions.id, id)));
    const previousBest = row?.best ?? null;
    return { id, duplicate: false, previousBest, personalBest: previousBest !== null && (meta.score ?? 0) > previousBest };
  }
  return { id, duplicate: false };
}

export async function saveSession(db: Db, userId: string, input: SessionInput): Promise<SaveOutcome> {
  try {
    return await db.transaction((tx) => saveSessionIn(tx, userId, input, { type: input.kind }));
  } catch (e) {
    if (pgCode(e) === "23503") throw new UserGoneError(); // foreign-key violation: user row is gone
    throw e;
  }
}

export async function listSessions(db: Db, userId: string, limit = 30) {
  return db
    .select({
      id: typingSessions.id, createdAt: typingSessions.createdAt, type: typingSessions.type, lessonId: typingSessions.lessonId,
      durationS: typingSessions.durationS, score: typingSessions.score, wpm: typingSessions.wpm, accuracy: typingSessions.accuracy,
      consistency: typingSessions.consistency, errors: typingSessions.errors, mode: typingSessions.mode,
    })
    .from(typingSessions)
    .where(eq(typingSessions.userId, userId))
    .orderBy(desc(typingSessions.createdAt))
    .limit(Math.min(Math.max(limit, 1), 200));
}

export async function getKeyStats(db: Db, userId: string) {
  return db.select({ key: keyStats.key, hits: keyStats.hits, misses: keyStats.misses }).from(keyStats).where(eq(keyStats.userId, userId));
}
