import { eq } from "drizzle-orm";
import { typingSessions, userSettings, users, type Db } from "@typemaster/db";
import { getKeyStats } from "./sessions";
import type { z } from "zod";
import type { profileUpdateSchema } from "./validation";

export async function getProfile(db: Db, userId: string) {
  const [row] = await db
    .select({
      id: users.id, email: users.email, displayName: users.displayName, xp: users.xp, level: users.level, createdAt: users.createdAt,
      goalWpm: userSettings.goalWpm, dailyMinutes: userSettings.dailyMinutes, layout: userSettings.layout, prefs: userSettings.prefs,
    })
    .from(users).leftJoin(userSettings, eq(userSettings.userId, users.id)).where(eq(users.id, userId)).limit(1);
  return row ?? null;
}

export async function updateProfile(db: Db, userId: string, patch: z.infer<typeof profileUpdateSchema>) {
  await db.transaction(async (tx) => {
    if (patch.displayName !== undefined) await tx.update(users).set({ displayName: patch.displayName }).where(eq(users.id, userId));
    const s: Partial<typeof userSettings.$inferInsert> = {};
    if (patch.goalWpm !== undefined) s.goalWpm = patch.goalWpm;
    if (patch.dailyMinutes !== undefined) s.dailyMinutes = patch.dailyMinutes;
    if (patch.prefs !== undefined) {
      const [cur] = await tx.select({ prefs: userSettings.prefs }).from(userSettings).where(eq(userSettings.userId, userId)).limit(1);
      s.prefs = { ...(cur?.prefs ?? {}), ...patch.prefs };
    }
    if (Object.keys(s).length) await tx.update(userSettings).set(s).where(eq(userSettings.userId, userId));
  });
  return getProfile(db, userId);
}

/** GDPR-style export: everything we hold about the user, never including the password hash. */
export async function exportData(db: Db, userId: string) {
  const profile = await getProfile(db, userId);
  const sessions = await db.select().from(typingSessions).where(eq(typingSessions.userId, userId));
  return { exportedAt: new Date().toISOString(), profile, sessions, keyStats: await getKeyStats(db, userId) };
}

/** Deletes the user; sessions, settings and key stats go with them (FK cascade). */
export async function deleteAccount(db: Db, userId: string) {
  await db.delete(users).where(eq(users.id, userId));
}
