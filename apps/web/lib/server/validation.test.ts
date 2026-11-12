import { describe, expect, it } from "vitest";
import { TypingSession, generateText } from "@typemaster/typing-engine";
import { toPayload } from "../session-payload";
import { forgotSchema, resetSchema, checkGamePlausible, checkPlausible, gameInputSchema, loginSchema, passwordSchema, profileUpdateSchema, registerSchema, sessionInputSchema } from "./validation";
import { rateLimit, resetRateLimits } from "./ratelimit";
import { sameOrigin } from "./http";

const ID = "6f1c9d0e-1b2a-4c3d-8e4f-5a6b7c8d9e0f";

/** Build a payload the same way the real client does, from a real engine run. */
function realPayload(keys: number, ms: number, wrongEvery = 0) {
  const text = generateText({ words: 200, seed: 1 });
  const s = new TypingSession({ text, mode: { kind: "time", seconds: 30 } });
  for (let i = 0; i < keys; i++) {
    const ch = wrongEvery && i % wrongEvery === 0 ? "#" : text[i];
    s.input(ch, (i * ms) / keys);
  }
  s.tick(30000);
  return toPayload(s.result(30000), { seconds: 30, punctuation: false, numbers: false }, ID);
}

describe("engine output passes server validation (client/server contract)", () => {
  it("accepts a clean run", () => {
    const p = realPayload(150, 29000);
    expect(sessionInputSchema.safeParse(p).success).toBe(true);
    expect(checkPlausible(sessionInputSchema.parse(p))).toEqual({ ok: true });
  });
  it("accepts a run with mistakes", () => {
    const p = realPayload(180, 29500, 9);
    expect(checkPlausible(sessionInputSchema.parse(p))).toEqual({ ok: true });
  });
});

describe("checkPlausible rejects tampering", () => {
  const base = () => sessionInputSchema.parse(realPayload(150, 29000));
  it("too short", () => expect(checkPlausible({ ...base(), durationS: 5 })).toEqual({ ok: false, reason: "too_short" }));
  it("no keystrokes", () => expect(checkPlausible({ ...base(), keyStats: {} })).toEqual({ ok: false, reason: "no_keystrokes" }));
  it("inflated wpm", () => expect(checkPlausible({ ...base(), wpm: 150 })).toMatchObject({ ok: false, reason: "inconsistent" }));
  it("inflated raw wpm", () => expect(checkPlausible({ ...base(), rawWpm: 200 })).toMatchObject({ ok: false }));
  it("impossible speed", () => {
    const b = base();
    expect(checkPlausible({ ...b, rawWpm: 350 })).toEqual({ ok: false, reason: "implausible_speed" });
  });
  it("accuracy mismatch", () => expect(checkPlausible({ ...base(), accuracy: 50 })).toMatchObject({ ok: false, reason: "inconsistent" }));
  it("error count mismatch", () => expect(checkPlausible({ ...base(), errors: 40 })).toMatchObject({ ok: false, reason: "inconsistent" }));
});

describe("schemas", () => {
  it("rejects malformed session input", () => {
    expect(sessionInputSchema.safeParse({}).success).toBe(false);
    const p = realPayload(150, 29000);
    expect(sessionInputSchema.safeParse({ ...p, clientId: "nope" }).success).toBe(false);
    expect(sessionInputSchema.safeParse({ ...p, accuracy: 120 }).success).toBe(false);
    expect(sessionInputSchema.safeParse({ ...p, keyStats: { ab: { hits: 1, misses: 0 } } }).success).toBe(false);
  });
  it("password rules", () => {
    expect(passwordSchema.safeParse("short").success).toBe(false);
    expect(passwordSchema.safeParse("password123").success).toBe(false);
    expect(passwordSchema.safeParse("x".repeat(73)).success).toBe(false);
    expect(passwordSchema.safeParse("correct horse battery").success).toBe(true);
  });
  it("register normalises email", () => {
    const r = registerSchema.parse({ name: " Alex ", email: " Alex@Example.COM ", password: "correct horse" });
    expect(r).toMatchObject({ name: "Alex", email: "alex@example.com" });
    expect(registerSchema.safeParse({ name: "", email: "a@b.co", password: "correct horse" }).success).toBe(false);
  });
  it("login and profile schemas", () => {
    expect(loginSchema.safeParse({ email: "bad", password: "x" }).success).toBe(false);
    expect(profileUpdateSchema.safeParse({ goalWpm: 70 }).success).toBe(true);
    expect(profileUpdateSchema.safeParse({ goalWpm: 5000 }).success).toBe(false);
    expect(profileUpdateSchema.safeParse({ isAdmin: true }).success).toBe(false); // strict: unknown keys rejected
  });
});

