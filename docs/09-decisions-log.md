# 09 · Decisions Log

Status values: **Proposed** (my recommendation, awaiting you) · **Approved** · **Rejected** · **Changed**.
D-001 to D-013 approved by the owner on 2026-11-12 ("Approve my picks"). Open questions 4-6 not yet answered; defaults assumed (adults and students equally, standard hosting, accounts included).

| ID | Decision | Recommendation | Alternatives | Status | Date |
|---|---|---|---|---|---|
| D-001 | MVP scope | Landing, auth, dashboard, Beginner+Intermediate lessons, practice/test, results, keyboard, progress, achievements, XP/streak, profile, **Word Rush only** | Include all 3 games / all 18 screens in MVP | **Approved** | 2026-11-12 |
| D-002 | Public vs app split | Separate public site and authenticated app shell | Single shell | **Approved** | 2026-11-12 |
| D-003 | Visual direction | **A (Minimal) base + C (Dark) theme + light B-style rewards in Learn/Games** | Pure A · pure B · pure C | **Approved** | 2026-11-12 |
| D-004 | Frontend stack | Next.js + TypeScript + Tailwind + Zustand + TanStack Query | Vite SPA; Vue/Svelte | **Approved** | 2026-11-12 |
| D-005 | Backend/DB | Next.js route handlers + PostgreSQL (Supabase/Neon) + Drizzle | Node/Express + Mongo; NestJS | **Approved** | 2026-11-12 |
| D-006 | Auth | Managed auth (email + Google), HTTP-only cookies | Custom JWT | **Approved** | 2026-11-12 |
| D-007 | Typing engine | Framework-free TS package shared by lessons/tests/games | Per-feature logic | **Approved** | 2026-11-12 |
| D-008 | Keyboard layouts | QWERTY only in MVP, data-driven for later | Multiple at launch | **Approved** | 2026-11-12 |
| D-009 | Mobile typing | Mobile supports dashboard/progress/games-lite; lessons recommend a physical keyboard | Full mobile typing UX | **Approved** | 2026-11-12 |
| D-010 | Gamification rules | XP only above accuracy gate; 1 streak freeze/week | XP for any activity | **Approved** | 2026-11-12 |
| D-011 | Multiplayer | Deferred to v2.0; Racer MVP uses ghosts/bots | Realtime in v1.2 | **Approved** | 2026-11-12 |
| D-012 | Lesson content | Static curated JSON + weak-key drill generator | AI/adaptive generation | **Approved** | 2026-11-12 |
| D-013 | Monetisation | None in MVP (free) | Freemium at launch | **Approved** | 2026-11-12 |

## Open questions for you
1. Which design direction (D-003)? Do you want a kids-friendly mode eventually?
2. Is the MVP cut right, or must Racer/Falling Words/Daily ship in v1.0?
3. Are you happy with the Next.js + Postgres stack, or do you have a stack preference?
4. Target audience priority: kids/students vs adults/professionals?
5. Hosting/budget constraints (e.g. must be free-tier)?
6. Do you need accounts at all for v1.0, or is a local-only (no backend) first release acceptable?

## Change history
- 2026-11-12 — Initial planning set created (draft).
- 2026-11-12 — D-001..D-013 approved as proposed. Development NOT yet started; awaiting explicit go-ahead for M0.
- 2026-11-12 — M0 (Foundation) implemented. Deviation: npm workspaces instead of pnpm (pnpm not installed; trivial to switch). Storybook skipped (optional); /design page serves as UI kit.
- 2026-11-12 — M1 (Typing core + Practice) implemented: packages/typing-engine (28 tests, 100% line coverage), /app/practice with 15/30/60/120s, punctuation/numbers, virtual keyboard, live stats, results card. Deferred within M1: results are not persisted (M2); landing guest test is a link to /app/practice (real landing is M6). Not yet verified: soft-keyboard/IME input on a real phone; WPM vs. a reference tool.
- 2026-11-12 — M2 (Accounts & persistence) implemented. Deviations / notes:
  - Auth.js v5 (beta.25, pinned) + Postgres via Drizzle, not Supabase Auth, because no Supabase project exists yet. Works with any Postgres via DATABASE_URL (Supabase/Neon both fine).
  - "RLS" (docs/07) is replaced by query-layer ownership: every query is scoped by user id; proven by an integration test against real Postgres. Real RLS can be added if we move to Supabase client access.
  - Registration is POST /api/auth/register; profile is GET/PATCH/DELETE /api/me (no separate /api/me/settings). Added `clientId` on sessions for idempotent retries and guest import.
  - Rate limiter is in-memory (single instance only). No breached-password check yet.
  - Not verified: Google sign-in (needs OAuth credentials), automated Playwright E2E (verified by manual browser run + curl instead), real phone/IME typing.
