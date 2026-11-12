/**
 * Gamification rules (decision D-010): XP is only awarded above an accuracy gate, replays are worth little
 * (anti-farming), and there is a daily cap on practice XP. Pure functions: easy to test and to tune.
 */

export const ACCURACY_GATE = 90;
export const DAILY_PRACTICE_XP_CAP = 500;

export type Activity =
  | { kind: "test" | "drill" | "game"; durationS: number; accuracy: number }
  | { kind: "lesson"; stars: number; previousBestStars: number };

/** 0 below the gate; 1.0 from 90%, 1.5 from 95%, 2.0 from 98%. */
export function accuracyMultiplier(accuracy: number): number {
  if (accuracy < ACCURACY_GATE) return 0;
  if (accuracy >= 98) return 2;
  if (accuracy >= 95) return 1.5;
  return 1;
}

const PER_MINUTE: Record<"test" | "drill" | "game", number> = { test: 20, drill: 15, game: 20 };

/** XP before the daily cap. Lessons: 30/40/50 for 1/2/3 stars the first time; replays 5 (+10 per extra star). */
export function xpFor(a: Activity): number {
  if (a.kind === "lesson") {
    if (a.stars <= 0) return 0;
    if (a.previousBestStars <= 0) return 30 + 10 * (a.stars - 1);
    return 5 + 10 * Math.max(0, a.stars - a.previousBestStars);
  }
  return Math.round(PER_MINUTE[a.kind] * (a.durationS / 60) * accuracyMultiplier(a.accuracy));
}

/** Applies the daily cap on practice XP (lessons are exempt, they are naturally limited). */
export function applyDailyCap(xp: number, kind: Activity["kind"], earnedTodayFromPractice: number): number {
  if (kind === "lesson") return xp;
  return Math.max(0, Math.min(xp, DAILY_PRACTICE_XP_CAP - earnedTodayFromPractice));
}

// ---------- levels ----------
export const MAX_LEVEL = 100;
/** Total XP needed to reach level L (L1 = 0). Grows as 100 * (L-1)^1.5: 100, 283, 520, 800, 1118… */
export const xpForLevel = (level: number) => Math.round(100 * Math.pow(Math.max(0, level - 1), 1.5));

export function levelFor(xp: number): number {
  let l = 1;
  while (l < MAX_LEVEL && xp >= xpForLevel(l + 1)) l++;
  return l;
}

export function levelProgress(xp: number) {
  const level = levelFor(xp);
  const floor = xpForLevel(level);
  const next = level >= MAX_LEVEL ? floor : xpForLevel(level + 1);
  return { level, xp, floor, next, into: xp - floor, needed: next - floor, fraction: next === floor ? 1 : (xp - floor) / (next - floor) };
}

// ---------- badges ----------
export interface UserStats {
  lessonsPassed: number[];
  testsCompleted: number;
  /** best WPM in a timed test with accuracy >= 90 */
  bestTestWpm: number;
  /** best accuracy in a timed test of at least 30 seconds */
  bestTestAccuracy: number;
  streak: number;
  gamesPlayed: number;
  bestGameScore: number;
}

export interface BadgeDef {
  id: string;
  title: string;
  emoji: string;
  description: string;
  target: number;
  unit: string;
  value: (s: UserStats) => number;
}

export const BADGES: BadgeDef[] = [
  { id: "first_steps", title: "First Steps", emoji: "🌱", description: "Pass lesson 1", target: 1, unit: "lesson", value: (s) => (s.lessonsPassed.includes(1) ? 1 : 0) },
  { id: "test_drive", title: "Test Drive", emoji: "⌨️", description: "Finish a timed test", target: 1, unit: "test", value: (s) => s.testsCompleted },
  { id: "speedy_50", title: "Speedy 50", emoji: "⚡", description: "Reach 50 WPM in a test (90%+ accuracy)", target: 50, unit: "WPM", value: (s) => s.bestTestWpm },
  { id: "rocket_80", title: "Rocket", emoji: "🚀", description: "Reach 80 WPM in a test (90%+ accuracy)", target: 80, unit: "WPM", value: (s) => s.bestTestWpm },
  { id: "sharpshooter", title: "Sharpshooter", emoji: "🎯", description: "98% accuracy in a test of 30s or more", target: 98, unit: "%", value: (s) => s.bestTestAccuracy },
  { id: "finisher", title: "Finisher", emoji: "🏁", description: "Pass all of Unit 1 (lessons 1–5)", target: 5, unit: "lessons", value: (s) => s.lessonsPassed.filter((id) => id >= 1 && id <= 5).length },
  { id: "scholar", title: "Scholar", emoji: "📚", description: "Pass 10 lessons", target: 10, unit: "lessons", value: (s) => s.lessonsPassed.length },
  { id: "graduate", title: "Graduate", emoji: "🎓", description: "Pass all 20 lessons", target: 20, unit: "lessons", value: (s) => s.lessonsPassed.length },
  { id: "on_fire", title: "On Fire", emoji: "🔥", description: "Practise 7 days in a row", target: 7, unit: "days", value: (s) => s.streak },
  { id: "diamond", title: "Diamond", emoji: "💎", description: "Practise 30 days in a row", target: 30, unit: "days", value: (s) => s.streak },
  { id: "gamer", title: "Gamer", emoji: "🎮", description: "Play 5 games", target: 5, unit: "games", value: (s) => s.gamesPlayed },
  { id: "high_scorer", title: "High Scorer", emoji: "🏆", description: "Score 1,000 in Word Rush", target: 1000, unit: "points", value: (s) => s.bestGameScore },
];

export const getBadge = (id: string) => BADGES.find((b) => b.id === id);

/** Ids of every badge the stats currently qualify for. */
export const earnedBadgeIds = (s: UserStats): string[] => BADGES.filter((b) => b.value(s) >= b.target).map((b) => b.id);

export const emptyStats = (): UserStats => ({ lessonsPassed: [], testsCompleted: 0, bestTestWpm: 0, bestTestAccuracy: 0, streak: 0, gamesPlayed: 0, bestGameScore: 0 });
