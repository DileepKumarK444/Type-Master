import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { deleteAccount, register } from "./helpers";

/** WCAG 2.0/2.1 A + AA. Fails on critical OR serious findings; lesser ones are printed for triage. */
async function scan(page: Page, label: string) {
  const { violations } = await new AxeBuilder({ page } as unknown as ConstructorParameters<typeof AxeBuilder>[0]).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
  const bad = violations.filter((v) => v.impact === "critical" || v.impact === "serious");
  const minor = violations.filter((v) => !bad.includes(v));
  if (minor.length) console.log(`[a11y] ${label}: ${minor.length} moderate/minor →`, minor.map((v) => `${v.id}(${v.nodes.length})`).join(", "));
  expect(bad.map((v) => `${v.id}: ${v.help} — ${v.nodes.slice(0, 3).map((n) => n.target.join(" ")).join(" | ")}`), `${label}`).toEqual([]);
}

async function setTheme(page: Page, theme: "light" | "dark") {
  await page.evaluate((t) => { document.documentElement.dataset.theme = t; }, theme);
  // Colours animate on theme switch; axe would sample half-faded values. Freeze transitions before scanning.
  await page.addStyleTag({ content: "*,*::before,*::after{transition:none!important;animation:none!important}" });
}

for (const theme of ["light", "dark"] as const) {
  test(`public pages have no serious accessibility issues (${theme})`, async ({ page }) => {
    for (const path of ["/", "/login", "/register", "/forgot-password", "/reset-password?token=not-a-real-token", "/about", "/privacy", "/terms"]) {
      await page.goto(path);
      await setTheme(page, theme);
      await scan(page, `${path} [${theme}]`);
    }
  });
}

test.describe("signed-in pages", () => {
  test.describe.configure({ mode: "serial" });
  let page: Page;
  test.beforeAll(async ({ browser }) => {
    const context = await browser.newContext({ baseURL: "http://localhost:3200" }); // axe requires an explicit context
    page = await context.newPage();
    await register(page, "a11y");
  });
  test.afterAll(async () => { await deleteAccount(page); await page.context().close(); });

  for (const theme of ["light", "dark"] as const) {
    test(`no serious accessibility issues (${theme})`, async () => {
      for (const path of ["/app", "/app/learn", "/app/practice", "/app/progress", "/app/achievements", "/app/games", "/app/profile", "/app/lesson/1", "/app/games/word-rush"]) {
        await page.goto(path);
        await setTheme(page, theme);
        await scan(page, `${path} [${theme}]`);
      }
    });
  }
});
