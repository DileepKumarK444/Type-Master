// Usage: npm run build:test -w apps/web && npm run lighthouse -w apps/web
// Serves the production build on a throwaway DB, audits pages with Lighthouse's default mobile profile
// (simulated slow 4G + 4x CPU slowdown) using the installed Google Chrome, and exits non-zero if the
// launch targets are missed (docs/08 M6: performance >= 90, accessibility/best-practices/SEO >= 90).
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import lighthouse from "lighthouse";
import puppeteer from "puppeteer-core";
import * as chromeLauncher from "chrome-launcher";

const PORT = 3201, BASE = `http://localhost:${PORT}`;
// CHROME_PATH wins; otherwise ask chrome-launcher to find an installed Chrome/Chromium on macOS, Linux (incl. CI runners) or Windows.
const CHROME = process.env.CHROME_PATH ?? chromeLauncher.Launcher.getFirstInstallation();
const DB = process.env.DATABASE_URL_E2E ?? process.env.DATABASE_URL_TEST ?? `postgres://${process.env.USER ?? "postgres"}@localhost:5432/typemaster_test`;
const TARGET = 90;
const PUBLIC = ["/", "/about", "/privacy", "/terms", "/login"];
// Pages that are deliberately noindex (login, the whole signed-in app) are not held to an SEO score.
const NOINDEX = (p) => p === "/login" || p.startsWith("/app");
const AUTHED = ["/app", "/app/practice", "/app/practice/keys", "/app/practice?t=code%3Ajs&m=free&w=50", "/app/more", "/app/learn", "/app/progress", "/app/achievements", "/app/games", "/app/profile"];

if (!CHROME || !existsSync(CHROME)) { console.error("Chrome not found; install Google Chrome or set CHROME_PATH"); process.exit(2); }

const server = spawn("npx", ["next", "start", "-p", String(PORT)], { env: { ...process.env, NEXT_DIST_DIR: ".next-test", DATABASE_URL: DB, AUTH_SECRET: "lighthouse-only-secret", AUTH_TRUST_HOST: "true" }, stdio: "ignore" });
const kill = () => { try { server.kill(); } catch {} };
process.on("exit", kill);

async function waitUp() {
  for (let i = 0; i < 60; i++) { try { if ((await fetch(`${BASE}/about`)).ok) return; } catch {} await new Promise((r) => setTimeout(r, 1000)); }
  throw new Error("server did not start");
}

async function signIn() {
  const email = `lh.${Date.now().toString(36)}@test.example`, password = "purple giraffe 42";
  const reg = await fetch(`${BASE}/api/auth/register`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name: "Lighthouse", email, password }) });
  if (!reg.ok) throw new Error("register failed " + reg.status);
  const jar = new Map();
  const grab = (res) => { for (const c of res.headers.getSetCookie()) { const [kv] = c.split(";"); const i = kv.indexOf("="); jar.set(kv.slice(0, i), kv.slice(i + 1)); } };
  const header = () => [...jar].map(([k, v]) => `${k}=${v}`).join("; ");
  const csrfRes = await fetch(`${BASE}/api/auth/csrf`); grab(csrfRes);
  const { csrfToken } = await csrfRes.json();
  const login = await fetch(`${BASE}/api/auth/callback/credentials`, { method: "POST", redirect: "manual", headers: { "content-type": "application/x-www-form-urlencoded", cookie: header() }, body: new URLSearchParams({ csrfToken, email, password, json: "true" }) });
  grab(login);
  if (![...jar.keys()].some((k) => k.includes("session-token"))) throw new Error("login failed");
  const [name, value] = [...jar].find(([k]) => k.includes("session-token"));
  return { cookie: header(), name, value };
}

const rows = [];
let chrome, session;
try {
  await waitUp();
  session = await signIn();
  chrome = await chromeLauncher.launch({ chromePath: CHROME, chromeFlags: ["--headless=new", "--no-sandbox", "--disable-gpu"] });
  let signedIn = false;
  for (const path of [...PUBLIC, ...AUTHED]) {
    const authed = AUTHED.includes(path);
    if (authed && !signedIn) {
      // Public pages are audited first, signed out. Then the session cookie goes into Chrome's own cookie jar so the
      // signed-in pages are really audited (extra request headers get lost on redirects).
      const browser = await puppeteer.connect({ browserURL: `http://localhost:${chrome.port}` });
      await browser.setCookie({ name: session.name, value: session.value, url: BASE });
      browser.disconnect();
      signedIn = true;
    }
    const r = await lighthouse(BASE + path, { port: chrome.port, output: "json", logLevel: "error", onlyCategories: ["performance", "accessibility", "best-practices", "seo"] });
    const failedA11y = r.lhr.categories.accessibility.auditRefs.filter((x) => r.lhr.audits[x.id].score === 0).map((x) => x.id);
    if (failedA11y.length) console.log(`  ${path}: failing accessibility audits → ${failedA11y.join(", ")}`);
    const c = r.lhr.categories, a = r.lhr.audits;
    rows.push({
      page: path, perf: Math.round(c.performance.score * 100), a11y: Math.round(c.accessibility.score * 100), bp: Math.round(c["best-practices"].score * 100),
      seo: Math.round(c.seo.score * 100), lcp: Math.round(a["largest-contentful-paint"].numericValue), cls: +a["cumulative-layout-shift"].numericValue.toFixed(3), tbt: Math.round(a["total-blocking-time"].numericValue),
      redirected: new URL(r.lhr.finalDisplayedUrl).pathname !== new URL(path, BASE).pathname, // compare paths only (a page may carry a ?query)
    });
    const worst = Object.values(a).filter((x) => x.score !== null && x.score < 0.9 && x.scoreDisplayMode === "numeric").map((x) => `${x.id}=${x.score}`);
    if (worst.length) console.log(`  ${path}: audits below 0.9 → ${worst.slice(0, 6).join(", ")}`);
  }
} finally {
  if (session) await fetch(`${BASE}/api/me`, { method: "DELETE", headers: { "content-type": "application/json", cookie: session.cookie }, body: JSON.stringify({ confirm: "DELETE" }) }).catch(() => {});
  await chrome?.kill();
  kill();
}

console.table(rows);
const fails = rows.filter((r) => r.redirected || r.perf < TARGET || r.a11y < TARGET || r.bp < TARGET || (r.seo < TARGET && !NOINDEX(r.page)));
if (fails.length) { console.error(`\nBelow target (${TARGET}) or redirected:`, fails.map((f) => f.page).join(", ")); process.exit(1); }
console.log(`\nAll ${rows.length} pages meet the ${TARGET}+ targets.`);
