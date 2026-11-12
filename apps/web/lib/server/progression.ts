import { and, eq, gte, inArray, sql } from "drizzle-orm";
import { lessonProgress, typingSessions, userBadges, users, type Db } from "@typemaster/db";
import { applyDailyCap, earnedBadgeIds, getBadge, levelFor, xpFor, type Activity, type UserStats } from "@typemaster/content";
import { getStreakInfo } from "./stats";

export type DbLike = Pick<Db, "select" | "insert" | "update" | "execute">;

export interface Rewards {
  xpAwarded: number;
  xpTotal: number;
  level: number;
  leveledUp: boolean;
  newBadges: { id: string; title: string; emoji: string }[];
}

const startOfUtcDay = (d: Date) => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));

/** Everything the badge rules need, computed from stored data. */
export async function getUserStats(db: DbLike, userId: string, now = new Date()): Promise<UserStats> {
  const passed = await db.select({ id: lessonProgress.lessonId }).from(lessonProgress).where(and(eq(lessonProgress.userId, userId), sql`${lessonProgress.stars} > 0`));
  const rows = await db.execute<{ tests: string; best_wpm: number | null; best_acc: number | null; games: string; best_score: number | null }>(sql`
    select
      count(*) filter (where type = 'test') as tests,
      max(wpm) filter (where type = 'test' and accuracy >= 90) as best_wpm,
      max(accuracy) filter (where type = 'test' and duration_s >= 30) as best_acc,
      count(*) filter (where type = 'game') as games,
      max(score) filter (where type = 'game') as best_score
    from typing_sessions where user_id = ${userId}`);
  const r = rows[0];
  return {
    lessonsPassed: passed.map((p) => p.id),
    testsCompleted: Number(r?.tests ?? 0),
    bestTestWpm: Number(r?.best_wpm ?? 0),
    bestTestAccuracy: Number(r?.best_acc ?? 0),
    streak: (await getStreakInfo(db, userId, now)).streak,
    gamesPlayed: Number(r?.games ?? 0),
    bestGameScore: Number(r?.best_score ?? 0),
  };
}

/**
 * Awards XP (with the accuracy gate and daily cap), updates the level and unlocks any newly earned badges.
 * Call inside the same transaction that inserted the session so a failure leaves nothing half-applied.
 * Badge inserts are conflict-safe, so a concurrent request cannot award the same badge twice.
 */
export async function applyProgression(db: DbLike, userId: string, sessionId: string, activity: Activity, now = new Date()): Promise<Rewards> {
  let earnedToday = 0;
  if (activity.kind !== "lesson") {
    const [row] = await db
      .select({ total: sql<number>`coalesce(sum(${typingSessions.xpAwarded}), 0)` })
      .from(typingSessions)
      .where(and(eq(typingSessions.userId, userId), inArray(typingSessions.type, ["test", "drill", "game"]), gte(typingSessions.createdAt, startOfUtcDay(now))));
    earnedToday = Number(row?.total ?? 0);
  }
  const xp = applyDailyCap(xpFor(activity), activity.kind, earnedToday);

  const [u] = await db.select({ xp: users.xp }).from(users).where(eq(users.id, userId)).limit(1);
  const before = u?.xp ?? 0;
  const total = before + xp;
  const level = levelFor(total);
  const leveledUp = level > levelFor(before);

  if (xp > 0) {
    await db.update(typingSessions).set({ xpAwarded: xp }).where(eq(typingSessions.id, sessionId));
    await db.update(users).set({ xp: total, level }).where(eq(users.id, userId));
  }

  const earned = earnedBadgeIds(await getUserStats(db, userId, now));
  let newBadges: Rewards["newBadges"] = [];
  if (earned.length) {
    const inserted = await db.insert(userBadges).values(earned.map((badgeId) => ({ userId, badgeId }))).onConflictDoNothing().returning({ id: userBadges.badgeId });
    newBadges = inserted.map((i) => getBadge(i.id)).filter((b): b is NonNullable<typeof b> => !!b).map((b) => ({ id: b.id, title: b.title, emoji: b.emoji }));
  }
  return { xpAwarded: xp, xpTotal: total, level, leveledUp, newBadges };
}

export async function getEarnedBadges(db: DbLike, userId: string) {
  return db.select({ id: userBadges.badgeId, earnedAt: userBadges.earnedAt }).from(userBadges).where(eq(userBadges.userId, userId));
}

export async function getXp(db: DbLike, userId: string): Promise<number> {
  const [u] = await db.select({ xp: users.xp }).from(users).where(eq(users.id, userId)).limit(1);
  return u?.xp ?? 0;
}
