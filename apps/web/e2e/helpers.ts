import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { expect, type Page } from "@playwright/test";

export const PASSWORD = "purple giraffe 42";
export const uniqueEmail = (tag: string) => `e2e.${tag}.${Date.now().toString(36)}${Math.floor(Math.random() * 1e4)}@test.example`;

export async function register(page: Page, tag: string, name = "E2E Tester") {
  const email = uniqueEmail(tag);
  await page.goto("/register");
  await page.getByLabel("Name").fill(name);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel(/^Password/).fill(PASSWORD);
  await page.getByRole("button", { name: "Create account" }).click();
  await page.waitForURL("**/app", { timeout: 30_000 });
  return email;
}

/** Deletes the signed-in account (also exercises the real delete endpoint). */
export async function deleteAccount(page: Page) {
  const res = await page.request.delete("/api/me", { data: { confirm: "DELETE" } });
  expect(res.ok()).toBeTruthy();
}

/** The text currently shown in the typing surface. */
/** The text currently shown in the typing surface (code lines show Enter as ↵; convert back to a real newline). */
export const typingText = async (page: Page) => ((await page.locator('[role="textbox"][aria-label="Text to type"]').textContent()) ?? "").replace(/↵/g, "\n");

const OUTBOX = join(__dirname, "..", "test-results", "emails.jsonl");

/** The reset link from the most recent email to this address (polls the file outbox written by the server). */
export async function latestResetLink(email: string): Promise<string> {
  let link = "";
  await expect(async () => {
    const lines = (await readFile(OUTBOX, "utf8").catch(() => "")).trim().split("\n").filter(Boolean).map((l) => JSON.parse(l));
    const mine = lines.filter((m) => m.to === email);
    expect(mine.length, `no email for ${email} yet`).toBeGreaterThan(0);
    link = /https?:\/\/\S+reset-password\?token=[\w-]+/.exec(mine[mine.length - 1].text)![0];
  }).toPass({ timeout: 15_000 });
  return link;
}
