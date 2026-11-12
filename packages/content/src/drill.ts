import { rng } from "@typemaster/typing-engine";
import { WORD_POOL, shuffle } from "./build";

const LETTER = /^[a-z]$/;

/**
 * Practice text that concentrates on the keys a user misses most. Letters are drilled inside real words
 * (more weak letters in a word = chosen more often); other keys (punctuation, digits) as short groups and
 * word suffixes. Deterministic for a given seed.
 */
export function weakKeyDrill(weakKeys: string[], seed: number, tokens = 80): string {
  const keys = [...new Set(weakKeys.map((k) => k.toLowerCase()).filter((k) => k.length === 1 && k !== " "))];
  if (keys.length === 0) throw new Error("weakKeyDrill needs at least one key");
  const rand = rng(seed);
  const letters = keys.filter((k) => LETTER.test(k));
  const others = keys.filter((k) => !LETTER.test(k));

  const scored = letters.length
    ? WORD_POOL.map((w) => ({ w, n: letters.reduce((a, k) => a + [...w].filter((c) => c === k).length, 0) })).filter((x) => x.n > 0)
    : [];
  const weighted = shuffle(scored, rand).sort((a, b) => b.n - a.n).map((x) => x.w);
  const top = weighted.slice(0, Math.max(30, Math.min(weighted.length, 60)));

  const group = () => {
    const len = 2 + Math.floor(rand() * 2);
    let g = "";
    for (let i = 0; i < len; i++) g += keys[Math.floor(rand() * keys.length)];
    return g;
  };

  const out: string[] = [];
  for (let i = 0; i < tokens; i++) {
    const r = rand();
    if (top.length && r < 0.7) {
      let w = top[Math.floor(rand() * top.length)];
      if (others.length && rand() < 0.3) w += others[Math.floor(rand() * others.length)];
      out.push(w);
    } else {
      out.push(group());
    }
  }
  return out.join(" ");
}
