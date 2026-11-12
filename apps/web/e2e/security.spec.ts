import { expect, test } from "@playwright/test";

test("protected pages redirect to login; APIs reject anonymous callers", async ({ page, request }) => {
  for (const path of ["/app", "/app/progress", "/app/learn", "/app/profile", "/app/achievements", "/app/games"]) {
    await page.goto(path);
    await expect(page, path).toHaveURL(/\/login/);
  }
  expect((await request.post("/api/sessions", { data: {} })).status()).toBe(401);
  expect((await request.post("/api/games/word-rush", { data: {} })).status()).toBe(401);
  expect((await request.get("/api/me")).status()).toBe(401);
  expect((await request.get("/api/me/export")).status()).toBe(401);
});

test("guests may take a test but not see account pages; cross-site requests are refused", async ({ page, request }) => {
  await page.goto("/app/practice");
  await expect(page.getByRole("heading", { name: "Practice" })).toBeVisible();
  const res = await request.post("/api/auth/register", { headers: { origin: "https://evil.example" }, data: { name: "x", email: "x@y.zz", password: "correct horse 9" } });
  expect(res.status()).toBe(403);
});

test("internal and unknown routes are not exposed in production", async ({ page }) => {
  expect((await page.goto("/design"))?.status()).toBe(404);
  expect((await page.goto("/definitely-not-a-page"))?.status()).toBe(404);
});

test("SEO basics: robots, sitemap, metadata, noindex on app pages", async ({ page, request }) => {
  const robots = await (await request.get("/robots.txt")).text();
  expect(robots).toMatch(/Disallow: \/app\//);
  expect(robots).toMatch(/Sitemap: .*\/sitemap\.xml/);
  const sitemap = await (await request.get("/sitemap.xml")).text();
  for (const p of ["/about", "/privacy", "/terms"]) expect(sitemap).toContain(p);
  expect(sitemap).not.toContain("/app");
  await page.goto("/");
  await expect(page.locator('meta[name="description"]')).toHaveAttribute("content", /typing/i);
  await expect(page.locator('link[rel="canonical"]')).toHaveCount(1);
  await expect(page.locator('meta[property="og:title"]')).toHaveCount(1);
  expect(await page.locator('script[type="application/ld+json"]').textContent()).toContain("WebApplication");
  await page.goto("/login");
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
  expect((await request.get("/opengraph-image")).status()).toBe(200);
});
