import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createDb } from "@typemaster/db";
import { runMigrations } from "@typemaster/db/src/migrate";
import { deleteAccount } from "./account";
import { saveSession } from "./sessions";
import { getKeyAccuracy, getSession, getStreak, getWeakKeys, sessionsSince } from "./stats";
import { registerUser } from "./users";
import type { SessionInput } from "./validation";

const URL = process.env.DATABASE_URL_TEST;

describe.skipIf(!URL)("analytics queries", () => {
  const { db, client } = createDb(URL ?? "postgres://unused", { max: 3 });
  const tag = Date.now().toString(36);
  let a = "", b = "";
  let n = 0;
  const cid = () => `00000000-0000-4000-a000-${String(++n).padStart(12, "0")}`;
  const run = (wpm: number, seconds = 30, keys: SessionInput["keyStats"] = { a: { hits: 90, misses: 2 }, p: { hits: 5, misses: 3 } }): SessionInput => ({
    clientId: cid(), kind: "test", durationS: seconds, wpm, rawWpm: wpm, accuracy: 96, consistency: 80, errors: 5, keyStats: keys,
    mode: { seconds, punctuation: false, numbers: false },
  });

  beforeAll(async () => {
    await runMigrations(URL!);
    a = (await registerUser(db, { name: "A", email: `sa.${tag}@test.example`, password: "correct horse" })).id;
    b = (await registerUser(db, { name: "B", email: `sb.${tag}@test.example`, password: "battery staple" })).id;
  });
  afterAll(async () => {
    await deleteAccount(db, a).catch(() => {});
    await deleteAccount(db, b).catch(() => {});
    await client.end();
  });

  it("personal best: first test is a baseline, higher beats it, lower does not; per test length", async () => {
    expect(await saveSession(db, a, run(40))).toMatchObject({ duplicate: false, personalBest: false, previousBest: null });
    expect(await saveSession(db, a, run(35))).toMatchObject({ personalBest: false, previousBest: 40 });
    expect(await saveSession(db, a, run(52))).toMatchObject({ personalBest: true, previousBest: 40 });
    expect(await saveSession(db, a, run(60, 60))).toMatchObject({ personalBest: false, previousBest: null }); // 60s is its own category
    const dup = run(99);
    await saveSession(db, a, dup);
    expect(await saveSession(db, a, dup)).toMatchObject({ duplicate: true });
  });

  it("weak-key drills never count toward personal bests", async () => {
    const fast = { ...run(200, 45), kind: "drill" as const };
    const r = await saveSession(db, a, fast);
    expect(r.personalBest).toBeUndefined(); // drills report no PB info
    expect(await saveSession(db, a, run(30, 45))).toMatchObject({ personalBest: false, previousBest: null }); // the 200-WPM drill is not a record to beat
  });

  it("personal best ignores other users", async () => {
    expect(await saveSession(db, b, run(10))).toMatchObject({ personalBest: false, previousBest: null });
  });

  it("weak keys and heatmap come from accumulated key stats", async () => {
    // key a: many hits; key p: 5 sessions x (5 hits, 3 misses) -> 40 attempts, 37.5% misses
    const weak = await getWeakKeys(db, a);
    expect(weak[0]).toMatchObject({ key: "p" });
    expect(weak[0].accuracy).toBeCloseTo(62.5, 1);
    expect(weak.find((k) => k.key === "a")).toBeUndefined(); // ~98% accurate despite many misses by volume
  });

  it("scopes everything by user (b has no weak keys; sessions of a are invisible to b)", async () => {
    expect(await getWeakKeys(db, b)).toEqual([]);
    const since = new Date(Date.now() - 86_400_000);
    expect((await sessionsSince(db, b, since)).length).toBe(1);
    expect((await sessionsSince(db, a, since)).length).toBeGreaterThanOrEqual(5);
    expect(Object.keys(await getKeyAccuracy(db, b))).toEqual(["a"]); // b's one run; "p" has too few attempts (8 < 10)
  });

  it("streak counts today's sessions", async () => {
    expect(await getStreak(db, a)).toBe(1);
    expect(await getStreak(db, b)).toBe(1);
  });

  it("getSession returns only the owner's session", async () => {
    const saved = await saveSession(db, a, run(44));
    expect(await getSession(db, a, saved.id)).toMatchObject({ id: saved.id, wpm: 44 });
    expect(await getSession(db, b, saved.id)).toBeNull();
    expect(await getSession(db, a, "00000000-0000-4000-8000-000000000000")).toBeNull();
  });
});
