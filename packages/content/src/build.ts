import { COMMON_WORDS, generateText, rng } from "@typemaster/typing-engine";
import { BRACKET_TOKENS, OPERATOR_TOKENS, SNIPPETS, type CodeLang } from "./code";
import { LESSONS, type LessonDef } from "./lessons";

export type StepKind = "meet" | "drill" | "words" | "test";
export interface LessonStep { kind: StepKind; title: string; hint: string; text: string }

/** Extra short words made only of home-row letters, so the very first lessons can use real words. */
const HOME_WORDS = ["ask", "asks", "add", "adds", "all", "alas", "dad", "dads", "fad", "fall", "falls", "flask", "flag", "flags", "gas", "glad", "gash", "gal", "half", "hall", "halls", "has", "hag", "had", "hash", "jag", "jags", "lad", "lads", "lag", "sad", "sag", "sash", "shall", "slash", "salad", "dash", "gaff", "alfalfa"];
const POOL = [...new Set([...HOME_WORDS, ...COMMON_WORDS])];

/** All practice words (shared with the weak-key drill generator). */
export const WORD_POOL: readonly string[] = POOL;

const LETTER = /^[a-z]$/;
const letters = (keys: string[]) => keys.filter((k) => LETTER.test(k));

/** Every key learned up to and including this lesson (beginner lessons only). */
export function allowedKeys(id: number): string[] {
  const set = new Set<string>();
  for (const l of LESSONS) if (l.id <= id && l.level === "beginner") l.newKeys.forEach((k) => set.add(k));
  return [...set];
}

export function shuffle<T>(arr: T[], rand: () => number): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
const pick = <T>(arr: T[], rand: () => number) => arr[Math.floor(rand() * arr.length)];

/** Random key groups ("fj jf ffj"). `focus` keys are chosen with probability `ratio`. */
function groups(rand: () => number, focus: string[], all: string[], count: number, min: number, max: number, ratio: number): string[] {
  const out: string[] = [];
  for (let i = 0; i < count; i++) {
    const len = min + Math.floor(rand() * (max - min + 1));
    let g = "";
    for (let c = 0; c < len; c++) g += pick(focus.length && rand() < ratio ? focus : all, rand);
    if (focus.length && !focus.some((k) => g.includes(k))) g = g.slice(0, -1) + pick(focus, rand);
    out.push(g);
  }
  return out;
}

/** Real words made only of `allowed` letters, preferring ones containing a new letter. Falls back to key groups. */
export function restrictedWords(rand: () => number, allowed: string[], newKeys: string[], count: number): string[] {
  const set = new Set(letters(allowed));
  const fits = POOL.filter((w) => [...w].every((c) => set.has(c)));
  const fresh = letters(newKeys);
  const withNew = fresh.length ? fits.filter((w) => fresh.some((k) => w.includes(k))) : fits;
  const chosen = shuffle(withNew, rand).slice(0, Math.ceil(count * 0.7));
  const rest = shuffle(fits, rand).filter((w) => !chosen.includes(w)).slice(0, count - chosen.length);
  const out = [...chosen, ...rest];
  while (out.length < count) out.push(...groups(rand, fresh, [...set], 1, 2, 4, 0.7));
  return shuffle(out, rand).slice(0, count);
}

/** Sprinkle the new punctuation keys (, .) after some words so they get practised in context. */
function withPunctuation(words: string[], newKeys: string[]): string[] {
  const marks = newKeys.filter((k) => k === "," || k === ".");
  if (!marks.length) return words;
  return words.map((w, i) => (i % 3 === 2 ? w + marks[(i / 3 | 0) % marks.length] : w));
}

const capitalise = (w: string) => w[0].toUpperCase() + w.slice(1);
const commonWords = (rand: () => number, n: number) => Array.from({ length: n }, () => pick([...COMMON_WORDS], rand));

const SENTENCES: Record<number, string[]> = {
  18: [
    "The cat sat on the warm mat.", "We went to the park today.", "She reads a book every night.", "The sun rises in the east.",
    "My brother plays the guitar.", "Rain tapped on the window.", "They made fresh bread together.", "Our dog loves long walks.",
  ],
  19: [
    "When the bell rang, everyone hurried outside, laughing.", "Do you think we can finish before the rain starts?",
    "I packed a sandwich, an apple, and a small bottle of water.", "Slowly, carefully, she carried the tray across the room.",
    "Which road leads to the old lighthouse, and how far is it?", "He smiled, waved, and walked quietly down the hill.",
    "If it snows tonight, will school be closed tomorrow?", "Learning to type is simple, but it takes steady practice.",
  ],
  20: [
    "The lighthouse stood at the edge of the world, its beam sweeping slowly across the dark water.",
    "Every evening, the keeper climbed the long spiral stairs, checked the great lamp, and wrote a few lines in his journal.",
    "Ships passed far away, small and silent, trusting that tiny light to guide them home.",
    "On stormy nights the waves rose high, yet the old tower never trembled; it simply waited for morning.",
    "Typing is much the same: small, steady movements, repeated patiently, until the rhythm feels natural.",
    "When your fingers know the way, your mind is free to think about what you want to say.",
  ],
};

