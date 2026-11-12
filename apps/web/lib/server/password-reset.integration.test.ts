import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { createDb, passwordResetTokens, users } from "@typemaster/db";
import { runMigrations } from "@typemaster/db/src/migrate";
import { deleteAccount } from "./account";
import { RESET_TTL_MINUTES, createResetToken, hashToken, isResetTokenValid, newToken, resetPassword } from "./password-reset";
import { getSessionVersion, registerUser, upsertGoogleUser, verifyCredentials } from "./users";

const URL = process.env.DATABASE_URL_TEST;

describe("tokens (pure)", () => {
  it("are long, url-safe and unique; hashes are stable and not reversible to the token", () => {
    const a = newToken(), b = newToken();
    expect(a).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(a).not.toBe(b);
    expect(hashToken(a)).toBe(hashToken(a));
    expect(hashToken(a)).toMatch(/^[0-9a-f]{64}$/);
    expect(hashToken(a)).not.toContain(a);
  });
});

describe.skipIf(!URL)("password reset", () => {
  const { db, client } = createDb(URL ?? "postgres://unused", { max: 5 });
  const tag = Date.now().toString(36);
  const email = (n: string) => `rs.${n}.${tag}@test.example`;
  const ids: string[] = [];
  const mk = async (n: string, password = "old password 1") => { const { id } = await registerUser(db, { name: n, email: email(n), password }); ids.push(id); return id; };

  beforeAll(async () => { await runMigrations(URL!); });
  afterAll(async () => { for (const id of ids) await deleteAccount(db, id).catch(() => {}); await client.end(); });

  it("unknown email creates nothing and returns null (callers answer identically)", async () => {
    expect(await createResetToken(db, email("nobody"))).toBeNull();
  });

  it("stores only a hash with a 60-minute expiry", async () => {
    const id = await mk("a");
    const now = new Date("2026-11-12T10:00:00Z");
    const t = await createResetToken(db, email("A").toUpperCase(), now); // lookup is case-insensitive
    expect(t?.email).toBe(email("a"));
    const rows = await db.select().from(passwordResetTokens).where(eq(passwordResetTokens.userId, id));
    expect(rows).toHaveLength(1);
    expect(rows[0].tokenHash).toBe(hashToken(t!.token));
    expect(JSON.stringify(rows)).not.toContain(t!.token);
    expect(rows[0].expiresAt.getTime() - now.getTime()).toBe(RESET_TTL_MINUTES * 60_000);
  });

  it("a new request replaces the earlier link", async () => {
    const id = await mk("b");
    const first = await createResetToken(db, email("b"));
    const second = await createResetToken(db, email("b"));
    expect(await isResetTokenValid(db, first!.token)).toBe(false);
    expect(await isResetTokenValid(db, second!.token)).toBe(true);
    expect(await db.select().from(passwordResetTokens).where(eq(passwordResetTokens.userId, id))).toHaveLength(1);
    expect((await resetPassword(db, first!.token, "brand new pass 9")).ok).toBe(false);
  });

  it("resets the password: new works, old no longer does, sessions are revoked", async () => {
    const id = await mk("c");
    const before = await getSessionVersion(db, id);
    const t = await createResetToken(db, email("c"));
    expect(await resetPassword(db, t!.token, "brand new pass 9")).toEqual({ ok: true });
    expect(await verifyCredentials(db, email("c"), "brand new pass 9")).toMatchObject({ id });
    expect(await verifyCredentials(db, email("c"), "old password 1")).toBeNull();
    expect(await getSessionVersion(db, id)).toBe((before ?? 0) + 1);
  });

  it("a link works once only", async () => {
    await mk("d");
    const t = await createResetToken(db, email("d"));
    expect(await resetPassword(db, t!.token, "first new pass 1")).toEqual({ ok: true });
    expect(await resetPassword(db, t!.token, "second new pass 2")).toEqual({ ok: false, reason: "invalid" });
    expect(await verifyCredentials(db, email("d"), "first new pass 1")).not.toBeNull();
    expect(await verifyCredentials(db, email("d"), "second new pass 2")).toBeNull();
  });

  it("two simultaneous attempts: exactly one wins", async () => {
    await mk("e");
    const t = await createResetToken(db, email("e"));
    const results = await Promise.all([resetPassword(db, t!.token, "race winner pass 1"), resetPassword(db, t!.token, "race loser pass 22"), resetPassword(db, t!.token, "race third pass 333")]);
    expect(results.filter((r) => r.ok)).toHaveLength(1);
  });

  it("expired links are rejected and change nothing", async () => {
    const id = await mk("f");
    const past = new Date(Date.now() - 2 * 3_600_000);
    const t = await createResetToken(db, email("f"), past); // issued 2 hours ago
    expect(await isResetTokenValid(db, t!.token)).toBe(false);
    expect(await resetPassword(db, t!.token, "too late pass 1")).toEqual({ ok: false, reason: "invalid" });
    expect(await verifyCredentials(db, email("f"), "old password 1")).toMatchObject({ id });
  });

  it("garbage tokens are rejected", async () => {
    expect(await resetPassword(db, "x".repeat(43), "whatever pass 12")).toEqual({ ok: false, reason: "invalid" });
    expect(await isResetTokenValid(db, "")).toBe(false);
  });

  it("a successful reset deletes the account's other pending tokens", async () => {
    const id = await mk("g");
    const t = await createResetToken(db, email("g"));
    expect(await resetPassword(db, t!.token, "cleanup pass 123")).toEqual({ ok: true });
    const rows = await db.select().from(passwordResetTokens).where(eq(passwordResetTokens.userId, id));
    expect(rows).toHaveLength(1);
    expect(rows[0].usedAt).not.toBeNull();
  });

  it("a Google-only account can set a password through email proof", async () => {
    const id = await upsertGoogleUser(db, { sub: `rs-g-${tag}`, email: email("goog"), name: "G" });
    ids.push(id);
    expect(await verifyCredentials(db, email("goog"), "anything at all")).toBeNull();
    const t = await createResetToken(db, email("goog"));
    expect(await resetPassword(db, t!.token, "google user pass 1")).toEqual({ ok: true });
    expect(await verifyCredentials(db, email("goog"), "google user pass 1")).toMatchObject({ id });
  });

  it("deleting an account removes its tokens and its session version lookup returns null", async () => {
    const id = await mk("h");
    await createResetToken(db, email("h"));
    await deleteAccount(db, id);
    expect(await db.select().from(passwordResetTokens).where(eq(passwordResetTokens.userId, id))).toHaveLength(0);
    expect(await getSessionVersion(db, id)).toBeNull();
    expect(await db.select().from(users).where(eq(users.id, id))).toHaveLength(0);
  });
});
