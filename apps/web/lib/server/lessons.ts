import { and, eq } from "drizzle-orm";
import { lessonProgress, type Db } from "@typemaster/db";
import { LESSONS, computeStars, getLesson, isUnlocked } from "@typemaster/content";
import { applyProgression, type Rewards } from "./progression";
import { UserGoneError, pgCode, saveSessionIn } from "./sessions";
import type { LessonCompleteInput } from "./validation";

export interface ProgressRow { lessonId: number; stars: number; bestWpm: number; bestAccuracy: number; attempts: number }

export async function getProgress(db: Db, userId: string): Promise<ProgressRow[]> {
  return db
    .select({ lessonId: lessonProgress.lessonId, stars: lessonProgress.stars, bestWpm: lessonProgress.bestWpm, bestAccuracy: lessonProgress.bestAccuracy, attempts: lessonProgress.attempts })
    .from(lessonProgress)
    .where(eq(lessonProgress.userId, userId));
}

export const starsMap = (rows: ProgressRow[]) => new Map(rows.map((r) => [r.lessonId, r.stars]));

export type CompleteResult =
  | { ok: true; passed: boolean; stars: number; bestStars: number; duplicate: boolean; nextLessonId: number | null; rewards?: Rewards }
  | { ok: false; reason: "unknown_lesson" | "locked" };

/**
 * Records a lesson's final test. Session + progress are written in one transaction, so a failure can never
 * leave a saved session without its progress. Retrying the same clientId is a no-op (duplicate: true).
 * Pass/stars are computed here from the validated numbers, never taken from the client.
 */
export async function completeLesson(db: Db, userId: string, lessonId: number, input: LessonCompleteInput): Promise<CompleteResult> {
  const def = getLesson(lessonId);
  if (!def) return { ok: false, reason: "unknown_lesson" };
  const next = LESSONS.some((l) => l.id === lessonId + 1) ? lessonId + 1 : null;

  try {
    return await db.transaction(async (tx) => {
      const rows = await tx.select().from(lessonProgress).where(eq(lessonProgress.userId, userId));
      const prev = rows.find((r) => r.lessonId === lessonId);
      if (!isUnlocked(lessonId, new Map(rows.map((r) => [r.lessonId, r.stars])))) return { ok: false, reason: "locked" } as const;

      const stars = computeStars(def, { accuracy: input.accuracy, wpm: input.wpm });
      const session = await saveSessionIn(tx, userId, { ...input, mode: { lessonId } }, { type: "lesson", lessonId });
      if (session.duplicate) {
        return { ok: true, passed: stars > 0, stars, bestStars: prev?.stars ?? 0, duplicate: true, nextLessonId: next } as const;
      }

      const bestStars = Math.max(prev?.stars ?? 0, stars);
      const row = {
        // Best scores only come from passing attempts: a failed run must not set a "record".
        bestWpm: stars > 0 ? Math.max(prev?.bestWpm ?? 0, input.wpm) : (prev?.bestWpm ?? 0),
        bestAccuracy: stars > 0 ? Math.max(prev?.bestAccuracy ?? 0, input.accuracy) : (prev?.bestAccuracy ?? 0),
        stars: bestStars,
        attempts: (prev?.attempts ?? 0) + 1,
        completedAt: prev?.completedAt ?? (stars > 0 ? new Date() : null),
      };
      await tx
        .insert(lessonProgress)
        .values({ userId, lessonId, ...row })
        .onConflictDoUpdate({ target: [lessonProgress.userId, lessonProgress.lessonId], set: row });
      const rewards = await applyProgression(tx, userId, session.id, { kind: "lesson", stars, previousBestStars: prev?.stars ?? 0 });
      return { ok: true, passed: stars > 0, stars, bestStars, duplicate: false, nextLessonId: next, rewards } as const;
    });
  } catch (e) {
    if (pgCode(e) === "23503") throw new UserGoneError();
    throw e;
  }
}

export async function getLessonProgress(db: Db, userId: string, lessonId: number) {
  const [r] = await db.select().from(lessonProgress).where(and(eq(lessonProgress.userId, userId), eq(lessonProgress.lessonId, lessonId))).limit(1);
  return r ?? null;
}
