import { COMMON_WORDS, rng } from "@typemaster/typing-engine";
import { WORD_POOL, restrictedWords, shuffle } from "./build";
import { BRACKET_TOKENS, CODE_LANGS, OPERATOR_TOKENS, SNIPPETS, type CodeLang } from "./code";
import { weakKeyDrill } from "./drill";

/**
 * "Practice by key" templates. A template is identified by a short string id (it travels in a URL):
 *   key:e          one key (letter, digit or symbol)        keys:pq;,   a set of keys (each character is one key)
 *   row:home|top|bottom|numbers                             finger:left-pinky … right-pinky
 *   hand:left|right (words typed with one hand only)        vowels
 *   words:50|100|200 (the most common words)                pairs:common | pairs:endings
 *   code:brackets | code:operators | code:js|python|sql|shell|html
 * `templateText(id, seed, size)` is deterministic: same id + seed + size → same text.
 */

export type TemplateKind = "text" | "code";
export interface TemplateInfo { id: string; label: string; kind: TemplateKind; blurb: string; keys?: string[] }
export interface TemplateGroup { id: string; label: string; items: TemplateInfo[] }

const ROWS: Record<string, string> = { home: "asdfghjkl;", top: "qwertyuiop", bottom: "zxcvbnm,./", numbers: "1234567890" };
const FINGERS: Record<string, [string, string]> = {
  "left-pinky": ["Left pinky", "qaz"], "left-ring": ["Left ring", "wsx"], "left-middle": ["Left middle", "edc"], "left-index": ["Left index", "rfvtgb"],
  "right-index": ["Right index", "yhnujm"], "right-middle": ["Right middle", "ik,"], "right-ring": ["Right ring", "ol."], "right-pinky": ["Right pinky", "p;/"],
};
const HANDS: Record<string, [string, string]> = { left: ["Left hand", "qwertasdfgzxcvb"], right: ["Right hand", "yuiophjklnm"] };
const PAIRS = ["th", "he", "in", "er", "an", "re", "on", "at", "en", "nd", "ti", "es", "or", "te", "of", "ed", "is", "it", "al", "ar"];
const ENDINGS = ["ing", "ed", "er", "ly", "tion", "ment", "ness", "es", "al"];
const SYMBOLS = [".", ",", ";", ":", "'", '"', "!", "?", "-", "_", "(", ")", "[", "]", "{", "}", "<", ">", "/", "\\", "|", "@", "#", "$", "%", "^", "&", "*", "+", "=", "~", "`"];

const keyLabel = (c: string) => (/[a-z]/.test(c) ? c.toUpperCase() : c);
const chars = (s: string) => [...s];

export function templateInfo(id: string): TemplateInfo | undefined {
  const [kind, arg = ""] = [id.slice(0, id.indexOf(":") < 0 ? id.length : id.indexOf(":")), id.includes(":") ? id.slice(id.indexOf(":") + 1) : ""];
  switch (kind) {
    case "key": return [...arg].length === 1 && arg.trim() ? { id, label: `Key ${keyLabel(arg)}`, kind: "text", blurb: "Just this one key", keys: [arg] } : undefined;
    case "keys": { const k = chars(arg).filter((c) => c.trim()); return k.length ? { id, label: `Keys ${k.map(keyLabel).join(" ")}`, kind: "text", blurb: "A set of keys", keys: k } : undefined; }
    case "row": return ROWS[arg] ? { id, label: `${arg[0].toUpperCase()}${arg.slice(1)} row`, kind: "text", blurb: `Keys: ${chars(ROWS[arg]).join(" ")}`, keys: chars(ROWS[arg]) } : undefined;
    case "finger": return FINGERS[arg] ? { id, label: FINGERS[arg][0], kind: "text", blurb: `Keys: ${chars(FINGERS[arg][1]).join(" ")}`, keys: chars(FINGERS[arg][1]) } : undefined;
    case "hand": return HANDS[arg] ? { id, label: HANDS[arg][0], kind: "text", blurb: "Words typed with this hand only", keys: chars(HANDS[arg][1]) } : undefined;
    case "vowels": return { id, label: "Vowels", kind: "text", blurb: "A E I O U", keys: chars("aeiou") };
    case "words": return ["50", "100", "200"].includes(arg) ? { id, label: `Top ${arg} words`, kind: "text", blurb: "The most common English words" } : undefined;
    case "pairs": return arg === "common" ? { id, label: "Common letter pairs", kind: "text", blurb: PAIRS.slice(0, 8).join(" ") + " …" } : arg === "endings" ? { id, label: "Common endings", kind: "text", blurb: ENDINGS.slice(0, 6).join(" ") + " …" } : undefined;
    case "code": {
      if (arg === "brackets") return { id, label: "Brackets & quotes", kind: "code", blurb: "( ) [ ] { } < > \" ' `" };
      if (arg === "operators") return { id, label: "Operators", kind: "code", blurb: "=== !== => && || ?? += …" };
      const lang = CODE_LANGS.find((l) => l.id === arg);
      return lang ? { id, label: lang.label, kind: "code", blurb: "Real snippets, with Enter and indentation" } : undefined;
    }
    default: return undefined;
  }
}

