// Renders each mockup in index.html to a PNG next to it. Usage (from apps/web): node ../../docs/mockups/shoot.mjs
import { chromium } from "@playwright/test";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
const dir = dirname(fileURLToPath(import.meta.url));
const names = { s1: "1-logout-menu", s2: "2-mobile-more-menu", s3: "3-practice-no-timer", s4: "4-no-timer-results", s5: "5-practice-by-key", s6: "6-key-drill-running", s7: "7-mobile-practice-by-key" };
const browser = await chromium.launch({ channel: "chrome" });
const page = await browser.newPage({ viewport: { width: 1400, height: 900 }, deviceScaleFactor: 1.5 });
await page.goto(pathToFileURL(join(dir, "index.html")).href);
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(800);
for (const [id, name] of Object.entries(names)) await page.locator(`#${id}`).screenshot({ path: join(dir, `${name}.png`) });
await browser.close();
console.log("wrote", Object.values(names).length, "screenshots");
