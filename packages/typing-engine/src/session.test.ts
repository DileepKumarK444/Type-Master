import { describe, expect, it } from "vitest";
import { TypingSession, consistency } from "./session";

const type = (s: TypingSession, str: string, t0: number, stepMs: number) => {
  [...str].forEach((c, i) => s.input(c, t0 + i * stepMs));
};

describe("TypingSession basics", () => {
  it("starts idle with zeroed stats", () => {
    const s = new TypingSession({ text: "hello", mode: { kind: "text" } });
    expect(s.status).toBe("idle");
    expect(s.length).toBe(5);
    expect(s.nextChar).toBe("h");
    const snap = s.snapshot(0);
    expect(snap).toMatchObject({ wpm: 0, rawWpm: 0, accuracy: 100, errors: 0, elapsedMs: 0, remainingMs: null });
  });

  it("rejects invalid config", () => {
    expect(() => new TypingSession({ text: "a", mode: { kind: "time", seconds: 0 } })).toThrow();
  });

  it("marks correct and incorrect chars and advances", () => {
    const s = new TypingSession({ text: "cat", mode: { kind: "text" } });
    s.input("c", 0);
    s.input("x", 100);
    expect(s.status).toBe("running");
    expect(s.index).toBe(2);
    expect(s.stateString(0, 3)).toBe("120");
    expect(s.snapshot(200)).toMatchObject({ errors: 1, accuracy: 50 });
  });

  it("ignores multi-char input and input beyond end", () => {
    const s = new TypingSession({ text: "a", mode: { kind: "text" } });
    expect(s.input("ab", 0)).toBe(false);
    expect(s.input("a", 0)).toBe(true);
    expect(s.status).toBe("finished");
    expect(s.input("a", 10)).toBe(false);
  });

  it("finishes a text session when the last char is typed", () => {
    const s = new TypingSession({ text: "hi", mode: { kind: "text" } });
    type(s, "hi", 0, 500);
    expect(s.status).toBe("finished");
    expect(s.result(9999).durationMs).toBe(500);
  });
});

describe("WPM and accuracy", () => {
  it("computes 60 WPM for 5 chars per second", () => {
    const text = "abcde".repeat(12); // 60 chars
    const s = new TypingSession({ text, mode: { kind: "time", seconds: 60 } });
    // 60 chars over exactly 12 seconds => 12 cps*... 60/5 = 12 words / 0.2 min = 60 wpm
    type(s, text, 0, 12000 / 59); // last key at 12000ms
    const r = s.result(12000);
    expect(r.wpm).toBe(60);
    expect(r.rawWpm).toBe(60);
    expect(r.accuracy).toBe(100);
  });

  it("net WPM drops for wrong chars while raw WPM counts them", () => {
    const s = new TypingSession({ text: "aaaaaaaaaa", mode: { kind: "text" } });
    for (let i = 0; i < 9; i++) s.input("a", i * 100);
    s.input("b", 900); // wrong, finishes at 900ms -> uses min 1s denominator
    const r = s.result(1000);
    expect(r.rawWpm).toBeGreaterThan(r.wpm);
    expect(r.accuracy).toBe(90);
    expect(r.errors).toBe(1);
  });

  it("uses a minimum 1s denominator so early WPM is not absurd", () => {
    const s = new TypingSession({ text: "abcdefghij", mode: { kind: "text" } });
    s.input("a", 0);
    s.input("b", 10);
    expect(s.snapshot(20).wpm).toBe(24); // 2 chars / 5 / (1/60 min)
  });
});

describe("backspace", () => {
  it("removes the last char, keeps accuracy history", () => {
    const s = new TypingSession({ text: "cat", mode: { kind: "text" } });
    s.input("x", 0);
    expect(s.backspace(10)).toBe(true);
    expect(s.index).toBe(0);
    expect(s.stateString(0, 3)).toBe("000");
    s.input("c", 20);
    expect(s.snapshot(30).accuracy).toBe(50); // 1 correct of 2 keystrokes
  });

  it("does nothing at index 0, when idle, or when finished", () => {
    const s = new TypingSession({ text: "a", mode: { kind: "text" } });
    expect(s.backspace(0)).toBe(false); // idle
    s.input("b", 0);
    s.backspace(1);
    expect(s.backspace(2)).toBe(false); // index 0
    s.input("a", 3);
    expect(s.status).toBe("finished");
    expect(s.backspace(4)).toBe(false);
  });

  it("backspace after time expiry finishes instead of editing", () => {
    const s = new TypingSession({ text: "abc", mode: { kind: "time", seconds: 1 } });
    s.input("a", 0);
    expect(s.backspace(1500)).toBe(false);
    expect(s.status).toBe("finished");
  });
});

