# 04 · Information Architecture

## Public website vs authenticated app
| | **Public website** | **Authenticated app** |
|---|---|---|
| Purpose | Acquire, explain, convert | Learn, practice, track |
| Layout | Top nav + footer, marketing sections | App shell: sidebar (desktop) / bottom tabs (mobile) |
| Rendering | Static / SSR for SEO | Client-heavy, SPA-like transitions |
| Data | None (guest test stored locally) | Per-user, persisted |
| Tone | Persuasive | Calm, focused (typing screens go full-focus: nav collapses) |

## Sitemap
```mermaid
flowchart TD
  ROOT((TypeMaster))
  ROOT --> PUB[Public website]
  ROOT --> APP[Authenticated app]

  PUB --> P1[/ Landing]
  P1 --> P1a[Try 30s guest test]
  PUB --> P2[/login]
  PUB --> P3[/register]
  PUB --> P4[/about · /faq · /privacy · /terms]

  APP --> A1[/app Dashboard]
  APP --> A2[/app/learn]
  A2 --> A2a[Path overview]
  A2a --> A2b[/lesson/:id Beginner · Intermediate · Advanced]
  APP --> A3[/app/practice]
  A3 --> A3a[Mode picker]
  A3 --> A3b[Test running]
  A3 --> A3c[/results/:sessionId]
  APP --> A4[/app/keyboard Virtual keyboard guide]
  APP --> A5[/app/games]
  A5 --> G1[/word-rush]
  A5 --> G2[/falling-words]
  A5 --> G3[/racer]
  APP --> A6[/app/daily Daily challenge]
  APP --> A7[/app/achievements]
  APP --> A8[/app/progress]
  A8 --> A8a[Trends]
  A8 --> A8b[Weak-key heatmap]
  A8 --> A8c[History]
  APP --> A9[/app/profile]
  A9 --> A9a[Profile] 
  A9 --> A9b[Goals]
  A9 --> A9c[Preferences]
  A9 --> A9d[Account & data]
```

## Navigation structure
**Desktop sidebar:** Dashboard · Learn · Practice · Games · Daily · Progress · Achievements · (bottom) Profile & Settings.
**Mobile bottom tabs (5):** Home · Learn · Practice · Games · More (Progress, Achievements, Daily, Profile).
**Focus mode:** while typing (lesson, test, game), the shell hides; `Esc` pauses and offers Resume / Quit.

## Screen ↔ route map (18 designed screens)
| # | Screen | Route | Area | MVP? |
|---|---|---|---|---|
| 1 | Landing | `/` | Public | ✅ |
| 2 | Register / Login | `/register`, `/login` | Public | ✅ |
| 3 | Dashboard | `/app` | App | ✅ |
| 4 | Learning path | `/app/learn` | App | ✅ |
| 5–7 | Lessons (B/I/A) | `/app/lesson/:id` | App | B ✅ I ✅ A v1.3 |
| 8 | Typing practice | `/app/practice` | App | ✅ |
| 9 | Results | `/app/results/:id` | App | ✅ |
| 10 | Virtual keyboard | `/app/keyboard` | App | ✅ (guide page + embedded component) |
| 11 | Games overview | `/app/games` | App | ✅ |
| 12 | Word Rush | `/app/games/word-rush` | App | ✅ |
| 13 | Typing Racer | `/app/games/racer` | App | v1.2 |
| 14 | Falling Words | `/app/games/falling-words` | App | v1.1 |
| 15 | Daily challenge | `/app/daily` | App | v1.1 |
| 16 | Achievements | `/app/achievements` | App | ✅ |
| 17 | Progress | `/app/progress` | App | ✅ |
| 18 | Profile & settings | `/app/profile` | App | ✅ |
