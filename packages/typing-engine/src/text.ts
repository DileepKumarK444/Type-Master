/** Deterministic text generation for tests and practice (same seed → same text). */

const WORDS = (
  "the of and to in is you that it he was for on are as with his they at be this from have or by one had not but what all were when we there can an your which their said if do will each about how up out them then she many some so these would other into has more her two like him see time could no make than first been its who now people my made over did down only way find use may water long little very after words called just where most know get through back much before go good new write our me man too any day same right look think also around another came come work three word must because does part even place well such here take why help put different away again off went old number great tell men say small every found still between name should home big give air line set own under read last never us left end along while might next sound below saw something thought both few those always looked show large often together asked house don't world going want school important until form food keep children feet land side without boy once animals life enough took sometimes four head above kind began almost live page got earth need far hand high year mother light country father let night picture being study second soon story since white ever paper hard near sentence better best across during today however sure knew try told young sun thing whole hear example heard several change answer room sea against top turned learn point city play toward five using himself usually"
).split(" ");

export const COMMON_WORDS: readonly string[] = WORDS;

/** mulberry32 – small seeded PRNG. */
export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface TextOptions {
  words: number;
  seed: number;
  punctuation?: boolean;
  numbers?: boolean;
}

export function generateText({ words, seed, punctuation = false, numbers = false }: TextOptions): string {
  const rand = rng(seed);
  const pick = <T,>(arr: T[]) => arr[Math.floor(rand() * arr.length)];
  const out: string[] = [];
  let sentenceLeft = 0;
  let startOfSentence = true;

  for (let i = 0; i < words; i++) {
    let w = numbers && rand() < 0.12 ? String(Math.floor(rand() * 9999) + 1) : pick(WORDS);
    if (punctuation) {
      if (sentenceLeft === 0) sentenceLeft = 6 + Math.floor(rand() * 7);
      if (startOfSentence) w = w[0].toUpperCase() + w.slice(1);
      startOfSentence = false;
      sentenceLeft--;
      const last = i === words - 1;
      if (sentenceLeft === 0 || last) {
        w += pick([".", ".", ".", "?", "!"]);
        startOfSentence = true;
      } else if (rand() < 0.15) {
        w += ",";
      }
    }
    out.push(w);
  }
  return out.join(" ");
}

export const WORD_LIST_SIZE = WORDS.length;