describe("rateLimit", () => {
  it("blocks after the limit and recovers after the window", () => {
    resetRateLimits();
    expect(rateLimit("k", 2, 1000, 0).ok).toBe(true);
    expect(rateLimit("k", 2, 1000, 10).ok).toBe(true);
    const blocked = rateLimit("k", 2, 1000, 20);
    expect(blocked.ok).toBe(false);
    expect(blocked.retryAfterS).toBe(1);
    expect(rateLimit("k", 2, 1000, 1500).ok).toBe(true);
    expect(rateLimit("other", 2, 1000, 20).ok).toBe(true);
  });
});

describe("sameOrigin", () => {
  const req = (h: Record<string, string>) => new Request("http://localhost/x", { method: "POST", headers: h });
  it("allows missing or matching origin, blocks foreign or malformed", () => {
    expect(sameOrigin(req({}))).toBe(true);
    expect(sameOrigin(req({ origin: "http://localhost:3000", host: "localhost:3000" }))).toBe(true);
    expect(sameOrigin(req({ origin: "https://evil.example", host: "localhost:3000" }))).toBe(false);
    expect(sameOrigin(req({ origin: "not a url", host: "localhost:3000" }))).toBe(false);
  });
});

describe("game results", () => {
  const good = () => gameInputSchema.parse({
    clientId: ID, durationS: 60, wpm: 18, rawWpm: 19, accuracy: 94.7, errors: 5, score: 900, cleared: 28, maxCombo: 14,
    keyStats: { a: { hits: 90, misses: 5 } },
  });
  it("accepts a realistic result", () => expect(checkGamePlausible(good())).toEqual({ ok: true }));
  it("rejects scores the typed letters could not have earned", () => {
    expect(checkGamePlausible({ ...good(), score: 20000 })).toMatchObject({ ok: false, reason: "inconsistent" });
  });
  it("rejects a score too low for the words cleared, and impossible combos", () => {
    expect(checkGamePlausible({ ...good(), score: 100 })).toMatchObject({ ok: false });
    expect(checkGamePlausible({ ...good(), maxCombo: 40 })).toMatchObject({ ok: false });
  });
  it("rejects games that are too short or have inconsistent key stats", () => {
    expect(checkGamePlausible({ ...good(), durationS: 10 })).toEqual({ ok: false, reason: "too_short" });
    expect(checkGamePlausible({ ...good(), accuracy: 60 })).toMatchObject({ ok: false });
  });
  it("schema bounds the numbers", () => {
    expect(gameInputSchema.safeParse({ ...good(), score: -1 }).success).toBe(false);
    expect(gameInputSchema.safeParse({ ...good(), cleared: 99999 }).success).toBe(false);
  });
});

describe("password reset schemas", () => {
  const token = "A".repeat(43);
  it("forgot: normalises email and rejects junk", () => {
    expect(forgotSchema.parse({ email: " Me@Example.COM " }).email).toBe("me@example.com");
    expect(forgotSchema.safeParse({ email: "nope" }).success).toBe(false);
  });
  it("reset: needs a well-formed token and a valid new password", () => {
    expect(resetSchema.safeParse({ token, password: "correct horse 9" }).success).toBe(true);
    expect(resetSchema.safeParse({ token: "short", password: "correct horse 9" }).success).toBe(false);
    expect(resetSchema.safeParse({ token: token + "!", password: "correct horse 9" }).success).toBe(false);
    expect(resetSchema.safeParse({ token, password: "short" }).success).toBe(false);
    expect(resetSchema.safeParse({ token, password: "password123" }).success).toBe(false);
  });
});
