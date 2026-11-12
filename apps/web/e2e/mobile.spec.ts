import { expect, test } from "@playwright/test";
import { deleteAccount, register } from "./helpers";

test.use({ viewport: { width: 390, height: 800 }, hasTouch: true, isMobile: true });

const noHorizontalScroll = async (page: import("@playwright/test").Page, label: string) => {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow, `${label} overflows horizontally by ${overflow}px`).toBeLessThanOrEqual(1);
};

test("public pages fit a phone", async ({ page }) => {
  for (const path of ["/", "/login", "/register", "/privacy"]) {
    await page.goto(path);
    await noHorizontalScroll(page, path);
  }
});

test("signed-in app uses the bottom tab bar and fits a phone", async ({ page }) => {
  await register(page, "mobile");
  await expect(page.getByRole("navigation", { name: "Tabs" })).toBeVisible();
  for (const path of ["/app", "/app/learn", "/app/progress", "/app/achievements", "/app/games", "/app/profile"]) {
    await page.goto(path);
    await noHorizontalScroll(page, path);
  }
  await deleteAccount(page);
});

test("the More tab is a real menu with every page and a Log out button", async ({ page }) => {
  await register(page, "more");
  await page.getByRole("navigation", { name: "Tabs" }).getByRole("link", { name: "More" }).click();
  await expect(page.getByRole("heading", { name: "More", level: 1 })).toBeVisible();
  for (const name of ["Progress", "Achievements", "Profile & settings"]) await expect(page.getByRole("link", { name })).toBeVisible();
  await noHorizontalScroll(page, "/app/more");
  await page.getByRole("button", { name: "Log out" }).click();
  await page.waitForURL("**/");
});
