# 03 · User Journeys & Application Flow

## 0 · Master flow — how everything connects
```mermaid
flowchart TD
  L[Landing] -->|Try 30s test| GT[Guest Test]
  L -->|Sign up| REG[Register]
  GT --> GR[Guest Results] -->|Save my score| REG
  REG --> ONB[Goal + Placement]
  ONB --> D[Dashboard]
  LOGIN[Login] --> D
  D --> PATH[Learning Path]
  D --> PRC[Practice / Test]
  D --> GAMES[Games]
  D --> DAILY[Daily Challenge]
  PATH --> LES[Lesson] --> RES[Results]
  PRC --> RES
  GAMES --> G1[Word Rush / Racer / Falling] --> RES
  DAILY --> RES
  RES -->|XP · streak| ACH[Achievements]
  RES -->|weak keys| DRILL[Weak-key Drill] --> LES
  RES --> PROG[Progress]
  RES --> D
  ACH --> D
  PROG --> PRC
```

## 1 · First-time visitor
```mermaid
flowchart LR
  A[Lands from search] --> B{Understands value<br/>in 5s?}
  B -->|Yes| C[Clicks 'Try a 30-second test']
  B -->|No| F[Scrolls: features / how it works]
  F --> C
  C --> D[Types - no signup]
  D --> E[Sees WPM + 'You're slow on P, Q, ;']
  E --> G{Save progress?}
  G -->|Yes| H[Sign up - score imported]
  G -->|No| I[Retry test or leave]
  H --> J[Dashboard with first goal]
```
**Success:** test completion rate ≥ 50%; sign-up conversion from results ≥ 20%.

## 2 · Beginner starting their first lesson
```mermaid
flowchart LR
  A[Signs up] --> B[Pick goal: Learn from scratch]
  B --> C[Skip placement]
  C --> D[Dashboard: 'Start Lesson 1']
  D --> E[Lesson 1: meet home row F J]
  E --> F[Keyboard shows finger colours + next key]
  F --> G[Type drill ≥ 90% accuracy]
  G -->|Pass| H[Stars + XP + 'Lesson 2 unlocked']
  G -->|Fail| I[Friendly retry with tip]
  I --> F
  H --> J[Badge: First Steps]
```

## 3 · Completing a practice session
```mermaid
flowchart LR
  A[Practice] --> B[Choose mode: 60s, punctuation off]
  B --> C[Type: live WPM/acc]
  C --> D{Finished}
  D --> E[Results: WPM · acc · consistency]
  E --> F{New personal best?}
  F -->|Yes| G[Celebrate + badge check]
  F -->|No| H[Compare to average]
  G --> I[Weak keys panel]
  H --> I
  I --> J[CTA: Drill weak keys / Try again / Dashboard]
```

## 4 · Playing a typing game
```mermaid
flowchart LR
  A[Games overview] --> B[Pick Word Rush]
  B --> C[Brief rules + difficulty]
  C --> D[3-2-1 countdown]
  D --> E[Play 60s - combo multiplier]
  E --> F[Game over: score, WPM, acc]
  F --> G[XP + stats saved to Progress]
  G --> H{Replay?}
  H -->|Yes| C
  H -->|No| A
```

## 5 · Returning user checking progress
```mermaid
flowchart LR
  A[Opens app] --> B[Dashboard: streak, today's goal]
  B --> C[Sees 'WPM +4 this week']
  C --> D[Opens Progress]
  D --> E[Trend chart 7/30/90d]
  E --> F[Weak-key heatmap]
  F --> G[Tap key 'P' → 78% acc]
  G --> H[Start 'Fix P, Q, ;' drill]
```

## 6 · Advanced user improving speed
```mermaid
flowchart LR
  A[Dashboard: avg 82 WPM] --> B[Practice: 60s with punctuation]
  B --> C[Results: consistency 81%]
  C --> D[Progress → slowest bigrams]
  D --> E[Advanced lesson: targeted bigram bursts]
  E --> F[Re-test]
  F --> G{PB?}
  G -->|Yes| H[Badge + share card]
  G -->|No| I[Insight: 'Rhythm drops after 40s']
  I --> B
```

## Navigation rules
- Primary nav (always visible once signed in): **Dashboard · Learn · Practice · Games · Progress · Achievements**; Profile via avatar menu.
- Every **Results** screen offers exactly three next actions: *Primary* (recommended drill), *Retry*, *Back to dashboard*.
- Leaving a running session asks for confirmation; stats from abandoned sessions < 10 s are discarded.
