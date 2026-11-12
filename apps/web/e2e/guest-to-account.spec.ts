import { expect, test } from "@playwright/test";
import { deleteAccount, register, typingText } from "./helpers";

test("landing → guest test → sign up → the guest score is in the new account's history", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/TypeMaster/);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Type faster");

  // take the embedded 30s test at a human-ish pace
  await page.getByText("Click here or start typing").click(); // the landing test does not steal focus on load
  const text = (await typingText(page))!;
  await page.keyboard.type(text.slice(0, 260), { delay: 100 });
  await expect(page.getByTestId("results")).toBeVisible({ timeout: 40_000 });
  await expect(page.getByText("Save this score")).toBeVisible();

  const email = await register(page, "guest"); // the guest result is merged after sign-up
  await expect(async () => {
    await page.goto("/app/progress");
    await expect(page.getByRole("cell", { name: /Test · 30s/ })).toHaveCount(1, { timeout: 3_000 });
  }).toPass({ timeout: 30_000 });
  expect(email).toContain("@test.example");
  await deleteAccount(page);
});
