import { z } from "zod";

export const MIN_SESSION_S = 10; // shorter runs are discarded (docs/03 navigation rules)
export const MAX_WPM = 300;

const keyStat = z.object({ hits: z.number().int().min(0).max(10000), misses: z.number().int().min(0).max(10000) });

export const sessionInputSchema = z.object({
  clientId: z.string().uuid(),
  durationS: z.number().int().min(1).max(3600), // untimed practice can run longer than a timed test
  wpm: z.number().min(0).max(400),
  rawWpm: z.number().min(0).max(400),
  accuracy: z.number().min(0).max(100),
  consistency: z.number().min(0).max(100),
  errors: z.number().int().min(0).max(10000),
  keyStats: z.record(z.string().length(1), keyStat).refine((o) => Object.keys(o).length <= 100, "too many keys"),
  mode: z.union([
    z.object({ seconds: z.number().int().min(1).max(600), punctuation: z.boolean(), numbers: z.boolean() }),
    z.object({ free: z.literal(true), words: z.number().int().min(1).max(2000).nullable() }),
  ]),
  /** "drill" = key/template practice and "free" = untimed practice: both count as practice time and key stats, but not toward speed records; free earns no XP */
  kind: z.enum(["test", "drill", "free"]).default("test"),
});
export type SessionInput = z.infer<typeof sessionInputSchema>;

/** Final lesson test: text mode, so duration is a float (no rounding error on short runs) and there is no practice `mode`. */
export const lessonCompleteSchema = sessionInputSchema.omit({ mode: true, durationS: true, kind: true }).extend({ durationS: z.number().min(1).max(1800) });
export type LessonCompleteInput = z.infer<typeof lessonCompleteSchema>;

export const LESSON_MIN_SECONDS = 3;

/** Word Rush result. Same per-key stats as a test (so the plausibility rules apply), plus score fields. */
export const gameInputSchema = sessionInputSchema.omit({ mode: true, durationS: true, kind: true, consistency: true }).extend({
  durationS: z.number().min(1).max(600),
  score: z.number().int().min(0).max(200_000),
  cleared: z.number().int().min(0).max(2000),
  maxCombo: z.number().int().min(0).max(2000),
});
export type GameInput = z.infer<typeof gameInputSchema> & { consistency: number };
export const GAME_MIN_SECONDS = 20;

export type Plausibility = { ok: true } | { ok: false; reason: "too_short" | "no_keystrokes" | "implausible_speed" | "inconsistent" };

/**
 * Light anti-cheat (docs/07 §3): the client reports aggregates AND per-key counts, and the
 * numbers must agree with each other. This stops casual tampering; it is not a proof of play.
 */
type Checkable = Omit<SessionInput, "mode" | "clientId" | "kind">;

export function checkPlausible(i: Checkable, minSeconds = MIN_SESSION_S): Plausibility {
  if (i.durationS < minSeconds) return { ok: false, reason: "too_short" };
  let hits = 0, misses = 0;
  for (const s of Object.values(i.keyStats)) { hits += s.hits; misses += s.misses; }
  const total = hits + misses;
  if (total === 0) return { ok: false, reason: "no_keystrokes" };
  if (i.rawWpm > MAX_WPM) return { ok: false, reason: "implausible_speed" };
  const rawExpected = total / 5 / (i.durationS / 60);
  if (Math.abs(i.rawWpm - rawExpected) > Math.max(2, rawExpected * 0.08)) return { ok: false, reason: "inconsistent" };
  if (i.wpm > i.rawWpm + 0.5) return { ok: false, reason: "inconsistent" };
  if (Math.abs(i.accuracy - (hits / total) * 100) > 1) return { ok: false, reason: "inconsistent" };
  if (i.errors !== misses) return { ok: false, reason: "inconsistent" };
  return { ok: true };
}

const COMMON = new Set(["password", "password1", "password123", "12345678", "123456789", "qwertyuiop", "11111111", "iloveyou", "letmein1", "admin123", "typemaster"]);

export const passwordSchema = z
  .string()
  .min(8, "Use at least 8 characters")
  .max(72, "Use 72 characters or fewer")
  .refine((p) => !COMMON.has(p.toLowerCase()), "That password is too common");

export const registerSchema = z.object({
  name: z.string().trim().min(1, "Enter your name").max(60),
  email: z.string().trim().toLowerCase().email("Enter a valid email").max(254),
  password: passwordSchema,
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  password: z.string().min(1).max(72),
});

export const profileUpdateSchema = z
  .object({
    displayName: z.string().trim().min(1).max(60),
    goalWpm: z.number().int().min(5).max(300),
    dailyMinutes: z.number().int().min(1).max(240),
    prefs: z.object({ sound: z.boolean().optional(), showKeyboard: z.boolean().optional() }),
  })
  .partial()
  .strict();

/** Game results must also have a score the typed letters could actually earn (max multiplier is x4, 10 points a letter). */
export function checkGamePlausible(i: z.infer<typeof gameInputSchema>): Plausibility {
  const base = checkPlausible({ ...i, consistency: 100 }, GAME_MIN_SECONDS);
  if (!base.ok) return base;
  if (i.maxCombo > i.cleared) return { ok: false, reason: "inconsistent" };
  const correctChars = (i.wpm * 5 * i.durationS) / 60;
  if (i.score > Math.ceil(correctChars * 40 * 1.1) + 50) return { ok: false, reason: "inconsistent" };
  if (i.cleared > 0 && i.score < i.cleared * 30) return { ok: false, reason: "inconsistent" }; // 3-letter words at x1 = 30
  return { ok: true };
}

export const forgotSchema = z.object({ email: z.string().trim().toLowerCase().email().max(254) });

/** `token` is 32 random bytes as base64url (43 chars); bound the length so junk is rejected before hashing. */
export const resetSchema = z.object({ token: z.string().min(20).max(128).regex(/^[A-Za-z0-9_-]+$/), password: passwordSchema });
