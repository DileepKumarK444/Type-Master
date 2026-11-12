import { createDb, type Db } from "@typemaster/db";

type Cached = { url: string; db: Db; end: () => Promise<void> };
const g = globalThis as unknown as { __tmDb?: Cached };

/**
 * Lazy singleton (survives Next dev hot reloads). It is keyed by the connection string, so if DATABASE_URL changes
 * while `next dev` is running (for example after editing .env.local) the next request opens a fresh connection
 * instead of reusing one that points at the old database.
 */
export function getDb(): Db {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  if (g.__tmDb && g.__tmDb.url !== url) {
    void g.__tmDb.end().catch(() => {});
    g.__tmDb = undefined;
  }
  if (!g.__tmDb) {
    const { db, client } = createDb(url);
    g.__tmDb = { url, db, end: () => client.end() };
  }
  return g.__tmDb.db;
}
