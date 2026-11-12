import { describe, expect, it } from "vitest";
import { weakKeyDrill } from "./drill";

describe("weakKeyDrill", () => {
  it("is deterministic and has the requested token count", () => {
    const a = weakKeyDrill(["p", "q"], 5, 40);
    expect(a).toBe(weakKeyDrill(["p", "q"], 5, 40));
    expect(a.split(" ")).toHaveLength(40);
    expect(weakKeyDrill(["p", "q"], 6, 40)).not.toBe(a);
  });
  it("concentrates on the weak letters, mostly inside real words", () => {
    const text = weakKeyDrill(["p"], 1, 80);
    const withP = text.split(" ").filter((t) => t.includes("p")).length;
    expect(withP).toBeGreaterThan(80 * 0.6);
    expect(text).toMatch(/[a-z]{4,}/);
  });
  it("handles punctuation-only weak keys with key groups", () => {
    const text = weakKeyDrill([";", ","], 2, 30);
    expect(text).toMatch(/^[;, ]+$/);
    expect(text).toMatch(/[;,]/);
  });
  it("mixes punctuation suffixes into words for mixed keys", () => {
    expect(weakKeyDrill(["p", ","], 3, 120)).toMatch(/[a-z],/);
  });
  it("normalises case, drops duplicates/space, and rejects empty input", () => {
    expect(weakKeyDrill(["P", "p", " "], 4, 10)).toMatch(/p/);
    expect(() => weakKeyDrill([], 1)).toThrow();
    expect(() => weakKeyDrill([" ", "ab"], 1)).toThrow();
  });
  it("falls back to groups when no word contains the letter", () => {
    expect(weakKeyDrill(["z"], 9, 20)).toMatch(/z/);
  });
});
