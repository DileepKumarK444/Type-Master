import { createHash, randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { and, eq, gt, isNull, ne, sql } from "drizzle-orm";
import { passwordResetTokens, users, type Db } from "@typemaster/db";

export const RESET_TTL_MINUTES = 60;

/** Only this hash is stored. The raw token exists in the email link and nowhere else. */
export const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");
export const newToken = () => randomBytes(32).toString("base64url");

/**
 * Creates a fresh reset token for the account with this email, replacing any earlier unused ones.
 * Returns null for an unknown email: callers must respond identically either way (no account enumeration).
 */
export async function createResetToken(db: Db, email: string, now = new Date()): Promise<{ token: string; email: string } | null> {
  const [u] = await db.select({ id: users.id, email: users.email }).from(users).where(eq(users.email, email.toLowerCase())).limit(1);
  if (!u) return null;
  const token = newToken();
  await db.transaction(async (tx) => {
    await tx.delete(passwordResetTokens).where(and(eq(passwordResetTokens.userId, u.id), isNull(passwordResetTokens.usedAt)));
    await tx.insert(passwordResetTokens).values({ userId: u.id, tokenHash: hashToken(token), expiresAt: new Date(now.getTime() + RESET_TTL_MINUTES * 60_000) });
  });
  return { token, email: u.email };
}

export type ResetResult = { ok: true } | { ok: false; reason: "invalid" };

/**
 * Sets a new password from a reset token. The token is consumed with one conditional UPDATE, so even two
 * simultaneous requests cannot both succeed. On success all other sessions are revoked (session_version + 1)
 * and every other pending reset token for the account is deleted.
 * Expired, used and unknown tokens are indistinguishable to the caller.
 */
export async function resetPassword(db: Db, token: string, newPassword: string, now = new Date()): Promise<ResetResult> {
  const passwordHash = await bcrypt.hash(newPassword, 12);
  return db.transaction(async (tx) => {
    const consumed = await tx
      .update(passwordResetTokens)
      .set({ usedAt: now })
      .where(and(eq(passwordResetTokens.tokenHash, hashToken(token)), isNull(passwordResetTokens.usedAt), gt(passwordResetTokens.expiresAt, now)))
      .returning({ userId: passwordResetTokens.userId, id: passwordResetTokens.id });
    if (consumed.length === 0) return { ok: false, reason: "invalid" } as const;
    const { userId, id } = consumed[0];
    await tx.update(users).set({ passwordHash, sessionVersion: sql`${users.sessionVersion} + 1` }).where(eq(users.id, userId));
    await tx.delete(passwordResetTokens).where(and(eq(passwordResetTokens.userId, userId), ne(passwordResetTokens.id, id)));
    return { ok: true } as const;
  });
}

/** Cheap check used by the reset page to say "this link is no longer valid" before asking for a password. */
export async function isResetTokenValid(db: Db, token: string, now = new Date()): Promise<boolean> {
  const rows = await db
    .select({ id: passwordResetTokens.id })
    .from(passwordResetTokens)
    .where(and(eq(passwordResetTokens.tokenHash, hashToken(token)), isNull(passwordResetTokens.usedAt), gt(passwordResetTokens.expiresAt, now)))
    .limit(1);
  return rows.length > 0;
}
