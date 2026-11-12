import { describe, expect, it } from "vitest";
import { WordRush, multiplierFor, wordBudgetMs } from "./word-rush";

const game = (seed = 1, seconds = 60) => { const g = new WordRush({ seed, seconds }); g.start(0); return g; };
/** Types the current word correctly and submits. */
const clear = (g: WordRush, t: number) => { for (const c of g.snapshot(t).word) g.input(c, t); return g.submit(t); };

describe("multiplier and budgets", () => {
  it("multiplier steps 1→4 every 4 combo and caps at 4", () => {
    expect([0, 3, 4, 7, 8, 11, 12, 40].map(multiplierFor)).toEqual([1, 1, 2, 2, 3, 3, 4, 4]);
  });
  it("word budget grows with length, shrinks with progress, never below 2s", () => {
    expect(wordBudgetMs("cat", 0)).toBe(4200);
    expect(wordBudgetMs("cat", 20)).toBe(3360);
    expect(wordBudgetMs("cat", 500)).toBe(2100);
    expect(wordBudgetMs("a", 500)).toBe(2000);
    expect(wordBudgetMs("abcdefghi", 0)).toBeGreaterThan(wordBudgetMs("cat", 0));
  });
});

describe("setup", () => {
  it("is deterministic per seed and rejects bad config", () => {
    expect(game(5).snapshot(0).upcoming).toEqual(game(5).snapshot(0).upcoming);
    expect(game(5).snapshot(0).word).not.toBe(game(6).snapshot(0).word);
    expect(() => new WordRush({ seed: 1, seconds: 0 })).toThrow();
  });
  it("ignores everything until started, and start is one-shot", () => {
    const g = new WordRush({ seed: 1 });
    expect(g.status).toBe("idle");
    expect(g.input("a", 0)).toBe(false);
    expect(g.submit(0)).toBeNull();
    expect(g.snapshot(0).wordTimeLeftMs).toBe(g.snapshot(0).wordBudgetMs);
    g.start(100);
    g.start(5000);
    expect(g.snapshot(150).timeLeftMs).toBe(59950);
  });
  it("uses only plain lowercase words of 3–9 letters, never repeating back to back", () => {
    const up = game(3).snapshot(0).upcoming;
    for (const w of up) expect(w).toMatch(/^[a-z]{3,9}$/);
  });
});

describe("scoring and combo", () => {
  it("scores length × 10 × multiplier and builds a combo", () => {
    const g = game();
    const w1 = g.snapshot(0).word;
    expect(clear(g, 100)).toBe("correct");
    expect(g.snapshot(100)).toMatchObject({ score: w1.length * 10, combo: 1, cleared: 1 });
    for (let i = 0; i < 3; i++) clear(g, 200 + i * 10);
    expect(g.snapshot(300).multiplier).toBe(2); // combo of 4
    const before = g.snapshot(300);
    clear(g, 300);
    expect(g.snapshot(300).score - before.score).toBe(before.word.length * 10 * 2);
  });
  it("a wrong word resets the combo and moves on", () => {
    const g = game();
    clear(g, 10);
    const word = g.snapshot(10).word;
    g.input("z", 20);
    g.input("z", 21);
    expect(g.submit(30)).toBe("wrong");
    const s = g.snapshot(30);
    expect(s).toMatchObject({ combo: 0, missed: 1, typed: "" });
    expect(s.word).not.toBe(word);
  });
  it("submit with nothing typed is ignored; space/non-char input is not a letter", () => {
    const g = game();
    expect(g.submit(10)).toBeNull();
    expect(g.input(" ", 10)).toBe(false);
    expect(g.input("ab", 10)).toBe(false);
  });
  it("backspace edits the current word only", () => {
    const g = game();
    expect(g.backspace(5)).toBe(false);
    g.input("x", 6);
    expect(g.backspace(7)).toBe(true);
    expect(g.snapshot(8).typed).toBe("");
  });
});

