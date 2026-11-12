import { describe, expect, it } from "vitest";
import { compare, dailySeries, dayKey, inWindow, keyAccuracy, streakDays, streakInfo, summarize, weakKeys, type SessionLite } from "./stats";

const NOW = new Date("2026-11-12T15:00:00Z");
const ago = (days: number, hour = 12) => new Date(Date.UTC(2026, 10, 12 - days, hour));
const s = (daysAgo: number, wpm: number, over: Partial<SessionLite> = {}): SessionLite => ({
  createdAt: ago(daysAgo), type: "test", durationS: 60, wpm, accuracy: 96, consistency: 80, ...over,
});

describe("summarize", () => {
  it("averages tests only, but counts all time", () => {
    const r = summarize([s(0, 40), s(1, 60), s(1, 5, { type: "lesson", durationS: 120, accuracy: 50 })]);
    expect(r).toMatchObject({ sessions: 3, avgWpm: 50, bestWpm: 60, avgAccuracy: 96, avgConsistency: 80, minutes: 4 });
  });
  it("is all zeros for no data", () => {
    expect(summarize([])).toEqual({ sessions: 0, avgWpm: 0, bestWpm: 0, avgAccuracy: 0, avgConsistency: 0, minutes: 0 });
  });
});

describe("windows and comparison", () => {
  const rows = [s(0, 50), s(6, 52), s(7, 40), s(13, 44), s(20, 10)];
  it("inWindow uses (now-days, now]", () => {
    expect(inWindow(rows, NOW, 7)).toHaveLength(2);
    expect(inWindow(rows, NOW, 7, 7)).toHaveLength(2);
    expect(inWindow([{ ...s(0, 1), createdAt: new Date(NOW.getTime() + 1000) }], NOW, 7)).toHaveLength(0); // future rows excluded
  });
  it("compare gives current vs previous period", () => {
    const c = compare(rows, NOW, 7);
    expect(c.current.avgWpm).toBe(51);
    expect(c.previous.avgWpm).toBe(42);
  });
});

describe("dailySeries", () => {
  it("fills every day, averages tests per day, and sums minutes", () => {
    const out = dailySeries([s(0, 40), s(0, 60), s(2, 30, { type: "lesson", durationS: 90 })], NOW, 4);
    expect(out.map((d) => d.day)).toEqual(["2026-11-09", "2026-11-10", "2026-11-11", "2026-11-12"]);
    expect(out[3]).toMatchObject({ wpm: 50, minutes: 2, sessions: 2 });
    expect(out[1]).toMatchObject({ wpm: null, minutes: 1.5, sessions: 1 }); // lesson only: time but no speed
    expect(out[0]).toMatchObject({ wpm: null, minutes: 0, sessions: 0 });
  });
});

describe("streakDays", () => {
  const set = (...n: number[]) => new Set(n.map((d) => dayKey(ago(d))));
  it("counts consecutive days ending today (a single gap is forgiven by the weekly freeze)", () => {
    expect(streakDays(set(0, 1, 2, 4), NOW)).toBe(4);
    expect(streakDays(set(0, 1, 2, 5), NOW)).toBe(3); // two missed days in a row break it
  });
  it("does not reset when today is still empty", () => expect(streakDays(set(1, 2, 3), NOW)).toBe(3));
  it("is 0 after a missed day, and for no data", () => {
    expect(streakDays(set(2, 3), NOW)).toBe(0);
    expect(streakDays(new Set(), NOW)).toBe(0);
  });
  it("handles month boundaries", () => expect(streakDays(new Set(["2026-11-01", "2026-10-31", "2026-10-30"]), new Date("2026-11-01T08:00:00Z"))).toBe(3));
});

describe("streak freeze (one forgiven day per rolling 7 days)", () => {
  const set = (...n: number[]) => new Set(n.map((d) => dayKey(ago(d))));
  it("bridges a single missed day and reports the freeze as used", () => {
    expect(streakInfo(set(0, 1, 3, 4), NOW)).toEqual({ streak: 4, freezeUsed: true }); // day 2 missed, forgiven
  });
  it("does not bridge two missed days in a row", () => {
    expect(streakInfo(set(0, 1, 4, 5), NOW)).toEqual({ streak: 2, freezeUsed: false });
  });
  it("allows only one bridge per 7 days, a second one 7+ days further back is fine", () => {
    expect(streakInfo(set(0, 2, 4, 5), NOW).streak).toBe(2); // second gap (day 3) is within 7 days of the first (day 1)
    expect(streakInfo(set(0, 2, 3, 4, 5, 6, 7, 8, 10, 11), NOW)).toEqual({ streak: 10, freezeUsed: true }); // gaps at 1 and 9
  });
  it("an old bridge leaves the freeze available again", () => {
    expect(streakInfo(set(0, 1, 2, 3, 4, 5, 6, 7, 8, 10, 11), NOW)).toEqual({ streak: 11, freezeUsed: false }); // gap at day 9 (>= 7 days ago)
  });
  it("cannot bridge when today and yesterday are both empty, or when nothing precedes the gap", () => {
    expect(streakInfo(set(2, 3), NOW).streak).toBe(0);
    expect(streakInfo(set(0, 2), NOW)).toEqual({ streak: 2, freezeUsed: true }); // gap at 1, practised on both sides
    expect(streakInfo(set(0), NOW)).toEqual({ streak: 1, freezeUsed: false });
  });
  it("streakDays stays the plain number", () => expect(streakDays(set(0, 1, 3), NOW)).toBe(3));
});

describe("weakKeys / keyAccuracy", () => {
  const rows = [
    { key: "p", hits: 15, misses: 5 }, // 75%
    { key: "q", hits: 16, misses: 4 }, // 80%
    { key: "a", hits: 500, misses: 5 }, // 99%
    { key: "z", hits: 3, misses: 2 }, // too few attempts
    { key: "x", hits: 30, misses: 1 }, // too few misses
    { key: " ", hits: 5, misses: 40 }, // space excluded
    { key: ";", hits: 15, misses: 5 }, // 75% tie → same misses → stable
  ];
  it("ranks by accuracy, applies thresholds, excludes space", () => {
    expect(weakKeys(rows).map((k) => k.key)).toEqual(["p", ";", "q"]); // "a" is 99%: lots of misses by volume, not weak
    expect(weakKeys(rows, { limit: 2 })).toHaveLength(2);
    expect(weakKeys(rows)[0]).toEqual({ key: "p", accuracy: 75, misses: 5, attempts: 20 });
  });
  it("accuracy ceiling is adjustable and exclusive", () => {
    expect(weakKeys([{ key: "e", hits: 95, misses: 5 }])).toEqual([]); // exactly 95% is not weak
    expect(weakKeys([{ key: "e", hits: 95, misses: 5 }], { maxAccuracy: 96 })).toHaveLength(1);
  });
  it("returns [] when no key qualifies", () => expect(weakKeys([{ key: "a", hits: 100, misses: 0 }])).toEqual([]));
  it("heatmap omits low-sample keys and space", () => {
    const h = keyAccuracy(rows);
    expect(h).toMatchObject({ p: 75, a: 99.0, x: 96.8 });
    expect(h.z).toBeUndefined();
    expect(h[" "]).toBeUndefined();
  });
});
