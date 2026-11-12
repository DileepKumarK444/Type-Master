import { createDb, type Db } from "@typemaster/db";

const g = globalThis as unknown as { __tmDb?: Db };

/** Lazy singleton (survives Next dev hot reloads). */
export function getDb(): Db {
  if (!g.__tmDb) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error("DATABASE_URL is not set");
    g.__tmDb = createDb(url).db;
  }
  return g.__tmDb;
}
