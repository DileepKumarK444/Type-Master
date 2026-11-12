import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { users, userSettings, type Db } from "@typemaster/db";

export class EmailTakenError extends Error {}

const COST = 12;
let dummyHash: Promise<string> | undefined;
// Compared against when the email is unknown so response time does not reveal which emails exist.
const getDummy = () => (dummyHash ??= bcrypt.hash("not-a-real-password", COST));

function pgCode(e: unknown): string | undefined {
  const x = e as { code?: string; cause?: { code?: string } };
  return x?.code ?? x?.cause?.code;
}

export async function registerUser(db: Db, input: { name: string; email: string; password: string }) {
  const passwordHash = await bcrypt.hash(input.password, COST);
  try {
    return await db.transaction(async (tx) => {
      const [u] = await tx.insert(users).values({ email: input.email.toLowerCase(), displayName: input.name, passwordHash }).returning({ id: users.id });
      await tx.insert(userSettings).values({ userId: u.id });
      return u;
    });
  } catch (e) {
    if (pgCode(e) === "23505") throw new EmailTakenError();
    throw e;
  }
}

export async function verifyCredentials(db: Db, email: string, password: string) {
  const [u] = await db.select().from(users).where(eq(users.email, email.toLowerCase())).limit(1);
  const ok = await bcrypt.compare(password, u?.passwordHash ?? (await getDummy()));
  return u && u.passwordHash && ok ? { id: u.id, email: u.email, name: u.displayName, sv: u.sessionVersion } : null;
}

/** Find-or-create for a verified Google identity. Links to an existing account with the same verified email. */
export async function upsertGoogleUser(db: Db, p: { sub: string; email: string; name: string }) {
  const email = p.email.toLowerCase();
  const [bySub] = await db.select({ id: users.id }).from(users).where(eq(users.googleSub, p.sub)).limit(1);
  if (bySub) return bySub.id;
  const [byEmail] = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
  if (byEmail) {
    await db.update(users).set({ googleSub: p.sub }).where(eq(users.id, byEmail.id));
    return byEmail.id;
  }
  return db.transaction(async (tx) => {
    const [u] = await tx.insert(users).values({ email, displayName: p.name || email.split("@")[0], googleSub: p.sub }).returning({ id: users.id });
    await tx.insert(userSettings).values({ userId: u.id });
    return u.id;
  });
}

export async function getUserIdByEmail(db: Db, email: string) {
  const [u] = await db.select({ id: users.id }).from(users).where(eq(users.email, email.toLowerCase())).limit(1);
  return u?.id;
}

/** Current session version of an account, or null if the account no longer exists. */
export async function getSessionVersion(db: Db, id: string): Promise<number | null> {
  const [u] = await db.select({ v: users.sessionVersion }).from(users).where(eq(users.id, id)).limit(1);
  return u ? u.v : null;
}
