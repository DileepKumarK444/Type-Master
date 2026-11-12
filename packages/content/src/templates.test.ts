import { describe, expect, it } from "vitest";
import { CODE_LANGS, SNIPPETS } from "./code";
import { TEMPLATE_GROUPS, isCodeTemplate, templateInfo, templateText } from "./templates";

const ALL = TEMPLATE_GROUPS.flatMap((g) => g.items);

describe("catalogue", () => {
  it("has the expected groups and every id resolves and is unique", () => {
    expect(TEMPLATE_GROUPS.map((g) => g.id)).toEqual(["letters", "numbers", "symbols", "rows", "words", "code"]);
    expect(new Set(ALL.map((i) => i.id)).size).toBe(ALL.length);
    for (const i of ALL) expect(templateInfo(i.id), i.id).toMatchObject({ id: i.id, label: i.label });
    expect(TEMPLATE_GROUPS[0].items).toHaveLength(26);
    expect(TEMPLATE_GROUPS[1].items).toHaveLength(11);
  });
  it("labels read well, and rejects junk ids", () => {
    expect(templateInfo("key:e")?.label).toBe("Key E");
    expect(templateInfo("key:;")?.label).toBe("Key ;");
    expect(templateInfo("keys:pq;,")?.keys).toEqual(["p", "q", ";", ","]);
    expect(templateInfo("row:home")?.label).toBe("Home row");
    expect(templateInfo("hand:left")?.label).toBe("Left hand");
    for (const bad of ["", "key:", "key:ab", "key: ", "row:nope", "finger:x", "hand:up", "words:7", "pairs:x", "code:cobol", "nope:1"]) expect(templateInfo(bad), bad).toBeUndefined();
    expect(() => templateText("nope:1", 1)).toThrow();
    expect(isCodeTemplate("code:js")).toBe(true);
    expect(isCodeTemplate("key:e")).toBe(false);
  });
});

describe("templateText", () => {
  it("every template makes non-empty, deterministic, junk-free text", () => {
    for (const i of ALL) {
      const t = templateText(i.id, 7, 30);
      expect(t.length, i.id).toBeGreaterThan(10);
      expect(templateText(i.id, 7, 30), i.id).toBe(t);
      expect(t, i.id).not.toMatch(/\t| \n|\n$|^ | $/);
      if (i.kind === "text") expect(t, i.id).not.toMatch(/undefined|NaN/); // real code may legitimately contain "undefined"
      expect(t, i.id).toMatch(/^[\x20-\x7e\n]+$/); // plain typeable ASCII
    }
  });
  it("a different seed gives different text", () => {
    expect(templateText("key:e", 1, 30)).not.toBe(templateText("key:e", 2, 30));
  });
  it("single-key templates concentrate on that key (letters inside real words)", () => {
    const toks = templateText("key:e", 3, 60).split(" ");
    expect(toks.filter((w) => w.includes("e")).length).toBeGreaterThan(40);
    expect(templateText("key:;", 3, 30)).toMatch(/;/);
    expect(templateText("key:7", 3, 30)).toMatch(/7/);
  });
  it("hand templates use only that hand's letters", () => {
    expect(templateText("hand:left", 4, 40)).toMatch(/^[qwertasdfgzxcvb ]+$/);
    expect(templateText("hand:right", 4, 40)).toMatch(/^[yuiophjklnm ]+$/);
  });
  it("row, finger, vowel and number templates contain their keys", () => {
    expect(templateText("row:home", 5, 40)).toMatch(/[asdfghjkl;]/);
    expect(templateText("finger:left-pinky", 5, 40)).toMatch(/[qaz]/);
    expect(templateText("vowels", 5, 40)).toMatch(/[aeiou]/);
    expect(templateText("row:numbers", 5, 30)).toMatch(/^[0-9 ]+$/);
  });
  it("common-word templates draw only from the top-N words", () => {
    const top50 = new Set(templateText("words:50", 6, 200).split(" "));
    expect(top50.size).toBeLessThanOrEqual(50);
    expect(templateText("words:200", 6, 300).split(" ").length).toBe(300);
  });
  it("letter-pair and ending templates use words containing / ending in the target", () => {
    expect(templateText("pairs:common", 8, 40).split(" ").every((w) => ["th", "he", "in", "er", "an", "re", "on", "at", "en", "nd", "ti", "es", "or", "te", "of", "ed", "is", "it", "al", "ar"].some((p) => w.includes(p)))).toBe(true);
    expect(templateText("pairs:endings", 8, 40).split(" ").every((w) => ["ing", "ed", "er", "ly", "tion", "ment", "ness", "es", "al"].some((e) => w.endsWith(e)))).toBe(true);
  });
});

describe("code templates", () => {
  it("snippets use spaces, no tabs, no trailing spaces, ASCII only", () => {
    for (const [lang, list] of Object.entries(SNIPPETS)) for (const s of list) {
      expect(s, `${lang}: ${s}`).not.toMatch(/\t| \n| $/);
      expect(s, `${lang}: ${s}`).toMatch(/^[\x20-\x7e\n]+$/);
      expect(s.split("\n").length).toBeLessThanOrEqual(5);
    }
    expect(CODE_LANGS.map((l) => l.id)).toEqual(["js", "python", "sql", "shell", "html"]);
  });
  it("language templates produce real multi-line code long enough for the requested size", () => {
    for (const l of CODE_LANGS) {
      const t = templateText(`code:${l.id}`, 2, 60);
      expect(t.length, l.id).toBeGreaterThanOrEqual(60 * 6);
      expect(t.includes("\n"), l.id).toBe(true);
    }
    expect(templateText("code:sql", 2, 20)).toMatch(/SELECT|INSERT|UPDATE|CREATE|DELETE/);
    expect(templateText("code:js", 2, 20)).toMatch(/[{}();=]/);
  });
  it("bracket and operator drills are symbol-heavy single lines", () => {
    expect(templateText("code:brackets", 1, 30)).toMatch(/[()[\]{}]/);
    expect(templateText("code:operators", 1, 30)).toMatch(/===|!==|&&|\|\||\?\?|\+=/);
    expect(templateText("code:brackets", 1, 30)).not.toContain("\n");
  });
});
