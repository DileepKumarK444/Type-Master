import { join } from "node:path";
import { defineConfig } from "@playwright/test";

const PORT = 3200;
export const EMAIL_OUTBOX = join(__dirname, "test-results", "emails.jsonl");
const db = process.env.DATABASE_URL_E2E ?? process.env.DATABASE_URL_TEST ?? `postgres://${process.env.USER ?? "postgres"}@localhost:5432/typemaster_test`;

/**
 * Runs against the PRODUCTION build (`npm run build:test -w apps/web` first; it builds into .next-test so a running `npm run dev` is untouched) on a throwaway test database, in the
 * installed Google Chrome (no browser download). Every spec cleans up the accounts it creates.
 */
export default defineConfig({
  testDir: "./e2e",
  timeout: 150_000,
  expect: { timeout: 10_000 },
  fullyParallel: true,
  workers: 3,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"]],
  use: { baseURL: `http://localhost:${PORT}`, channel: "chrome", trace: "retain-on-failure" },
  webServer: {
    command: `npx next start -p ${PORT}`,
    url: `http://localhost:${PORT}/about`,
    reuseExistingServer: false,
    timeout: 60_000,
    env: {
      NEXT_DIST_DIR: ".next-test", REGISTER_RATE_LIMIT: "200", DATABASE_URL: db, AUTH_SECRET: "e2e-only-secret-do-not-use-elsewhere", AUTH_TRUST_HOST: "true",
      // emails are appended to a file the tests read; links point at the test server
      EMAIL_TRANSPORT: "file", EMAIL_OUTBOX_FILE: EMAIL_OUTBOX, SITE_URL: `http://localhost:${PORT}`,
    },
  },
});
