import { migrate } from "drizzle-orm/postgres-js/migrator";
import { fileURLToPath } from "node:url";
import { createDb } from "./index";

/** Applies SQL migrations from packages/db/drizzle. Safe to call repeatedly. */
export async function runMigrations(url: string) {
  const { db, client } = createDb(url, { max: 1 });
  try {
    await migrate(db, { migrationsFolder: fileURLToPath(new URL("../drizzle", import.meta.url)) });
  } finally {
    await client.end();
  }
}