function lettersSteps(def: LessonDef, rand: () => number): string[] {
  const allowed = allowedKeys(def.id);
  const fresh = def.newKeys;
  const focus = fresh.length ? fresh : allowed;
  const allLetters = allowed.length ? allowed : [];
  const meet = groups(rand, focus, focus, 8, 2, 3, 1).join(" ");
  const drill = groups(rand, focus, allLetters, 12, 2, 4, 0.6).join(" ");
  const words = withPunctuation(restrictedWords(rand, allowed, fresh, 10), fresh).join(" ");
  const testCount = def.id <= 4 ? 14 : 20;
  const test = withPunctuation(restrictedWords(rand, allowed, fresh.length && def.id < 12 ? fresh : [], testCount), fresh).join(" ");
  return [meet, drill, words, test];
}

function digitsSteps(def: LessonDef, rand: () => number): string[] {
  const d = def.newKeys;
  const num = (min: number, max: number) => groups(rand, d, d, 1, min, max, 1)[0];
  const meet = Array.from({ length: 8 }, () => num(2, 3)).join(" ");
  const drill = Array.from({ length: 12 }, () => num(2, 4)).join(" ");
  const mixed = (n: number) => Array.from({ length: n }, (_, i) => (i % 2 ? num(1, 3) : pick([...COMMON_WORDS], rand))).join(" ");
  return [meet, drill, mixed(12), mixed(24)];
}

function capitalsSteps(rand: () => number): string[] {
  const caps = (n: number, p: number) => commonWords(rand, n).map((w) => (rand() < p ? capitalise(w) : w)).join(" ");
  return [commonWords(rand, 8).map(capitalise).join(" "), caps(12, 0.6), commonWords(rand, 10).map(capitalise).join(" "), caps(20, 0.4)];
}

function punctSteps(rand: () => number): string[] {
  const sentence = (seed: number, words: number) => generateText({ words, seed: Math.floor(rand() * 1e6) + seed, punctuation: true });
  return ["Yes. No. Maybe, yes! Really? Okay, fine.", sentence(1, 10), sentence(2, 14), sentence(3, 26)];
}

function sentencesSteps(def: LessonDef): string[] {
  const s = SENTENCES[def.id];
  return [s[0], `${s[1]} ${s[2]}`, s.slice(2, 5).join(" "), s.slice(3, def.id === 20 ? 6 : 7).join(" ")];
}

const CODE_TRACK: Record<number, "brackets" | "operators" | CodeLang> = { 21: "brackets", 22: "operators", 23: "js", 24: "python", 25: "sql" };

/** Coding lessons: symbol drills (21–22) then real snippets (23–25). Snippets are picked without repeats; tests include Enter. */
function codeSteps(def: LessonDef, rand: () => number): string[] {
  const track = CODE_TRACK[def.id];
  if (track === "brackets" || track === "operators") {
    const tokens = track === "brackets" ? BRACKET_TOKENS : OPERATOR_TOKENS;
    const pickTokens = (n: number) => shuffle(tokens, rand).slice(0, n).join(" ");
    const meet = track === "brackets" ? `() [] {} "" '' () [] {}` : "+ - * / = < > ! & | ? :";
    return [meet, pickTokens(10), pickTokens(14), pickTokens(20)];
  }
  const bank = SNIPPETS[track];
  const used = new Set<string>();
  const take = (list: string[]) => { const s = shuffle(list, rand).find((x) => !used.has(x)) ?? list[0]; used.add(s); return s; };
  const single = bank.filter((x) => !x.includes("\n"));
  const multi = bank.filter((x) => x.includes("\n"));
  const shortest = [...single].sort((a, b) => a.length - b.length).slice(0, 3);
  return [take(shortest), `${take(single)}\n${take(single)}`, `${take(multi)}\n${take(single)}`, `${take(single)}\n${take(multi)}\n${take(multi)}`];
}

const STEP_META: Omit<LessonStep, "text">[] = [
  { kind: "meet", title: "Meet the keys", hint: "Take your time. Learn where each finger goes." },
  { kind: "drill", title: "Drill", hint: "Repeat the patterns. Accuracy first, speed will follow." },
  { kind: "words", title: "Words", hint: "Now the keys appear inside real words." },
  { kind: "test", title: "Mini test", hint: "Reach the accuracy goal to pass this lesson." },
];

/** Deterministic: the same lesson always produces the same four texts (so a retry uses the same text). */
export function buildLesson(def: LessonDef): LessonStep[] {
  const rand = rng(def.id * 7919 + 13);
  let texts: string[];
  switch (def.kind) {
    case "code": texts = codeSteps(def, rand); break;
    case "digits": texts = digitsSteps(def, rand); break;
    case "capitals": texts = capitalsSteps(rand); break;
    case "punct": texts = punctSteps(rand); break;
    case "sentences": texts = sentencesSteps(def); break;
    case "words": texts = [8, 12, 16, 25].map((n) => commonWords(rand, n).join(" ")); break;
    default: texts = lettersSteps(def, rand);
  }
  return STEP_META.map((m, i) => ({ ...m, text: texts[i] }));
}
