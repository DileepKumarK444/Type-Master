import { expect, test, type Page } from "@playwright/test";
import { deleteAccount, register, typingText } from "./helpers";

const box = (page: Page) => page.locator('[role="textbox"][aria-label="Text to type"]');

test("No timer: finish a 25-word text; it is saved, earns no XP and sets no personal best", async ({ page }) => {
  await register(page, "free");
  await page.goto("/app/practice");
  await page.getByRole("tab", { name: "No timer" }).click();
  await page.getByRole("tab", { name: "25 words" }).click();
  await expect(page.getByText("No timer:").first()).toBeVisible();
  await box(page).click();
  await page.keyboard.type((await typingText(page))!, { delay: 90 }); // ~13 s at a plausible pace
  const results = page.getByTestId("results");
  await expect(results).toBeVisible({ timeout: 20_000 });
  await expect(results).toContainText("Free practice · not compared with personal bests · no XP");
  await expect(page.getByTestId("rewards")).toHaveCount(0);
  await expect(page.getByTestId("pb-banner")).toHaveCount(0);
  await expect(results).toContainText("Saved to your history.");
  await page.goto("/app/progress");
  await expect(page.getByRole("cell", { name: "Free practice · 25 words" })).toBeVisible();
  await page.goto("/app/achievements");
  await expect(page.getByText(/40 \/ 100 XP|0 \/ 100 XP/).first()).toBeVisible(); // XP unchanged by free practice
  await deleteAccount(page);
});

test("No timer: 'Finish now' ends an endless run early and saves it", async ({ page }) => {
  await register(page, "finish");
  await page.goto("/app/practice?m=free&w=endless");
  await expect(page.getByRole("button", { name: "Finish now" })).toBeVisible();
  await box(page).click();
  await page.keyboard.type((await typingText(page))!.slice(0, 130), { delay: 100 }); // 13 s
  await page.getByRole("button", { name: "Finish now" }).click();
  await expect(page.getByTestId("results")).toContainText("Saved to your history.", { timeout: 15_000 });
  await page.goto("/app/progress");
  await expect(page.getByRole("cell", { name: "Free practice · endless" })).toBeVisible();
  await deleteAccount(page);
});

test("Practice by key: pick a letter and a symbol, start, and the text is built around it", async ({ page }) => {
  await register(page, "bykey");
  await page.goto("/app/practice/keys");
  await expect(page.getByRole("heading", { name: "Practice by key", level: 1 })).toBeVisible();
  await page.getByRole("button", { name: /^Key Q/ }).click();
  await expect(page.getByRole("heading", { name: "Key Q", level: 2 })).toBeVisible();
  await page.getByRole("button", { name: /Start practising Q/ }).click();
  await expect(page).toHaveURL(/t=key%3Aq/);
  await expect(page.getByText("Focus: Key Q")).toBeVisible();
  const text = (await typingText(page))!;
  expect(text.split(" ").filter((w) => w.includes("q")).length).toBeGreaterThan(15);

  await page.goto("/app/practice/keys");
  await page.getByRole("tab", { name: "Symbols" }).click();
  await page.getByRole("button", { name: /^Key ;/ }).click();
  await page.getByRole("button", { name: /Start practising/ }).click();
  await expect(page.getByText("Focus: Key ;")).toBeVisible();
  expect(await typingText(page)).toContain(";");

  await page.goto("/app/practice/keys");
  await page.getByRole("tab", { name: "Words & pairs" }).click();
  await page.getByRole("button", { name: /Top 50 words/ }).click();
  await page.getByRole("button", { name: /Start practising/ }).click();
  await expect(page.getByText("Focus: Top 50 words")).toBeVisible();
  await deleteAccount(page);
});

test("Code practice: real multi-line code with Enter and indentation types to 100% accuracy", async ({ page }) => {
  await register(page, "code");
  await page.goto("/app/practice?t=code%3Ajs&m=free&w=25");
  const text = (await typingText(page))!;
  expect(text).toContain("\n");
  expect(text).toMatch(/\n {2}/); // indentation with spaces
  await box(page).click();
  await page.keyboard.type(text, { delay: 70 }); // Playwright presses Enter for each "\n"
  const results = page.getByTestId("results");
  await expect(results).toBeVisible({ timeout: 30_000 });
  await expect(results).toContainText("Accuracy");
  await expect(results.getByText("100%").first()).toBeVisible();
  await deleteAccount(page);
});

test("Coding lessons open after lesson 12 (not 20) and play like any lesson", async ({ page }) => {
  await register(page, "coding");
  await page.goto("/app/learn");
  await expect(page.getByLabel("Coding").getByText("Locked — pass lesson 12 first")).toBeVisible();
  // pass lessons 1-12 through the real API with consistent, plausible numbers
  for (let id = 1; id <= 12; id++) {
    const res = await page.request.post(`/api/lessons/${id}/complete`, {
      data: { clientId: crypto.randomUUID(), durationS: 24, wpm: 50, rawWpm: 50, accuracy: 99, consistency: 90, errors: 1, keyStats: { f: { hits: 99, misses: 1 } } },
    });
    expect(res.status(), `lesson ${id}`).toBe(201);
  }
  await page.goto("/app/learn");
  await expect(page.getByRole("link", { name: /21\. Brackets & quotes/ })).toBeVisible();
  await expect(page.getByLabel("Coding").getByText("Locked — pass lesson 21 first")).toBeVisible(); // 22 waits for 21
  await page.goto("/app/lesson/21");
  for (let step = 0; step < 3; step++) {
    await box(page).click();
    await page.keyboard.type((await typingText(page))!, { delay: 70 });
    await page.getByRole("button", { name: "Continue →" }).click();
  }
  await box(page).click();
  await page.keyboard.type((await typingText(page))!, { delay: 80 });
  await expect(page.getByTestId("lesson-outcome")).toContainText("Lesson passed!", { timeout: 20_000 });
  await page.goto("/app/learn");
  await expect(page.getByRole("link", { name: /22\. Operators/ })).toBeVisible();
  await deleteAccount(page);
});

test("Logout button in the sidebar signs you out and protects the app again", async ({ page }) => {
  await register(page, "logout");
  await page.getByRole("button", { name: "Log out" }).click();
  await page.waitForURL("**/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Type faster");
  await page.goto("/app");
  await expect(page).toHaveURL(/\/login/);
});