- 2026-11-12 — M3 (Learning path) implemented: 20 lessons (12 beginner + 8 intermediate), lesson player with 4 steps, pass gates, stars, sequential unlocking, finger-guide keyboard, specific failure tips. Decisions / deviations:
  - Units re-cut to 6 (Home row · Top row · Bottom row & alphabet · Capitals & punctuation · Numbers · Words & sentences). Numbers moved from Beginner to Intermediate so the 12 beginner lessons cover all letters.
  - Stars: 1 = pass gate (90% beginner / 93% intermediate); 2 = accuracy ≥ 96%; 3 = accuracy ≥ 98% AND speed ≥ the lesson's target WPM (10–30). Pass/stars are computed on the server.
  - Only the final mini test is saved (as a `lesson` session, feeding weak-key stats); steps 1–3 are practice. Best WPM/accuracy are recorded only from passing attempts. Retry uses the same text (as specced). Lesson results are not queued offline: a network failure shows a retry button.
  - Lessons require an account (guests can use Practice only). Placement test / skip-ahead is NOT built. GET /api/path was not built (pages read progress server-side).
  - Not done: review of the curriculum by a typing teacher (acceptance criterion in docs/08); lesson text is generated, so early lessons are drill-like by design. Advanced path stays v1.3.
- 2026-11-12 — M4 (Results & Progress) implemented: personal-best detection, saved-result page (/app/results/:id), weak-key drill, Progress page (7/30/90d trends with vs-previous deltas, practice-time bars, per-key accuracy heatmap, weak keys, history), Dashboard (next lesson, weekly stats, 30-day trend, daily goal, weak keys), loading / error / not-found states. Decisions / deviations:
  - A "weak key" needs ≥20 attempts, ≥3 misses AND accuracy < 95% (without the ceiling, heavily used keys always looked weak).
  - Speed, accuracy and consistency stats use timed tests only; lessons and drills count toward practice time and key stats. Weak-key drills are stored as type "drill" and never count toward personal bests. PBs are per test length (15/30/60/120s).
  - Days and the streak chip use UTC for now; the streak is a simple consecutive-practice-day count (freezes, timezones and XP rules are M5).
  - The per-second speed chart exists only right after a test (keystroke logs are not stored), so the saved-result page shows stats, not the chart.
  - Not built (was in docs): bigram analytics (v1.2 as planned), "tap a key for details" on the heatmap (hover tooltip only), no dedicated GET /api/stats/* endpoints (pages query server-side).
  - Bug found and fixed while testing: a valid login cookie for a deleted account looped /app ⇄ /login; the login/register pages now check the account still exists.
- 2026-11-12 — M5 (Gamification + Word Rush) implemented: XP, levels, streak freeze, 12 badges, Achievements page, Games overview, playable Word Rush, rewards shown after tests / lessons / games, level chip in the header, level card on the dashboard. Decisions / deviations:
  - XP (D-010): only at ≥ 90% accuracy. Tests/drills/games: 20/15/20 XP per minute × accuracy multiplier (×1 from 90%, ×1.5 from 95%, ×2 from 98%). Lessons: 30/40/50 XP for 1/2/3 stars on first pass; replays 5 XP (+10 per extra star). Daily cap of 500 XP on tests, drills and games (UTC day); lessons are exempt. Levels: total XP for level L = 100·(L−1)^1.5 (L2 100, L3 283, L4 520…), max 100.
  - Streak freeze is computed, not stored: one missed day is forgiven per rolling 7 days when the days either side were practised. (The `streak_freezes` column from docs/07 was not needed.) Days are still UTC; per-user timezones are not built.
  - Badges (12): First Steps, Test Drive, Speedy 50, Rocket, Sharpshooter, Finisher, Scholar, Graduate, On Fire, Diamond, Gamer, High Scorer. "Night Owl" and "No Peeking" from the prototype were dropped (need timezones / a hidden-keyboard mode). Badges persist once earned (a later broken streak does not remove "On Fire").
  - Word Rush: 60s, per-word timers that shrink slightly as you progress, combo multiplier ×1→×4 (every 4 correct words), wrong or timed-out word resets the combo. Stored as type "game" with a score column. Server checks that the score is achievable from the letters typed (max ×4, 10 points a letter). Falling Words / Racer remain v1.1 / v1.2.
  - Games, achievements and the daily challenge: the Daily Challenge page was NOT built (v1.1 as planned). No leaderboards. Anti-cheat is still light (consistency checks + rate limits + the daily XP cap); a determined bot sending fabricated but consistent numbers would not be stopped.
- 2026-11-12 — M6 (Landing, polish, launch readiness) implemented: real landing page with an embedded 30-second guest test, About/Privacy/Terms, SEO (metadata, canonical, OG image, JSON-LD, robots, sitemap, noindex on app/auth), skip link + landmarks, theme applied before first paint, pluggable error reporting, Playwright e2e + axe suite (13 tests) and a Lighthouse audit script, both wired into CI. Full status and blockers in docs/10-launch-readiness.md. Decisions / notes:
  - No third-party analytics or Sentry were added: both need accounts only you can create. Error reporting is a small pluggable hook (`lib/report-error.ts`) + server request-error logging.
  - Legal pages are plain-language drafts that describe what the app really does; they need legal review. Age policy proposed as "13 and over, younger with parent permission" and is NOT decided.
  - Performance fix found by the audit: the typing text rendered one element per character (~1,700); now one element per word except the word under the cursor, and only ~80 words ahead are rendered. Practice page Lighthouse 64 → 97.
  - Accessibility fixes found by the audits: darker light-theme status colours (ok/warn/bad) and muted text for WCAG AA on their tinted backgrounds; upcoming text no longer dimmed with opacity; locked/"coming soon" items use muted styling instead of opacity; level chip label contains its visible text.
  - NOT done / blockers for a public launch: password reset and email verification (no email provider yet), the ~20-user beta, manual screen-reader and Safari/Firefox/phone testing, shared rate-limit store for multi-instance hosting.
- 2026-11-12 — Password reset implemented (follow-up to M6). Decisions / notes:
  - Flow: POST /api/auth/forgot (always the same answer, work done after responding so timing does not reveal accounts; 5/hour per IP and 3/hour per email) → one-time link, 60 minutes → POST /api/auth/reset. Tokens are 32 random bytes; only a SHA-256 hash is stored; a new request replaces older links; a link is consumed with a single conditional UPDATE so simultaneous attempts cannot both win.
  - Resetting bumps `users.session_version`, which signs out every other session. This also means deleting an account (or any version mismatch) now invalidates its existing login cookies on every device. The JWT callback therefore does one primary-key lookup per session read.
  - Link base URL comes from SITE_URL / NEXT_PUBLIC_SITE_URL, never from the request Host header. The reset page is noindex and sends no referrer (the token is in the URL).
  - Google-only accounts can set a password through the same email proof.
  - Email transport is pluggable: Resend over HTTP (no SDK), file (tests), console (dev). NOT verified against a real Resend account or mailbox.
  - Not built: email verification at sign-up, "change password" while logged in, a "your password was changed" notification email, per-account lockout.
