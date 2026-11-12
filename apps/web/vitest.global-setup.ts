import { runMigrations } from "@typemaster/db/src/migrate";

/**
 * Runs once, before any test file starts. Integration test files run in parallel; letting each one migrate a fresh
 * database races on CREATE TABLE (seen on CI). Skipped when DATABASE_URL_TEST is unset (DB tests are skipped too).
 */
export default async function setup() {
  const url = process.env.DATABASE_URL_TEST;
  if (url) await runMigrations(url);
}
