import { expect, test } from "@playwright/test";
import { PASSWORD, deleteAccount, latestResetLink, register, uniqueEmail } from "./helpers";

const NEW_PASSWORD = "orange walrus 77";

test("forgot password → emailed link → new password; old sessions are signed out; the link works once", async ({ page, browser }) => {
  const email = await register(page, "reset"); // session A, signed in with the old password

  const ctx = await browser.newContext({ baseURL: "http://localhost:3200" });
  const p = await ctx.newPage();

  // Unknown email gets exactly the same confirmation (no account enumeration)
  await p.goto("/login");
  await p.getByRole("link", { name: "Forgot password?" }).click();
  await p.getByLabel("Email").fill(uniqueEmail("nobody"));
  await p.getByRole("button", { name: "Send reset link" }).click();
  await expect(p.getByRole("heading", { name: "Check your email" })).toBeVisible();

  // Real account
  await p.goto("/forgot-password");
  await p.getByLabel("Email").fill(email);
  await p.getByRole("button", { name: "Send reset link" }).click();
  await expect(p.getByRole("heading", { name: "Check your email" })).toBeVisible();
  const link = await latestResetLink(email);
  expect(link).toMatch(/^http:\/\/localhost:3200\/reset-password\?token=/);

  // Reset form: mismatch and weak passwords are explained, then success
  await p.goto(link);
  await p.getByLabel(/^New password/).fill(NEW_PASSWORD);
  await p.getByLabel("Confirm new password").fill("something else 1");
  await p.getByRole("button", { name: "Update password" }).click();
  await expect(p.locator("main [role=alert]")).toContainText("don’t match");
  await p.getByLabel(/^New password/).fill("password123");
  await p.getByLabel("Confirm new password").fill("password123");
  await p.getByRole("button", { name: "Update password" }).click();
  await expect(p.locator("main [role=alert]")).toContainText(/too common/i);
  await p.getByLabel(/^New password/).fill(NEW_PASSWORD);
  await p.getByLabel("Confirm new password").fill(NEW_PASSWORD);
  await p.getByRole("button", { name: "Update password" }).click();
  await expect(p).toHaveURL(/\/login\?reset=1/);
  await expect(p.getByRole("status")).toContainText("password was updated");

  // The old password no longer works; the new one does
  await p.getByLabel("Email").fill(email);
  await p.getByLabel(/^Password/).fill(PASSWORD);
  await p.getByRole("button", { name: "Log in" }).click();
  await expect(p.locator("main [role=alert]")).toContainText("Incorrect email or password");
  await p.getByLabel(/^Password/).fill(NEW_PASSWORD);
  await p.getByRole("button", { name: "Log in" }).click();
  await p.waitForURL("**/app");

  // The session that existed before the reset was revoked
  await page.goto("/app/profile");
  await expect(page).toHaveURL(/\/login/);

  // The link cannot be used a second time
  await p.goto(link);
  await expect(p.getByRole("heading", { name: "This link isn’t valid any more" })).toBeVisible();

  await deleteAccount(p);
  await ctx.close();
});

test("invalid, malformed and missing reset links show the same helpful page; no token leaks into search or referrers", async ({ page }) => {
  for (const url of ["/reset-password", "/reset-password?token=abc", `/reset-password?token=${"A".repeat(43)}`]) {
    await page.goto(url);
    await expect(page.getByRole("heading", { name: "This link isn’t valid any more" }), url).toBeVisible();
    await page.getByRole("link", { name: "Request a new link" }).waitFor();
  }
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
  await expect(page.locator('meta[name="referrer"]')).toHaveAttribute("content", "no-referrer");
});

test("the reset endpoints refuse cross-site requests and bad input", async ({ request }) => {
  expect((await request.post("/api/auth/forgot", { headers: { origin: "https://evil.example" }, data: { email: "a@b.zz" } })).status()).toBe(403);
  expect((await request.post("/api/auth/reset", { headers: { origin: "https://evil.example" }, data: {} })).status()).toBe(403);
  expect((await request.post("/api/auth/forgot", { data: { email: "not-an-email" } })).status()).toBe(400);
  const bad = await request.post("/api/auth/reset", { data: { token: "A".repeat(43), password: "correct horse 9" } });
  expect(bad.status()).toBe(400);
  expect((await bad.json()).error).toBe("invalid_link");
  expect((await request.post("/api/auth/reset", { data: { token: "short", password: "x" } })).status()).toBe(400);
});