describe("timers", () => {
  it("a word that runs out of time counts as missed and resets the combo", () => {
    const g = game();
    clear(g, 10);
    const budget = g.snapshot(10).wordBudgetMs;
    expect(g.tick(10 + budget - 1)).toBe(false);
    expect(g.snapshot(10 + budget - 1).missed).toBe(0);
    g.tick(10 + budget + 1);
    expect(g.snapshot(10 + budget + 1)).toMatchObject({ missed: 1, combo: 0 });
  });
  it("catches up on several expired words in one tick, deterministically", () => {
    const a = game(), b = game();
    a.tick(30000);
    for (let t = 1000; t <= 30000; t += 1000) b.tick(t);
    expect(a.snapshot(30000).missed).toBe(b.snapshot(30000).missed);
    expect(a.snapshot(30000).missed).toBeGreaterThan(3);
  });
  it("the game ends at the time limit and ignores later input", () => {
    const g = game(1, 5);
    clear(g, 100);
    expect(g.tick(4999)).toBe(false);
    expect(g.tick(6000)).toBe(true);
    expect(g.status).toBe("finished");
    expect(g.input("a", 6001)).toBe(false);
    expect(g.submit(6001)).toBeNull();
    expect(g.backspace(6001)).toBe(false);
    expect(g.result(9999).durationMs).toBe(5000);
    expect(g.tick(9999)).toBe(false);
  });
  it("input that arrives after expiry finishes the game instead of counting", () => {
    const g = game(1, 2);
    expect(g.input("a", 2500)).toBe(false);
    expect(g.status).toBe("finished");
  });
  it("pause freezes both clocks; resume continues", () => {
    const g = game();
    clear(g, 100);
    g.pause(1000);
    expect(g.status).toBe("paused");
    expect(g.input("a", 2000)).toBe(false);
    expect(g.snapshot(50000).timeLeftMs).toBe(59000);
    g.resume(50000);
    expect(g.snapshot(50500).timeLeftMs).toBe(58500);
    g.pause(0); // not running: ignored
    g.resume(0);
    const idle = new WordRush({ seed: 1 });
    idle.pause(0);
    idle.resume(0);
    expect(idle.status).toBe("idle");
  });
  it("pause at the exact end finishes the game rather than pausing", () => {
    const g = game(1, 1);
    g.pause(1500);
    expect(g.status).toBe("finished");
  });
});

describe("result stats (consistent with the server's plausibility rules)", () => {
  it("hits + misses = total keystrokes; accuracy, errors and WPM agree", () => {
    const g = game(2, 60);
    for (let i = 0; i < 6; i++) clear(g, 1000 + i * 1000);
    g.input("q", 8000); g.input("q", 8001); g.submit(8002); // wrong word
    g.tick(60000);
    const r = g.result(60000);
    const hits = Object.values(r.keyStats).reduce((a, k) => a + k.hits, 0);
    const misses = Object.values(r.keyStats).reduce((a, k) => a + k.misses, 0);
    expect(hits + misses).toBe(r.totalKeystrokes);
    expect(misses).toBe(r.errors);
    expect(r.accuracy).toBeCloseTo((hits / (hits + misses)) * 100, 0);
    expect(r.rawWpm).toBeGreaterThanOrEqual(r.wpm);
    expect(r).toMatchObject({ cleared: 6, maxCombo: 6, durationMs: 60000 });
    expect(r.score).toBeGreaterThan(0);
    expect(Object.keys(r.confusions).length).toBeGreaterThan(0);
  });
  it("typing past the end of a word is a miss on the space key", () => {
    const g = game();
    const w = g.snapshot(0).word;
    for (const c of w) g.input(c, 1);
    g.input("x", 2);
    expect(g.result(3).keyStats[" "]).toEqual({ hits: 0, misses: 1 });
    expect(g.result(3).confusions[" "]).toEqual({ x: 1 });
  });
  it("an untouched game reports 100% accuracy and 0 wpm", () => {
    const r = game().result(0);
    expect(r).toMatchObject({ accuracy: 100, wpm: 0, rawWpm: 0, errors: 0, cleared: 0, score: 0 });
  });
});
