import { describe, expect, it } from "vitest";
import { LESSONS, LESSON_COUNT, UNITS, getLesson } from "./lessons";
import { allowedKeys, buildLesson } from "./build";
import { computeStars, failureTip, isUnlocked } from "./progress";
import { fingerName } from "./fingers";

describe("curriculum structure", () => {
  it("has 12 beginner + 8 intermediate lessons with sequential ids", () => {
    expect(LESSON_COUNT).toBe(20);
    expect(LESSONS.map((l) => l.id)).toEqual(Array.from({ length: 20 }, (_, i) => i + 1));
    expect(LESSONS.filter((l) => l.level === "beginner")).toHaveLength(12);
    expect(LESSONS.filter((l) => l.level === "intermediate")).toHaveLength(8);
  });
  it("references only defined units, and pass gates match the spec (90 / 93)", () => {
    const units = new Set(UNITS.map((u) => u.id));
    for (const l of LESSONS) {
      expect(units.has(l.unit)).toBe(true);
      expect(l.passAccuracy).toBe(l.level === "beginner" ? 90 : 93);
      expect(l.tip.length).toBeGreaterThan(20);
    }
    expect(getLesson(5)?.title).toMatch(/G and H/);
    expect(getLesson(99)).toBeUndefined();
  });
  it("covers every letter of the alphabet by the end of unit 3", () => {
    const got = new Set(allowedKeys(12));
    for (const c of "abcdefghijklmnopqrstuvwxyz") expect(got.has(c), c).toBe(true);
  });
});

describe("buildLesson", () => {
  it("every lesson yields 4 non-empty steps in the fixed order", () => {
    for (const l of LESSONS) {
      const steps = buildLesson(l);
      expect(steps.map((s) => s.kind), `lesson ${l.id}`).toEqual(["meet", "drill", "words", "test"]);
      for (const s of steps) {
        expect(s.text.length, `lesson ${l.id} ${s.kind}`).toBeGreaterThan(5);
        expect(s.text).not.toMatch(/\s{2,}|^\s|\s$/);
        expect(s.text).not.toMatch(/undefined|NaN/);
      }
    }
  });
  it("is deterministic so a retry uses the same text", () => {
    for (const l of LESSONS) expect(buildLesson(l)).toEqual(buildLesson(l));
  });
  it("beginner lessons only use keys taught so far (plus space and punctuation marks they teach)", () => {
    for (const l of LESSONS.filter((x) => x.level === "beginner")) {
      const ok = new Set([...allowedKeys(l.id), " "]);
      for (const s of buildLesson(l)) for (const c of s.text) expect(ok.has(c), `lesson ${l.id} step ${s.kind} char "${c}"`).toBe(true);
    }
  });
  it("the first lesson drills its new keys", () => {
    const steps = buildLesson(LESSONS[0]);
    expect(steps[0].text).toMatch(/^[fj ]+$/);
    expect(steps[1].text).toMatch(/f/);
    expect(steps[1].text).toMatch(/j/);
  });
  it("later beginner lessons use real words and include the new letters", () => {
    const text = buildLesson(getLesson(6)!)[2].text;
    expect(text).toMatch(/[ei]/);
    const words = text.split(" ");
    expect(words.length).toBeGreaterThanOrEqual(8);
  });
  it("number lessons contain digits from their key range", () => {
    expect(buildLesson(getLesson(15)!)[1].text).toMatch(/^[1-5 ]+$/);
    expect(buildLesson(getLesson(16)!)[3].text).toMatch(/[6-90]/);
  });
  it("capitals and punctuation lessons contain capitals / punctuation", () => {
    expect(buildLesson(getLesson(13)!)[2].text).toMatch(/[A-Z]/);
    expect(buildLesson(getLesson(14)!)[3].text).toMatch(/[.?!,]/);
  });
  it("sentence lessons get longer", () => {
    const len = (id: number) => buildLesson(getLesson(id)!)[3].text.length;
    expect(len(20)).toBeGreaterThan(len(18));
  });
  it("comma and period lesson sprinkles punctuation into words", () => {
    expect(buildLesson(getLesson(10)!)[2].text).toMatch(/[,.]/);
  });
});

describe("computeStars", () => {
  const def = { passAccuracy: 90, targetWpm: 15 };
  it("awards stars by accuracy and speed", () => {
    expect(computeStars(def, { accuracy: 89.9, wpm: 80 })).toBe(0);
    expect(computeStars(def, { accuracy: 90, wpm: 5 })).toBe(1);
    expect(computeStars(def, { accuracy: 96, wpm: 5 })).toBe(2);
    expect(computeStars(def, { accuracy: 98, wpm: 14 })).toBe(2);
    expect(computeStars(def, { accuracy: 98, wpm: 15 })).toBe(3);
  });
});

describe("isUnlocked", () => {
  it("lesson 1 is open; others need the previous lesson passed", () => {
    const stars = new Map([[1, 3], [2, 0], [3, 1]]);
    expect(isUnlocked(1, new Map())).toBe(true);
    expect(isUnlocked(2, stars)).toBe(true);
    expect(isUnlocked(3, stars)).toBe(false);
    expect(isUnlocked(4, stars)).toBe(true);
    expect(isUnlocked(5, stars)).toBe(false);
  });
});

describe("failureTip", () => {
  it("names the most common substitution", () => {
    const tip = failureTip({ keyStats: { c: { hits: 3, misses: 4 } }, confusions: { c: { v: 4, x: 1 } }, accuracy: 80, passAccuracy: 90 });
    expect(tip).toBe("You typed V instead of C 4 times. Slow down and look for C before you press.");
  });
  it("falls back to the worst key, then to a general tip", () => {
    expect(failureTip({ keyStats: { p: { hits: 1, misses: 3 }, q: { hits: 1, misses: 2 } }, confusions: { p: { o: 1 } }, accuracy: 80, passAccuracy: 90 })).toMatch(/^P gave you the most trouble \(3 misses\)/);
    expect(failureTip({ keyStats: { p: { hits: 5, misses: 1 } }, accuracy: 85.4, passAccuracy: 90 })).toMatch(/85% and you need 90%/);
  });
  it("describes the space key readably", () => {
    expect(failureTip({ keyStats: {}, confusions: { " ": { x: 3 } }, accuracy: 70, passAccuracy: 90 })).toMatch(/X instead of space/);
  });
});

describe("fingerName", () => {
  it("maps keys to fingers", () => {
    expect(fingerName("f")).toBe("Left index");
    expect(fingerName("J")).toBe("Right index");
    expect(fingerName("a")).toBe("Left pinky");
    expect(fingerName(";")).toBe("Right pinky");
    expect(fingerName("é")).toBeUndefined();
  });
});
