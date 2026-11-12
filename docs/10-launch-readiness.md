# 10 · Launch Readiness (M6)

> Honest status of what is done, what is verified, and what **only you can do** before real users arrive.

## Acceptance criteria (from docs/08, M6)
| Criterion | Status | Evidence |
|---|---|---|
| Lighthouse ≥ 90 on mobile | ✅ | `npm run lighthouse -w apps/web` audits 12 pages (public + signed-in) with Lighthouse's default mobile profile: performance 95–99, accessibility 100, best practices 100, SEO 100 on every indexable page. (`/login` and `/app/*` are deliberately `noindex`.) |
| Zero critical axe issues | ✅ | Playwright + axe-core (WCAG 2.0/2.1 A+AA) over 15 pages in **light and dark**: zero critical **and zero serious** findings. |
| E2E suite green | ✅ | 13 Playwright tests on the production build + a throwaway DB: guest → sign-up, a full lesson (failure tip, retry, stars, XP, badge), Word Rush, security, SEO, mobile layout, accessibility. |
| Beta feedback triaged | ❌ **not done** | Needs real people. See checklist. |
| Analytics / error monitoring | ◐ partial | Error reporting is pluggable (see below); no analytics included on purpose. |

Fixed during M6 because the audits found them: first style pass of the typing text cost ~850 ms (every character was its own element) → words are now single elements, performance on the practice page went 64 → 97; light-theme status colours and the dimmed upcoming text failed WCAG contrast; "label in name" mismatch on the level chip; `opacity`-dimmed locked items; theme flash on load (theme is now applied before first paint).

## What is in the box
Landing page with an embedded 30-second guest test · About / Privacy / Terms · SEO (metadata, canonical, Open Graph image, JSON-LD, `robots.txt`, `sitemap.xml`, `noindex` on app + auth pages) · skip link and landmarks · pluggable error reporting (`lib/report-error.ts`, `app/global-error.tsx`, `instrumentation.ts` request-error logging) · CI (lint, types, unit tests, build, e2e, Lighthouse).

## ⚠️ Gaps that block a real public launch
1. **Password reset is built, but needs your email provider; email verification is still missing.** Reset: `/forgot-password` → emailed one-time link (60 min) → `/reset-password`. It is verified end to end in the tests using a file outbox, but **never against a real mailbox**: set `RESEND_API_KEY` + `EMAIL_FROM` (a domain you have verified with Resend) and send yourself a reset email before launch. In production with no provider configured, reset emails are NOT sent (and an error is logged); the page still says "if that email has an account…". Sign-ups are still not verified: anyone can register someone else's address (they cannot read mail sent to it, but can squat the account). Verification reuses the same email pipeline and is the natural next step.
2. **Legal text is a plain-language draft, not legal advice.** Privacy and Terms describe what the app actually does, but have not been reviewed by a lawyer. Decide the **age policy** (currently "13 and over, or younger with a parent's permission"; our personas include an 11-year-old, which brings COPPA/GDPR-K obligations). Governing law / company details are not stated.
3. **No beta test has happened.** Plan ~20 users, real keyboards (including laptops and non-QWERTY habits), and at least one phone.
4. **Rate limiting is per-process memory.** Fine for one instance; with several serverless instances limits are per-instance. Use a shared store (Upstash Redis / similar) before scaling.
5. **No breached-password check, no 2FA, no account lockout beyond rate limits.**
6. **Anti-cheat is light** (consistency checks + caps). Do not add public leaderboards before strengthening it.
7. **Not verified on real devices:** phone/IME typing, screen readers (axe automates ~⅓ of WCAG; do a manual NVDA/VoiceOver pass on the typing screens), Safari and Firefox (e2e uses Chrome only).
8. **No analytics.** If you want product analytics, pick a privacy-respecting one, then update the Privacy page and add a consent banner if required in your market.
9. **Backups, uptime monitoring and alerting** are the host's job and are not configured.

## Environment variables
| Variable | Required | Purpose |
|---|---|---|
| `DATABASE_URL` | yes | Postgres connection string (Neon, Supabase, RDS…). |
| `AUTH_SECRET` | yes | Session signing key. `openssl rand -base64 32`. Never reuse the dev one. |
| `AUTH_TRUST_HOST` | on most hosts | `true` when behind a proxy/platform that sets the host header (Vercel sets this automatically). |
| `SITE_URL` | yes (prod, for password reset) | Runtime origin used to build reset links, e.g. `https://typemaster.app`. Reset links are never built from the request's Host header (that would allow link poisoning). |
| `RESEND_API_KEY`, `EMAIL_FROM` | yes (prod, for password reset) | Email delivery through Resend, e.g. `EMAIL_FROM="TypeMaster <no-reply@yourdomain>"`. Other providers: replace the `resend` branch in `lib/server/email.ts`. |
| `EMAIL_TRANSPORT` | no | `console` (dev default: prints the link to the server log), `file` (+ `EMAIL_OUTBOX_FILE`, used by e2e), or `resend`. Production refuses to guess. |
| `NEXT_PUBLIC_SITE_URL` | yes (prod) | Canonical origin, e.g. `https://typemaster.app`. Used for canonical links, Open Graph, sitemap, robots. Set **at build time**. |
| `NEXT_PUBLIC_CONTACT_EMAIL` | recommended | Shows a Contact link and privacy contact. Hidden if unset. Build time. |
| `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` | optional | Enables "Continue with Google". Add the callback `https://<domain>/api/auth/callback/google` in Google Cloud Console. |
| `NEXT_PUBLIC_ERROR_ENDPOINT` | optional | URL that receives a small JSON POST for each browser error. Build time. |

## Deploying (example: Vercel + managed Postgres)
1. Create a Postgres database (Neon or Supabase). Copy its connection string.
2. Create the Vercel project from this repo with **Root Directory** `apps/web`, framework Next.js. Add the variables above.
3. Apply migrations once per release (before or as part of deploy):
   `DATABASE_URL=<prod url> npm run migrate -w packages/db`
4. Deploy. Open `/`, take a test, sign up, and confirm the result appears under Progress.
5. Add your domain, set `NEXT_PUBLIC_SITE_URL`, redeploy, and check `/robots.txt`, `/sitemap.xml` and the social preview (`/opengraph-image`).

## Running the checks yourself
```bash
npm run lint && npm run typecheck
DATABASE_URL_TEST=postgres://localhost:5432/typemaster_test npm test
npm run build
npm run e2e -w apps/web          # Playwright + axe (uses installed Google Chrome, test DB)
npm run lighthouse -w apps/web   # Lighthouse mobile audit, exits non-zero below 90
```
