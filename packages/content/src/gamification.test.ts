import { describe, expect, it } from "vitest";
import { ACCURACY_GATE, BADGES, DAILY_PRACTICE_XP_CAP, accuracyMultiplier, applyDailyCap, earnedBadgeIds, emptyStats, getBadge, levelFor, levelProgress, xpFor, xpForLevel } from "./gamification";

describe("accuracyMultiplier", () => {
  it("is 0 below the gate and steps up at 90 / 95 / 98", () => {
    expect(ACCURACY_GATE).toBe(90);
    expect([89.9, 90, 94.9, 95, 97.9, 98, 100].map(accuracyMultiplier)).toEqual([0, 1, 1, 1.5, 1.5, 2, 2]);
  });
});

describe("xpFor", () => {
  it("scales with time and accuracy for tests, drills and games", () => {
    expect(xpFor({ kind: "test", durationS: 60, accuracy: 96 })).toBe(30);
    expect(xpFor({ kind: "test", durationS: 15, accuracy: 96 })).toBe(8);
    expect(xpFor({ kind: "drill", durationS: 60, accuracy: 91 })).toBe(15);
    expect(xpFor({ kind: "game", durationS: 60, accuracy: 99 })).toBe(40);
  });
  it("gives nothing below the accuracy gate", () => {
    expect(xpFor({ kind: "test", durationS: 120, accuracy: 85 })).toBe(0);
  });
  it("lessons: 30/40/50 on first pass, 0 on fail, small amount for replays", () => {
    expect([1, 2, 3].map((stars) => xpFor({ kind: "lesson", stars, previousBestStars: 0 }))).toEqual([30, 40, 50]);
    expect(xpFor({ kind: "lesson", stars: 0, previousBestStars: 0 })).toBe(0);
    expect(xpFor({ kind: "lesson", stars: 1, previousBestStars: 1 })).toBe(5); // replay, no improvement
    expect(xpFor({ kind: "lesson", stars: 3, previousBestStars: 1 })).toBe(25); // 5 + 2 extra stars
    expect(xpFor({ kind: "lesson", stars: 1, previousBestStars: 3 })).toBe(5); // worse replay never negative
  });
});

describe("applyDailyCap", () => {
  it("caps practice XP, exempts lessons, never goes negative", () => {
    expect(applyDailyCap(30, "test", 0)).toBe(30);
    expect(applyDailyCap(30, "test", DAILY_PRACTICE_XP_CAP - 10)).toBe(10);
    expect(applyDailyCap(30, "game", DAILY_PRACTICE_XP_CAP)).toBe(0);
    expect(applyDailyCap(30, "drill", DAILY_PRACTICE_XP_CAP + 50)).toBe(0);
    expect(applyDailyCap(50, "lesson", DAILY_PRACTICE_XP_CAP)).toBe(50);
  });
});

describe("levels", () => {
  it("thresholds follow 100 * (L-1)^1.5", () => {
    expect([1, 2, 3, 4, 5].map(xpForLevel)).toEqual([0, 100, 283, 520, 800]);
  });
  it("levelFor picks the highest level reached, and is capped", () => {
    expect([0, 99, 100, 282, 283, 799, 800].map(levelFor)).toEqual([1, 1, 2, 2, 3, 4, 5]);
    expect(levelFor(10 ** 9)).toBe(100);
  });
  it("levelProgress reports position inside the level", () => {
    expect(levelProgress(150)).toMatchObject({ level: 2, floor: 100, next: 283, into: 50, needed: 183 });
    expect(levelProgress(150).fraction).toBeCloseTo(50 / 183, 5);
    expect(levelProgress(10 ** 9).fraction).toBe(1);
  });
});

describe("badges", () => {
  it("has 12 unique badges", () => {
    expect(BADGES).toHaveLength(12);
    expect(new Set(BADGES.map((b) => b.id)).size).toBe(12);
    expect(getBadge("rocket_80")?.title).toBe("Rocket");
    expect(getBadge("nope")).toBeUndefined();
  });
  it("awards nothing for an empty user", () => expect(earnedBadgeIds(emptyStats())).toEqual([]));
  it("awards badges at their thresholds", () => {
    const s = { ...emptyStats(), lessonsPassed: [1, 2, 3, 4, 5], testsCompleted: 1, bestTestWpm: 52, bestTestAccuracy: 98, streak: 7, gamesPlayed: 5, bestGameScore: 999 };
    expect(earnedBadgeIds(s).sort()).toEqual(["finisher", "first_steps", "gamer", "on_fire", "sharpshooter", "speedy_50", "test_drive"]);
    expect(earnedBadgeIds({ ...s, bestGameScore: 1000, bestTestWpm: 80 })).toEqual(expect.arrayContaining(["high_scorer", "rocket_80"]));
  });
  it("lesson badges count the right lessons", () => {
    expect(earnedBadgeIds({ ...emptyStats(), lessonsPassed: [2, 3, 4, 5, 6] })).not.toContain("finisher"); // lesson 1 missing
    expect(earnedBadgeIds({ ...emptyStats(), lessonsPassed: Array.from({ length: 20 }, (_, i) => i + 1) })).toEqual(expect.arrayContaining(["scholar", "graduate"]));
  });
});
