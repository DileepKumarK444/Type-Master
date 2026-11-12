import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { createDb, keyStats, typingSessions, userSettings, users } from "@typemaster/db";
import { deleteAccount, exportData, getProfile, updateProfile } from "./account";
import { UserGoneError, getKeyStats, listSessions, saveSession } from "./sessions";
import { EmailTakenError, getUserIdByEmail, registerUser, upsertGoogleUser, verifyCredentials } from "./users";
import type { SessionInput } from "./validation";

const URL = process.env.DATABASE_URL_TEST;

/** Real-Postgres tests. Skipped when DATABASE_URL_TEST is unset. */
describe.skipIf(!URL)("database services", () => {
  const { db, client } = createDb(URL ?? "postgres://unused", { max: 3 });
  const tag = Date.now().toString(36);
  const email = (n: string) => `${n}.${tag}@test.example`;
  let a = "", b = "";

  const input = (clientId: string, over: Partial<SessionInput> = {}): SessionInput => ({
    clientId, kind: "test", durationS: 30, wpm: 40, rawWpm: 42, accuracy: 95, consistency: 80, errors: 2,
    keyStats: { a: { hits: 8, misses: 1 }, b: { hits: 9, misses: 1 } }, mode: { seconds: 30, punctuation: false, numbers: false }, ...over,
  });
  const uuid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;

  beforeAll(async () => {
    a = (await registerUser(db, { name: "Alice", email: email("alice"), password: "correct horse" })).id;
    b = (await registerUser(db, { name: "Bob", email: email("bob"), password: "battery staple" })).id;
  });
  afterAll(async () => {
    await deleteAccount(db, a).catch(() => {});
    await deleteAccount(db, b).catch(() => {});
    await client.end();
  });

  it("registers with hashed password and default settings; rejects duplicate email (any case)", async () => {
    const [row] = await db.select().from(users).where(eq(users.id, a));
    expect(row.passwordHash).toMatch(/^\$2[aby]\$12\$/);
    expect(row.passwordHash).not.toContain("correct");
    const [s] = await db.select().from(userSettings).where(eq(userSettings.userId, a));
    expect(s).toMatchObject({ goalWpm: 40, dailyMinutes: 10, layout: "qwerty" });
    await expect(registerUser(db, { name: "X", email: email("ALICE"), password: "whatever12" })).rejects.toBeInstanceOf(EmailTakenError);
  });

  it("verifies credentials only for the right password", async () => {
    expect(await verifyCredentials(db, email("alice"), "correct horse")).toMatchObject({ id: a, name: "Alice" });
    expect(await verifyCredentials(db, email("alice"), "wrong")).toBeNull();
    expect(await verifyCredentials(db, email("nobody"), "correct horse")).toBeNull();
  });

  it("google sign-in links by verified email, then by sub, or creates", async () => {
    const id1 = await upsertGoogleUser(db, { sub: `g-${tag}`, email: email("alice").toUpperCase(), name: "Alice G" });
    expect(id1).toBe(a);
    expect(await upsertGoogleUser(db, { sub: `g-${tag}`, email: "changed@x.example", name: "" })).toBe(a);
    const fresh = await upsertGoogleUser(db, { sub: `g2-${tag}`, email: email("carol"), name: "" });
    expect(await getUserIdByEmail(db, email("carol"))).toBe(fresh);
    const [carol] = await db.select().from(users).where(eq(users.id, fresh));
    expect(carol.passwordHash).toBeNull();
    expect(await verifyCredentials(db, email("carol"), "anything")).toBeNull(); // google-only: no password login
    await deleteAccount(db, fresh);
  });

  it("saves a session and accumulates key stats", async () => {
    const r1 = await saveSession(db, a, input(uuid(1)));
    expect(r1.duplicate).toBe(false);
    await saveSession(db, a, input(uuid(2), { keyStats: { a: { hits: 2, misses: 0 } }, errors: 0 }));
    const ks = Object.fromEntries((await getKeyStats(db, a)).map((k) => [k.key, k]));
    expect(ks.a).toMatchObject({ hits: 10, misses: 1 });
    expect(ks.b).toMatchObject({ hits: 9, misses: 1 });
    expect(await listSessions(db, a)).toHaveLength(2);
  });

  it("is idempotent on clientId (retries / guest import do not double count)", async () => {
    const first = await saveSession(db, a, input(uuid(3)));
    const again = await saveSession(db, a, input(uuid(3)));
    expect(again).toEqual({ id: first.id, duplicate: true });
    expect(await listSessions(db, a)).toHaveLength(3);
    const ks = Object.fromEntries((await getKeyStats(db, a)).map((k) => [k.key, k]));
    expect(ks.a.hits).toBe(18); // 8 + 2 + 8, counted once for uuid(3)
  });

  it("ISOLATION: one user cannot see or collide with another user's data", async () => {
    expect(await listSessions(db, b)).toHaveLength(0);
    expect(await getKeyStats(db, b)).toHaveLength(0);
    // same clientId for a different user is a different session, not a duplicate
    const r = await saveSession(db, b, input(uuid(3)));
    expect(r.duplicate).toBe(false);
    expect(await listSessions(db, a)).toHaveLength(3);
    expect((await exportData(db, b)).sessions.every((s) => s.userId === b)).toBe(true);
  });

  it("updates profile fields and merges prefs", async () => {
    await updateProfile(db, a, { prefs: { sound: true } });
    const p = await updateProfile(db, a, { displayName: "Alice A", goalWpm: 70, prefs: { showKeyboard: false } });
    expect(p).toMatchObject({ displayName: "Alice A", goalWpm: 70, dailyMinutes: 10, prefs: { sound: true, showKeyboard: false } });
    expect((await getProfile(db, b))?.displayName).toBe("Bob");
  });

  it("exports everything except the password hash", async () => {
    const data = await exportData(db, a);
    expect(data.sessions).toHaveLength(3);
    expect(JSON.stringify(data)).not.toMatch(/passwordHash|\$2[aby]\$/);
    expect(data.profile?.email).toBe(email("alice"));
  });

  it("saving for a deleted/nonexistent user fails with UserGoneError, not a raw DB error", async () => {
    await expect(saveSession(db, "00000000-0000-4000-8000-0000000000ff", input(uuid(9)))).rejects.toBeInstanceOf(UserGoneError);
  });

  it("deleting an account cascades and leaves other users intact", async () => {
    await deleteAccount(db, b);
    expect(await db.select().from(typingSessions).where(eq(typingSessions.userId, b))).toHaveLength(0);
    expect(await db.select().from(keyStats).where(eq(keyStats.userId, b))).toHaveLength(0);
    expect(await db.select().from(userSettings).where(eq(userSettings.userId, b))).toHaveLength(0);
    expect(await getProfile(db, b)).toBeNull();
    expect(await listSessions(db, a)).toHaveLength(3);
  });
});
