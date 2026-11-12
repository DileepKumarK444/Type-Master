import { describe, expect, it } from "vitest";
import { modeLabel } from "./mode-label";

describe("modeLabel", () => {
  it("describes every session kind", () => {
    expect(modeLabel("test", { seconds: 60, punctuation: true, numbers: false })).toBe("Test · 60s · punct.");
    expect(modeLabel("test", { seconds: 15, punctuation: false, numbers: true }, true)).toBe("Timed test · 15s · numbers");
    expect(modeLabel("drill", { seconds: 60, punctuation: false, numbers: false })).toBe("Drill · 60s");
    expect(modeLabel("drill", { seconds: 60, punctuation: false, numbers: false }, true)).toBe("Key practice · 60s");
    expect(modeLabel("lesson", { lessonId: 4 })).toBe("Lesson 4");
    expect(modeLabel("game", { game: "word-rush", seconds: 60 })).toBe("Word Rush");
    expect(modeLabel("free", { free: true, words: 50 })).toBe("Free practice · 50 words");
    expect(modeLabel("free", { free: true, words: null })).toBe("Free practice · endless");
  });
});
