import { expect, test } from "@playwright/test";
import { deleteAccount, register } from "./helpers";

test("Word Rush: play a round, combo resets on a wrong word, result is saved with XP", async ({ page }) => {
  await register(page, "game");
  await page.goto("/app/games/word-rush");
  await page.getByRole("button", { name: /Start/ }).click();
  await expect(page.getByTestId("word")).toBeVisible({ timeout: 10_000 });

  // Drive real input events at a plausible pace; make one deliberate mistake.
  const result = await page.evaluate(async () => {
    const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
    const input = document.querySelector<HTMLInputElement>('input[aria-label="Type the word"]')!;
    const send = (data: string) => input.dispatchEvent(new InputEvent("beforeinput", { inputType: "insertText", data, cancelable: true, bubbles: true }));
    let words = 0, resetSeen = false, maxCombo = 0;
    while (!document.querySelector('[data-testid="game-over"]')) {
      const w = document.querySelector('[data-testid="word"]')?.getAttribute("aria-label")?.replace("Type: ", "");
      if (!w) { await sleep(100); continue; }
      input.focus();
      const combo = Number(/Combo (\d+)/.exec(document.querySelector('[data-testid="combo"]')?.textContent ?? "")?.[1] ?? 0);
      maxCombo = Math.max(maxCombo, combo);
      if (words === 8 && !resetSeen) {
        send("z"); send("z"); await sleep(60); send(" "); await sleep(200);
        const after = Number(/Combo (\d+)/.exec(document.querySelector('[data-testid="combo"]')?.textContent ?? "")?.[1] ?? -1);
        resetSeen = after === 0;
        continue;
      }
      for (const c of w) { send(c); await sleep(70); }
      send(" "); words++; await sleep(150);
    }
    return { words, resetSeen, maxCombo };
  });
  expect(result.resetSeen).toBe(true);
  expect(result.maxCombo).toBeGreaterThan(4);

  const over = page.getByTestId("game-over");
  await expect(over).toContainText("Game over");
  await expect(over.getByTestId("rewards")).toContainText("+", { timeout: 15_000 }); // saved: XP shown
  await page.goto("/app/games");
  await expect(page.getByRole("cell", { name: "Word Rush" })).toBeVisible();
  await deleteAccount(page);
});
