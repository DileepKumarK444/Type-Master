import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { createDb, userBadges, users } from "@typemaster/db";
import { DAILY_PRACTICE_XP_CAP } from "@typemaster/content";
import { deleteAccount } from "./account";
import { recordGame, recordPractice } from "./activity";
import { completeLesson } from "./lessons";
import { getEarnedBadges, getUserStats } from "./progression";
import { registerUser } from "./users";
import type { GameInput, LessonCompleteInput, SessionInput } from "./validation";

const URL = process.env.DATABASE_URL_TEST;

describe.skipIf(!URL)("XP, levels and badges", () => {
  const { db, client } = createDb(URL ?? "postgres://unused", { max: 3 });
  const tag = Date.now().toString(36);
  let a = "", b = "";
  let n = 0;
  const cid = () => `00000000-0000-4000-b000-${String(++n).padStart(12, "0")}`;

  const test = (over: Partial<SessionInput> = {}): SessionInput => ({
    clientId: cid(), kind: "test", durationS: 60, wpm: 40, rawWpm: 42, accuracy: 96, consistency: 80, errors: 4,
    keyStats: { a: { hits: 96, misses: 4 } }, mode: { seconds: 60, punctuation: false, numbers: false }, ...over,
  });
  const lesson = (accuracy: number, wpm = 20): LessonCompleteInput => {
    const hits = Math.round(accuracy);
    return { clientId: cid(), durationS: 24, wpm, rawWpm: wpm, accuracy, consistency: 90, errors: 100 - hits, keyStats: { f: { hits, misses: 100 - hits } } };
  };
  const game = (score = 600, over: Partial<GameInput> = {}): GameInput => ({
    clientId: cid(), durationS: 60, wpm: 40, rawWpm: 42, accuracy: 96, consistency: 100, errors: 4, score, cleared: 30, maxCombo: 12,
    keyStats: { a: { hits: 96, misses: 4 } }, ...over,
  });
  const xpOf = async (id: string) => (await db.select({ xp: users.xp, level: users.level }).from(users).where(eq(users.id, id)))[0];

  beforeAll(async () => {
    a = (await registerUser(db, { name: "A", email: `pa.${tag}@test.example`, password: "correct horse" })).id;
    b = (await registerUser(db, { name: "B", email: `pb.${tag}@test.example`, password: "battery staple" })).id;
  });
  afterAll(async () => {
    await deleteAccount(db, a).catch(() => {});
    await deleteAccount(db, b).catch(() => {});
    await client.end();
  });

  it("a 60s test at 96% earns 30 XP and the Test Drive badge", async () => {
    const r = await recordPractice(db, a, test());
    expect(r.rewards).toMatchObject({ xpAwarded: 30, xpTotal: 30, level: 1, leveledUp: false });
    expect(r.rewards?.newBadges.map((x) => x.id)).toEqual(["test_drive"]);
    expect(await xpOf(a)).toEqual({ xp: 30, level: 1 });
  });

  it("below the accuracy gate earns nothing (but the session is still saved)", async () => {
    const r = await recordPractice(db, a, test({ accuracy: 85, errors: 15, keyStats: { a: { hits: 85, misses: 15 } }, wpm: 30, rawWpm: 36 }));
    expect(r.rewards?.xpAwarded).toBe(0);
    expect(r.id).toBeTruthy();
  });

  it("retrying the same clientId awards nothing twice", async () => {
    const input = test();
    const first = await recordPractice(db, a, input);
    const again = await recordPractice(db, a, input);
    expect(first.rewards?.xpAwarded).toBe(30);
    expect(again.duplicate).toBe(true);
    expect(again.rewards).toBeUndefined();
    expect((await xpOf(a)).xp).toBe(60);
  });

  it("levels up when crossing the threshold and reports it once", async () => {
    // 60 XP so far; a 120s test at 99% = 80 XP -> 140 total -> level 2 (100)
    const r = await recordPractice(db, a, test({ durationS: 120, accuracy: 99, errors: 1, keyStats: { a: { hits: 99, misses: 1 } }, wpm: 60, rawWpm: 61, mode: { seconds: 120, punctuation: false, numbers: false } }));
    expect(r.rewards).toMatchObject({ xpAwarded: 80, xpTotal: 140, level: 2, leveledUp: true });
    const next = await recordPractice(db, a, test());
    expect(next.rewards?.leveledUp).toBe(false);
  });

  it("badges are awarded once only", async () => {
    const badges = await getEarnedBadges(db, a);
    expect(badges.map((x) => x.id).filter((x) => x === "test_drive")).toHaveLength(1);
    const again = await recordPractice(db, a, test());
    expect(again.rewards?.newBadges).toEqual([]);
  });

  it("lessons: 30/40/50 XP for the first pass, little for replays, nothing for a fail", async () => {
    expect((await completeLesson(db, a, 1, lesson(85)) as { rewards?: { xpAwarded: number } }).rewards?.xpAwarded).toBe(0);
    const pass = await completeLesson(db, a, 1, lesson(91, 5));
    expect(pass).toMatchObject({ ok: true, passed: true });
    expect(pass.ok && pass.rewards?.xpAwarded).toBe(30);
    expect(pass.ok && pass.rewards?.newBadges.map((x) => x.id)).toContain("first_steps");
    const replay = await completeLesson(db, a, 1, lesson(91, 5));
    expect(replay.ok && replay.rewards?.xpAwarded).toBe(5);
    const better = await completeLesson(db, a, 1, lesson(99, 30)); // 3 stars: 5 + 10 * (3 - 1)
    expect(better.ok && better.rewards?.xpAwarded).toBe(25);
  });

  it("daily cap: practice XP stops at the cap, lessons are exempt", async () => {
    // user b: each 120s test at 99% is 80 XP. 7 of them = 560 > 500.
    const gains: number[] = [];
    for (let i = 0; i < 7; i++) {
      const r = await recordPractice(db, b, test({ durationS: 120, accuracy: 99, errors: 1, keyStats: { a: { hits: 99, misses: 1 } }, wpm: 60, rawWpm: 61, mode: { seconds: 120, punctuation: false, numbers: false } }));
      gains.push(r.rewards!.xpAwarded);
    }
    expect(gains).toEqual([80, 80, 80, 80, 80, 80, 20]);
    expect(gains.reduce((x, y) => x + y, 0)).toBe(DAILY_PRACTICE_XP_CAP);
    expect((await recordPractice(db, b, test())).rewards?.xpAwarded).toBe(0);
    const les = await completeLesson(db, b, 1, lesson(95));
    expect(les.ok && les.rewards?.xpAwarded).toBe(30); // lessons ignore the cap
  });

  it("games: XP, personal best on score, Gamer badge after 5 games, High Scorer at 1000", async () => {
    const g1 = await recordGame(db, a, game(600));
    expect(g1).toMatchObject({ duplicate: false, personalBest: false, previousBest: null });
    expect(g1.rewards?.xpAwarded).toBe(30);
    expect(await recordGame(db, a, game(500))).toMatchObject({ personalBest: false, previousBest: 600 });
    expect(await recordGame(db, a, game(900))).toMatchObject({ personalBest: true, previousBest: 600 });
    await recordGame(db, a, game(100));
    const g5 = await recordGame(db, a, game(1000));
    expect(g5.rewards?.newBadges.map((x) => x.id).sort()).toEqual(["gamer", "high_scorer"]);
    const stats = await getUserStats(db, a);
    expect(stats).toMatchObject({ gamesPlayed: 5, bestGameScore: 1000, lessonsPassed: [1] });
  });

  it("ISOLATION: one user's badges and XP do not leak to another", async () => {
    const mine = await db.select().from(userBadges).where(eq(userBadges.userId, b));
    expect(mine.map((x) => x.badgeId)).not.toContain("gamer");
    expect((await getUserStats(db, b)).gamesPlayed).toBe(0);
  });

  it("deleting the account removes badges too", async () => {
    await deleteAccount(db, b);
    expect(await db.select().from(userBadges).where(eq(userBadges.userId, b))).toHaveLength(0);
  });
});