describe("time mode", () => {
  it("ends at the limit on tick and reports remaining time", () => {
    const s = new TypingSession({ text: "abcdef", mode: { kind: "time", seconds: 2 } });
    s.input("a", 1000);
    expect(s.snapshot(1500).remainingMs).toBe(1500);
    expect(s.tick(2500)).toBe(false);
    expect(s.tick(3000)).toBe(true);
    expect(s.status).toBe("finished");
    expect(s.result(9000).durationMs).toBe(2000);
    expect(s.tick(9000)).toBe(false);
  });

  it("ignores keys typed after expiry", () => {
    const s = new TypingSession({ text: "abcdef", mode: { kind: "time", seconds: 1 } });
    s.input("a", 0);
    expect(s.input("b", 1200)).toBe(false);
    expect(s.result(1200).totalKeystrokes).toBe(1);
  });

  it("tick is a no-op for text mode and idle sessions", () => {
    const t = new TypingSession({ text: "abc", mode: { kind: "text" } });
    t.input("a", 0);
    expect(t.tick(999999)).toBe(false);
    const i = new TypingSession({ text: "abc", mode: { kind: "time", seconds: 1 } });
    expect(i.tick(5)).toBe(false);
  });

  it("finishes when text runs out before time, capped at the limit", () => {
    const s = new TypingSession({ text: "ab", mode: { kind: "time", seconds: 10 } });
    type(s, "ab", 0, 300);
    expect(s.status).toBe("finished");
    expect(s.result(0).durationMs).toBe(300);
  });
});

describe("stop (finish early)", () => {
  it("ends a running untimed session with the time so far", () => {
    const s = new TypingSession({ text: "hello world", mode: { kind: "text" } });
    expect(s.stop(0)).toBe(false); // idle: nothing to stop
    type(s, "hello", 0, 1000);
    expect(s.stop(7000)).toBe(true);
    expect(s.status).toBe("finished");
    const r = s.result(99999);
    expect(r.durationMs).toBe(7000);
    expect(r.totalKeystrokes).toBe(5);
    expect(s.stop(8000)).toBe(false); // already finished
    expect(s.input("x", 9000)).toBe(false);
  });
  it("works while paused (time stops at the pause)", () => {
    const s = new TypingSession({ text: "hello world", mode: { kind: "text" } });
    s.input("h", 0);
    s.pause(2000);
    expect(s.stop(50000)).toBe(true);
    expect(s.result(60000).durationMs).toBe(2000);
  });
  it("a timed session that already ran out finishes at its limit", () => {
    const s = new TypingSession({ text: "abcdef", mode: { kind: "time", seconds: 1 } });
    s.input("a", 0);
    expect(s.stop(5000)).toBe(true);
    expect(s.result(5000).durationMs).toBe(1000);
  });
});

describe("pause / resume", () => {
  it("excludes paused time from elapsed", () => {
    const s = new TypingSession({ text: "abcdef", mode: { kind: "time", seconds: 60 } });
    s.input("a", 0);
    s.pause(1000);
    expect(s.status).toBe("paused");
    expect(s.input("b", 2000)).toBe(false);
    expect(s.backspace(2000)).toBe(false);
    expect(s.elapsed(5000)).toBe(1000);
    s.resume(6000);
    expect(s.status).toBe("running");
    expect(s.elapsed(7000)).toBe(2000);
  });

  it("pause/resume are ignored in the wrong state", () => {
    const s = new TypingSession({ text: "ab", mode: { kind: "text" } });
    s.pause(0);
    s.resume(0);
    expect(s.status).toBe("idle");
    s.input("a", 0);
    s.resume(5);
    expect(s.status).toBe("running");
  });
});

describe("result details", () => {
  it("tracks per-key hits and misses (case-insensitive)", () => {
    const s = new TypingSession({ text: "Pap", mode: { kind: "text" } });
    s.input("p", 0); // wrong case => miss on p
    s.input("a", 10);
    s.input("p", 20);
    const r = s.result(30);
    expect(r.keyStats.p).toEqual({ hits: 1, misses: 1 });
    expect(r.keyStats.a).toEqual({ hits: 1, misses: 0 });
  });

  it("records which key was typed instead of the expected one", () => {
    const s = new TypingSession({ text: "cat", mode: { kind: "text" } });
    s.input("v", 0);
    s.input("a", 10);
    s.input("b", 20);
    expect(s.result(30).confusions).toEqual({ c: { v: 1 }, t: { b: 1 } });
  });

  it("builds a cumulative wpm series, one point per full second", () => {
    const text = "a".repeat(40);
    const s = new TypingSession({ text, mode: { kind: "time", seconds: 3 } });
    for (let i = 0; i < 30; i++) s.input("a", i * 100); // 10 keys / sec
    s.tick(3000);
    const r = s.result(3000);
    expect(r.status).toBe("finished");
    expect(r.wpmSeries).toHaveLength(3);
    expect(r.wpmSeries[0]).toBe(120);
    expect(r.consistency).toBe(100);
  });

  it("structuredClone isolates keyStats from later mutation", () => {
    const s = new TypingSession({ text: "ab", mode: { kind: "text" } });
    s.input("a", 0);
    const r = s.result(1);
    s.input("b", 2);
    expect(r.keyStats.b).toBeUndefined();
  });
});

describe("consistency()", () => {
  it("is 100 for steady speed, 100 for <2 samples, 0 for zero mean", () => {
    expect(consistency([60, 60, 60])).toBe(100);
    expect(consistency([50])).toBe(100);
    expect(consistency([0, 0])).toBe(0);
  });
  it("drops with variance and clamps at 0", () => {
    expect(consistency([40, 80])).toBe(67);
    expect(consistency([0, 0, 0, 100])).toBe(0);
  });
});
