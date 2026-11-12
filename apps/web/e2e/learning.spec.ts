import { expect, test } from "@playwright/test";
import { deleteAccount, register, typingText } from "./helpers";

test("pass lesson 1: locked lessons, failure tip, retry, stars, XP and badge", async ({ page }) => {
  await register(page, "lesson");

  await page.goto("/app/learn");
  await expect(page.getByRole("link", { name: /1\. Index fingers/ })).toBeVisible();
  await expect(page.getByText("Locked — pass lesson 1 first").first()).toBeVisible();
  await page.goto("/app/lesson/3"); // locked: bounced back to the path
  await expect(page).toHaveURL(/\/app\/learn$/);

  await page.goto("/app/lesson/1");
  const box = page.locator('[role="textbox"][aria-label="Text to type"]');
  for (let step = 0; step < 3; step++) {
    await box.click();
    await page.keyboard.type((await typingText(page))!, { delay: 70 });
    await page.getByRole("button", { name: "Continue →" }).click();
  }

  // mini test: fail on purpose (type every F as D) → specific tip
  await box.click();
  const text = (await typingText(page))!;
  await page.keyboard.type(text.replace(/f/g, "d"), { delay: 90 });
  const outcome = page.getByTestId("lesson-outcome");
  await expect(outcome).toContainText("Not quite yet", { timeout: 15_000 });
  await expect(outcome).toContainText(/You typed D instead of F \d+ times/);

  // retry with the same text, correctly
  await page.getByRole("button", { name: "Try again (same text)" }).click();
  await box.click();
  expect(await typingText(page)).toBe(text);
  await page.keyboard.type(text, { delay: 90 });
  await expect(outcome).toContainText("Lesson passed!", { timeout: 15_000 });
  await expect(page.getByTestId("rewards")).toContainText("+");
  await expect(page.getByTestId("new-badge")).toContainText("First Steps");

  await page.goto("/app/learn");
  await expect(page.getByRole("link", { name: /2\. Middle fingers/ })).toBeVisible(); // unlocked
  await page.goto("/app/achievements");
  await expect(page.locator('[data-badge="first_steps"]')).toHaveAttribute("data-unlocked", "true");
  await deleteAccount(page);
});
