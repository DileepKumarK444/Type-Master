# 01 · Product Specification — TypeMaster

> Status: **DRAFT for review** · Nothing here is approved until recorded in [09-decisions-log.md](09-decisions-log.md).

## 1. Vision
**TypeMaster is the typing platform that teaches you *why* you're slow, not just *how* slow you are.** It combines a structured learning path, honest analytics (per-key, per-finger), and short, replayable games so that people build real touch-typing skill in 10 minutes a day.

## 2. Objectives
| # | Objective | Measure of success (first 6 months) |
|---|-----------|--------------------------------------|
| O1 | Take a beginner to ~40 WPM / 95% accuracy | ≥ 35% of users finishing Beginner path reach it |
| O2 | Build a daily habit | D7 retention ≥ 25%, avg 3+ sessions/week for active users |
| O3 | Make progress visible and motivating | ≥ 60% of users open Progress page at least once a week |
| O4 | Be fast and distraction-free in the core loop | Keystroke-to-render < 16 ms; Lighthouse perf ≥ 90 |

## 3. Target audience & personas
| Persona | Who | Goal | Frustration | What they need |
|---|---|---|---|---|
| **Sam, 11** (Beginner student) | Primary/secondary school pupil, looks at keys | Stop hunt-and-peck, get homework done faster | Boring drills, feels judged by errors | Playful tone, small lessons, visible finger guide, rewards |
| **Priya, 24** (Career starter) | Graduate in first office job, ~35 WPM | Reach 60 WPM for work/job applications | Plateau, doesn't know which keys hurt her | Targeted weak-key drills, honest analytics, short sessions |
| **Marcus, 33** (Advanced improver) | Developer/writer, ~85 WPM, uses code & punctuation | Break through to 110+, reduce errors | Generic tests don't show *what* to fix | Burst/consistency metrics, custom text, code mode, history |
| **Elena, 52** (Late learner) | Returning to work, self-taught two-finger typist | Learn properly, no pressure | Overwhelmed by gamified noise | Calm mode, big text, no timers by default |

## 4. Problems we solve
1. **Typing tests measure, they don't teach** (Monkeytype, 10FastFingers) — users hit a plateau with no guidance.
2. **Lesson sites teach, but feel dated and childish** (typing.com, Typingclub) — advanced users leave.
3. **Games are disconnected from learning** (Typeracer, ZType) — fun, but no skill-building loop.
4. **Progress is shallow** — a single WPM number hides weak keys, finger imbalance and rhythm issues.

## 5. Core features (summary — detail in [02](02-feature-breakdown.md))
Learning path · Typing engine & practice/test · Virtual keyboard & finger guide · Results & analytics · Games · Daily challenge · Achievements/XP/streaks · Profile & settings.

## 6. What makes TypeMaster different
| Differentiator | Existing platforms | TypeMaster |
|---|---|---|
| **Closed loop: test → diagnose → drill → retest** | Test OR lessons | Results screen auto-generates a "Fix your weak keys" 3-minute drill |
| **Per-key / per-finger analytics** | Single WPM number | Keyboard accuracy heatmap, finger load, slowest bigrams |
| **One engine, many surfaces** | Games and lessons are separate code/UX | Same typing engine powers lessons, tests and games, so every game improves the same stats |
| **Adaptive tone** | One fixed style | Three themes (Minimal / Gamified / Dark) — user chooses their motivation style (pending design approval) |
| **Honest gamification** | XP for showing up | XP only awarded for accuracy-gated completions; streaks forgive one missed day ("streak freeze") |

## 7. MVP scope (proposal — *not* everything in this spec)
**In MVP (v1.0):** Landing · Auth (email + Google) · Dashboard · Learning path with **Beginner (12 lessons)** + Intermediate (8) · Typing practice & timed test (15/30/60s) · Results · Virtual keyboard + finger guide · Progress (WPM/accuracy trend, weak keys) · Achievements (≈12 badges) · XP + streak · Profile/settings · **One game: Word Rush**.

**Explicitly NOT in MVP:** multiplayer racing, leaderboards, Advanced path full content, custom text upload, teacher/classroom accounts, payments, native apps, i18n/other keyboard layouts (QWERTY only).

## 8. Future enhancements
v1.1 Falling Words, Daily challenge · v1.2 Typing Racer vs bots/ghosts · v1.3 Advanced path + code mode · v2.0 Realtime multiplayer races, leaderboards, friends · v2.1 Dvorak/Colemak/AZERTY layouts · v2.2 Classroom mode · v3.0 Native/PWA offline, premium tier.

## 9. Assumptions & risks
| Risk | Mitigation |
|---|---|
| Scope creep from 18 screens | Strict MVP cut above; mockups ≠ commitments |
| Mobile typing is poor UX | Mobile = progress, dashboard, games-lite; lessons recommend a physical keyboard (decision D-009) |
| Input accuracy across IME/layouts | Engine uses `beforeinput`/`key` events, tested matrix; QWERTY-only MVP |
| Cheating/bot scores later (leaderboards) | Server-side sanity checks on keystroke logs; leaderboards not in MVP |
