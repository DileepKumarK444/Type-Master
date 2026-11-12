import { describe, expect, it } from "vitest";
import { WORD_LIST_SIZE, generateText, rng } from "./text";

describe("rng", () => {
  it("is deterministic and in [0,1)", () => {
    const a = rng(42), b = rng(42);
    for (let i = 0; i < 50; i++) {
      const x = a();
      expect(x).toBe(b());
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThan(1);
    }
  });
});

describe("generateText", () => {
  it("returns the requested word count, same seed same text", () => {
    const t = generateText({ words: 50, seed: 7 });
    expect(t.split(" ")).toHaveLength(50);
    expect(generateText({ words: 50, seed: 7 })).toBe(t);
    expect(generateText({ words: 50, seed: 8 })).not.toBe(t);
  });

  it("plain mode is lowercase letters (and apostrophes) only", () => {
    expect(generateText({ words: 200, seed: 1 })).toMatch(/^[a-z' ]+$/);
  });

  it("punctuation mode capitalises sentences and ends with terminal punctuation", () => {
    const t = generateText({ words: 80, seed: 3, punctuation: true });
    expect(t[0]).toMatch(/[A-Z]/);
    expect(t).toMatch(/[.?!]$/);
    expect(t).toMatch(/, /);
    expect(t).toMatch(/[.?!] [A-Z]/);
  });

  it("numbers mode injects digit tokens", () => {
    expect(generateText({ words: 200, seed: 5, numbers: true })).toMatch(/\b\d+\b/);
  });

  it("has a reasonably large word list", () => {
    expect(WORD_LIST_SIZE).toBeGreaterThan(150);
  });
});
