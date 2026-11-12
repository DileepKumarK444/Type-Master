# 06 · Screen Designs & Specifications

**Visuals:** open [`prototype/index.html`](prototype/index.html) — every screen below is designed in it, in 3 themes, desktop + mobile (Device switch), with Loading / Empty / Error states (State switch). Prototype ≠ implemented feature.

**Responsive rules (all screens):** Desktop ≥ 1024: sidebar 236px + content (max 1200). Tablet 760–1023: sidebar hidden, bottom tab bar. Mobile < 760: single column, 5-tab bottom bar (Home · Learn · Practice · Games · More), 16px gutters, 44px min touch target. Typing/game screens use **Focus mode** (no nav; Exit button + Esc to pause).

Legend: **D** = desktop layout, **M** = mobile layout.

| # | Screen | Desktop layout (D) | Mobile layout (M) | Key components | Interactions & navigation | States |
|---|---|---|---|---|---|---|
| 1 | **Landing** | Sticky nav · hero with headline, 2 CTAs, live typing demo card · 3 feature cards · 4-step how-it-works · CTA · footer | Nav collapses to logo + CTA; sections stack | Hero, demo typer, feature cards, steps | "Try 30s test" → Practice (guest); "Sign up" → Auth | Static; demo respects reduced-motion |
| 2 | **Register / Login** | 50/50 split: brand promo + form | Form only, promo hidden | Tabs, Google button, inputs, strength hint | Tab swap, submit → Dashboard (new users → goal picker); "Forgot password" | Inline field errors (shown), submitting spinner, rate-limit message |
| 3 | **Dashboard** | 2/3 + 1/3 grid: recommended lesson hero, 3 stat cards, 30-day WPM chart · right rail: daily goal + week dots, quick start, weak keys | Stack; stats 2-up; right rail below | Stat cards, line chart, progress, key chips | Hero CTA → next lesson; quick start → Practice/Game/Daily; weak keys → drill | Loading skeleton, **empty** (new user: “Start Lesson 1”), error + retry/offline |
| 4 | **Learning path** | List by unit with lesson nodes (done ★★★, current, locked) + right summary | Single column; summary on top | Unit headers, nodes, stars, placement CTA | Tap node → Lesson; locked shows why | Loading, empty (pick starting point), error |
| 5 | **Beginner lesson** | Focus shell: step progress (Meet keys → Drill → Words → Test), tip card, pass-mark, large typing card, **finger-coloured keyboard** | Typing card + compact keyboard under | Step bar, tip, typer, keyboard, live stats | Type; Backspace; Esc pause; finish → Results with stars/XP | Pass/fail feedback; offline-save banner |
| 6 | **Intermediate lesson** | Same shell; smaller keyboard; sentences w/ capitals+punctuation | Keyboard optional (toggle) | as above | Pass ≥ 93% | as above |
| 7 | **Advanced lesson** | Same shell; **no keyboard**; code/prose snippets; consistency metric | Recommend physical keyboard | Typer, live stats | Pass ≥ 95% | v1.3 |
| 8 | **Typing practice** | Focus shell: mode tabs (15/30/60/120s), toggles (punctuation/numbers), big typing card with live WPM/Acc/time + progress, restart, compact keyboard | Keyboard hidden; note on system keyboard | Mode tabs, toggles, typer | Timer starts on 1st key; Tab+Enter restart; done → Results | Idle (“start typing”), running, focus-lost warning, **live demo works** |
| 9 | **Results** | Hero WPM (big), 4 stats, speed-over-time chart · right: problem keys, XP/streak, CTAs (primary: drill weak keys) | Stack | Result card, chart, key chips, CTA stack | Drill / Try again / Dashboard; PB shows celebration | Saved/syncing/failed-to-save (retry) |
| 10 | **Virtual keyboard** | Finger-zone keyboard (press keys to light them), 3 teaching cards, heatmap preview | Smaller keys | Keyboard, legend | Toggle guide ↔ heatmap | Static |
| 11 | **Games overview** | 3 game cards (status pill MVP/v1.1/v1.2) + recent plays table | Cards stack | Game cards, table | Play → game | Locked until Lesson 3, loading, error |
| 12 | **Word Rush** | Focus shell: score/combo/timer row, big target word with typed progress, input, next-words list, power-ups | Next-words list below | Timer bar, word, combo chip | Type word + Space; Esc pause | Countdown, game over → Results |
| 13 | **Typing Racer** | 4 lanes (you, ghost PB, 2 bots) + text under | Lanes compact | Lane bars, text | Type to advance | Waiting/countdown/finished; v1.2 |
| 14 | **Falling Words** | Arena with falling words, lives, score, input | Arena shorter | Arena, lives | Type word + Space | Game over; v1.1 |
| 15 | **Daily challenge** | Challenge card (fixed text, bonus rule) + top scores · right: streak calendar, rewards | Stack | Calendar, leaderboard | Start → typing run | No challenge, already completed, loading |
| 16 | **Achievements** | Summary bar + 4-col badge grid (unlocked/locked with progress) | 2-col | Badges, progress | Tap badge → detail | Empty (none unlocked), loading |
| 17 | **Progress & analytics** | Range tabs, 4 stat cards, WPM line, practice-time bars, accuracy heatmap, bigrams (v1.2), sessions table | Stack; table hides XP col | Charts, heatmap, table | Range switch; tap key → detail → drill | **Empty** (no sessions), loading, error |
| 18 | **Profile & settings** | Profile card, goals, preferences (toggles, text size, layout) · right: account actions, Save | Stack | Form, toggles | Save, export data, delete account (confirm) | Unsaved-changes prompt, validation errors |

## Typing-screen design rules (critical path)
1. Typing text is **monospace, ≥ 22px** desktop, with 2.0 line-height; only the current line pair visible in the real build.
2. Colour states: pending (muted), correct (full contrast), incorrect (red + background tint), current (accent underline). Never rely on colour only — incorrect chars also get a subtle underline.
3. Live stats update ≤ 4×/second; **no layout shift** while typing.
4. Errors never interrupt flow (no modals/sounds unless enabled).
5. Focus-loss shows "Click to continue" overlay, timer pauses.
6. Keyboard (when shown) highlights *next* key; pressed key depresses for 100ms.

## Dashboard design rules
One clear next action (the recommended lesson), 3 numbers max in the first row, a single primary chart, and a weak-keys shortcut that leads straight into practice.

## Learning-experience rules
Lessons are ≤ 6 minutes; always 4 steps; pass gate explained up front; failing gives a specific tip (“You hit **V** instead of **C** 4 times”) and a retry button with the same text.
