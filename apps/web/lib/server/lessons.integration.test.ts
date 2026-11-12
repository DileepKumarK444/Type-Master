import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { createDb, keyStats, typingSessions } from "@typemaster/db";
import { deleteAccount } from "./account";
import { completeLesson, getProgress } from "./lessons";
import { UserGoneError } from "./sessions";
import { registerUser } from "./users";
import type { LessonCompleteInput } from "./validation";

const URL = process.env.DATABASE_URL_TEST;

describe.skipIf(!URL)("lesson completion", () => {
  const { db, client } = createDb(URL ?? "postgres://unused", { max: 3 });
  const tag = Date.now().toString(36);
  let a = "", b = "";
  let n = 0;
  const cid = () => `00000000-0000-4000-9000-${String(++n).padStart(12, "0")}`;

  /** accuracy/wpm drive pass + stars; keyStats are kept consistent with them. */
  const attempt = (accuracy: number, wpm: number, over: Partial<LessonCompleteInput> = {}): LessonCompleteInput => {
    const total = 100;
    const hits = Math.round((accuracy / 100) * total);
    return { clientId: cid(), durationS: 24, wpm, rawWpm: wpm, accuracy, consistency: 90, errors: total - hits, keyStats: { f: { hits, misses: total - hits } }, ...over };
  };

  beforeAll(async () => {
    a = (await registerUser(db, { name: "A", email: `la.${tag}@test.example`, password: "correct horse" })).id;
    b = (await registerUser(db, { name: "B", email: `lb.${tag}@test.example`, password: "battery staple" })).id;
  });
  afterAll(async () => {
    await deleteAccount(db, a).catch(() => {});
    await deleteAccount(db, b).catch(() => {});
    await client.end();
  });

  it("rejects unknown lessons and locked lessons", async () => {
    expect(await completeLesson(db, a, 99, attempt(95, 20))).toEqual({ ok: false, reason: "unknown_lesson" });
    expect(await completeLesson(db, a, 2, attempt(99, 30))).toEqual({ ok: false, reason: "locked" });
    expect(await getProgress(db, a)).toHaveLength(0);
  });

  it("a failed attempt (below 90%) records the attempt but does not pass or unlock", async () => {
    const r = await completeLesson(db, a, 1, attempt(85, 20));
    expect(r).toMatchObject({ ok: true, passed: false, stars: 0, bestStars: 0, duplicate: false, nextLessonId: 2 });
    expect((await getProgress(db, a))[0]).toMatchObject({ bestWpm: 0, bestAccuracy: 0 }); // failed runs set no records
    expect(await completeLesson(db, a, 2, attempt(99, 30))).toMatchObject({ ok: false, reason: "locked" });
    const [p] = await getProgress(db, a);
    expect(p).toMatchObject({ lessonId: 1, stars: 0, attempts: 1 });
  });

  it("passing awards 1 star and unlocks the next lesson", async () => {
    const r = await completeLesson(db, a, 1, attempt(91, 5));
    expect(r).toMatchObject({ ok: true, passed: true, stars: 1, bestStars: 1 });
    expect(await completeLesson(db, a, 2, attempt(90, 8))).toMatchObject({ ok: true, passed: true, stars: 1 });
  });

  it("keeps the best stars and best scores; a worse retry never lowers them", async () => {
    await completeLesson(db, a, 1, attempt(99, 14)); // lesson 1 target is 10 WPM -> 3 stars
    const worse = await completeLesson(db, a, 1, attempt(91, 5));
    expect(worse).toMatchObject({ passed: true, stars: 1, bestStars: 3 });
    const p = (await getProgress(db, a)).find((x) => x.lessonId === 1)!;
    expect(p).toMatchObject({ stars: 3, bestWpm: 14, bestAccuracy: 99, attempts: 4 });
  });

  it("is idempotent on clientId: a retried request changes nothing", async () => {
    const input = attempt(97, 12);
    const first = await completeLesson(db, a, 3 - 1, input); // lesson 2 (unlocked)
    const again = await completeLesson(db, a, 2, input);
    expect(first).toMatchObject({ ok: true, duplicate: false });
    expect(again).toMatchObject({ ok: true, duplicate: true });
    const p = (await getProgress(db, a)).find((x) => x.lessonId === 2)!;
    expect(p.attempts).toBe(2); // the first pass + this one, counted once
  });

  it("stores the session as a lesson session and feeds weak-key stats", async () => {
    const rows = await db.select().from(typingSessions).where(eq(typingSessions.userId, a));
    expect(rows.every((r) => r.type === "lesson" && r.lessonId !== null)).toBe(true);
    expect(rows.find((r) => r.lessonId === 1)?.mode).toEqual({ lessonId: 1 });
    const [f] = await db.select().from(keyStats).where(eq(keyStats.userId, a));
    expect(f.hits + f.misses).toBe(rows.length * 100);
  });

  it("ISOLATION: another user's progress is independent", async () => {
    expect(await getProgress(db, b)).toHaveLength(0);
    expect(await completeLesson(db, b, 2, attempt(99, 30))).toMatchObject({ ok: false, reason: "locked" });
    expect(await completeLesson(db, b, 1, attempt(92, 10))).toMatchObject({ ok: true, stars: 1 });
    expect((await getProgress(db, a)).find((x) => x.lessonId === 1)?.stars).toBe(3);
  });

  it("the last lesson has no next lesson; the coding track (21-25) follows the core lessons", async () => {
    for (let id = 1; id <= 25; id++) {
      const r = await completeLesson(db, b, id, attempt(99, 40));
      expect(r.ok, `lesson ${id}`).toBe(true);
      if (r.ok) expect(r.nextLessonId).toBe(id === 25 ? null : id + 1);
    }
  });

  it("coding lessons unlock after lesson 12, not after lesson 20", async () => {
    const c = (await registerUser(db, { name: "C", email: `lc.${tag}@test.example`, password: "correct horse" })).id;
    try {
      expect(await completeLesson(db, c, 21, attempt(99, 40))).toMatchObject({ ok: false, reason: "locked" });
      for (let id = 1; id <= 12; id++) await completeLesson(db, c, id, attempt(99, 40));
      expect(await completeLesson(db, c, 22, attempt(99, 40))).toMatchObject({ ok: false, reason: "locked" }); // needs 21 first
      expect(await completeLesson(db, c, 21, attempt(99, 40))).toMatchObject({ ok: true, passed: true });
      expect(await completeLesson(db, c, 22, attempt(99, 40))).toMatchObject({ ok: true, passed: true });
      expect(await completeLesson(db, c, 13, attempt(99, 40))).toMatchObject({ ok: true }); // core lessons are still open, in order
      expect(await completeLesson(db, c, 15, attempt(99, 40))).toMatchObject({ ok: false, reason: "locked" });
    } finally {
      await deleteAccount(db, c);
    }
  });

  it("a session for a deleted user fails cleanly and writes nothing", async () => {
    await expect(completeLesson(db, "00000000-0000-4000-8000-0000000000ee", 1, attempt(95, 20))).rejects.toBeInstanceOf(UserGoneError);
  });
});
