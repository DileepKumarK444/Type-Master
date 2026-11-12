# 05 · UI/UX Design Directions

> **See them live:** open [`prototype/index.html`](prototype/index.html) and use the **Design** switcher (A / B / C) on any of the 18 screens. All three directions are implemented as themes of the same layouts, so you can compare like for like.

All three share: same information architecture, same components, WCAG AA contrast, monospace typing surface, focus mode while typing.

---
## Option A — Modern Minimal
**Concept:** "Get out of the way." Paper-like calm, content first, almost no decoration; progress is shown with numbers and thin bars rather than rewards.

| Token | Value |
|---|---|
| Background / Surface | `#FAFAF8` / `#FFFFFF` |
| Text / Muted | `#1C1C1A` / `#74746C` |
| Accent | `#2F5BEA` (blue) · soft `#E8EEFE` |
| Success / Error / Warn | `#1F9D63` / `#D93B3B` / `#C98A0B` |
| Radius / Shadow | 10px / hairline |
| Headings / Body | **Inter** 700 / Inter 400 · Typing: **JetBrains Mono** |

**Components:** flat white cards with 1px borders, solid blue primary button, pill tags, thin progress bars, no XP chrome in the shell.
**Typing screen:** big light page, single card, text at 24px mono, untyped text in grey, correct in near-black, errors in red highlight, current char underlined in blue. Live WPM/accuracy above. Nothing else competes.
**Strengths:** fastest to build, ages well, great for adults/advanced users. **Weakness:** least motivating for kids and habit-building.

---
## Option B — Gamified Learning
**Concept:** "Duolingo for typing." Playful, rounded, colourful; every action shows XP, streak and levels. The sidebar carries a level bar; buttons have chunky 3D shadows.

| Token | Value |
|---|---|
| Background / Surface | `#F3EFFF` / `#FFFFFF` |
| Text / Muted | `#2A1B52` / `#7A6AA8` |
| Accent | `#7C3AED` (violet) · soft `#EDE4FF` |
| Success / Error / Warn | `#22C55E` / `#F43F5E` / `#FF9F1C` |
| Radius / Shadow | 20px / solid "pressed" offsets |
| Headings / Body | **Nunito** 900 / Nunito 500–700 · Typing: JetBrains Mono |

**Components:** 2px bordered rounded cards, 3D primary buttons, thick progress bars, XP chip + level bar always visible, emoji badges, mascot moments (empty states, celebrations).
**Typing screen:** larger text for beginners, lesson step progress segments on top, star targets, finger-coloured keyboard prominent beneath; celebratory confetti and XP toast on completion.
**Strengths:** strongest for beginners/kids and retention. **Weakness:** can feel childish/noisy for advanced users; more design + animation work; needs a "calm mode".

---
## Option C — Premium Dark
**Concept:** "Pro tool." Dark, precise, subtle cyan neon accents and glow on active elements; reads like a developer/gamer tool, strong for stats nerds.

| Token | Value |
|---|---|
| Background / Surface | `#0A0C11` / `#12151D` |
| Text / Muted | `#E8EAF2` / `#7F8799` |
| Accent | `#22D3EE` (cyan) · secondary `#A78BFA` |
| Success / Error / Warn | `#34D399` / `#FB7185` / `#FBBF24` |
| Radius / Shadow | 12px / soft glow on focus & primary |
| Headings / Body | **Space Grotesk** 600 / Space Grotesk 400 · Typing: JetBrains Mono |

**Components:** low-contrast borders, glowing primary buttons, neon-outlined active items, data-dense stat cards, glow on the current character and the focused text box.
**Typing screen:** dark canvas, cyan caret/underline, correct text bright, pending text dim; focus area glows once typing begins. Reduced eye strain for long sessions.
**Strengths:** premium feel, great charts, popular with the enthusiast audience (Monkeytype-like). **Weakness:** less approachable for young children; dark-only needs a light option later for accessibility.

---
## Comparison
| Criterion | A Minimal | B Gamified | C Dark |
|---|---|---|---|
| Beginner/kid friendliness | ◐ | ● | ◔ |
| Advanced/enthusiast appeal | ● | ◔ | ● |
| Retention mechanics | ◔ | ● | ◐ |
| Build effort | Low | High | Medium |
| Long-session comfort | ◐ | ◐ | ● |
| Brand distinctiveness | ◔ | ● | ◐ |

## Recommendation
**Recommend: Option A as the base design system, with Option C as a user-selectable dark theme, and a *lightweight* subset of B (XP chip, streak flame, badges, celebrations) layered on only in Learn/Games.**

Why: our two largest personas (Priya, Marcus) want clarity and data; Option A is cheapest and keeps the typing surface calm. Because the prototype is built with CSS tokens, dark mode comes nearly free. The motivation features from B are valuable but should be added where they pay off (lessons, results, achievements) rather than coloring the whole app. A full "kids" mode in style B can be a later theme.

> ⚠️ **Not decided.** Awaiting your choice — logged as D-003 in [09-decisions-log.md](09-decisions-log.md).