/** Snippets (shuffled, cycled) joined with Enter until the text is roughly `size` words (≈ 6 characters each) long. */
function codeText(lang: CodeLang, seed: number, size: number): string {
  const rand = rng(seed);
  const bank = SNIPPETS[lang];
  const target = size * 6;
  const out: string[] = [];
  let len = 0;
  while (len < target) {
    for (const s of shuffle(bank, rand)) {
      out.push(s);
      len += s.length + 1;
      if (len >= target) break;
    }
  }
  return out.join("\n");
}

function tokenText(tokens: string[], seed: number, size: number): string {
  const rand = rng(seed);
  const out: string[] = [];
  while (out.length < size) out.push(...shuffle(tokens, rand));
  return out.slice(0, size).join(" ");
}

/** Practice text for a template. `size` ≈ number of words/tokens (code snippets: ≈ size × 6 characters). */
export function templateText(id: string, seed: number, size = 50): string {
  const info = templateInfo(id);
  if (!info) throw new Error(`Unknown template: ${id}`);
  const rand = rng(seed);
  const [kind, arg = ""] = [id.split(":")[0], id.includes(":") ? id.slice(id.indexOf(":") + 1) : ""];
  switch (kind) {
    case "key": case "keys": case "row": case "finger": case "vowels": {
      const keys = info.keys!;
      if (kind === "row" && arg === "numbers") return tokenText(Array.from({ length: 40 }, () => chars("1234567890").sort(() => rand() - 0.5).slice(0, 2 + Math.floor(rand() * 3)).join("")), seed, size);
      return weakKeyDrill(keys, seed, size);
    }
    case "hand": return restrictedWords(rand, chars(HANDS[arg][1]), [], size).join(" ");
    case "words": return tokenText([...COMMON_WORDS].slice(0, Number(arg)), seed, size);
    case "pairs": {
      const needles = arg === "common" ? PAIRS : ENDINGS;
      const words = WORD_POOL.filter((w) => w.length > 3 && needles.some((n) => (arg === "common" ? w.includes(n) : w.endsWith(n))));
      return tokenText(words.length ? words : [...WORD_POOL], seed, size);
    }
    case "code":
      if (arg === "brackets") return tokenText(BRACKET_TOKENS, seed, size);
      if (arg === "operators") return tokenText(OPERATOR_TOKENS, seed, size);
      return codeText(arg as CodeLang, seed, size);
  }
  throw new Error(`Unhandled template: ${id}`);
}

const item = (id: string) => templateInfo(id)!;
const ids = (...list: string[]) => list.map(item);

/** The catalogue shown on the "Practice by key" page. */
export const TEMPLATE_GROUPS: TemplateGroup[] = [
  { id: "letters", label: "Letters", items: chars("abcdefghijklmnopqrstuvwxyz").map((c) => item(`key:${c}`)) },
  { id: "numbers", label: "Numbers", items: [...chars("0123456789").map((c) => item(`key:${c}`)), item("row:numbers")] },
  { id: "symbols", label: "Symbols", items: SYMBOLS.map((c) => item(`key:${c}`)) },
  {
    id: "rows", label: "Rows & fingers",
    items: ids("row:home", "row:top", "row:bottom", "hand:left", "hand:right", "vowels", ...Object.keys(FINGERS).map((f) => `finger:${f}`)),
  },
  { id: "words", label: "Words & pairs", items: ids("words:50", "words:100", "words:200", "pairs:common", "pairs:endings") },
  { id: "code", label: "Code", items: ids("code:brackets", "code:operators", ...CODE_LANGS.map((l) => `code:${l.id}`)) },
];

export const isCodeTemplate = (id: string) => id.startsWith("code:");
