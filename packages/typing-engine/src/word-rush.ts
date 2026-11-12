import { COMMON_WORDS, rng } from "./text";
import type { KeyStat } from "./session";

/**
 * Word Rush: type each word and press Space/Enter before its timer runs out. Correct words score
 * length × 10 × combo multiplier (×1 → ×4 as the combo grows); a wrong or timed-out word resets the combo.
 * Pure and deterministic: time is injected, words come from a seed, so it is fully unit-testable.
 * Stats use the same definitions as TypingSession (letters only; WPM = correct chars / 5 / minutes).
 */

export type GameStatus = "idle" | "running" | "paused" | "finished";

export interface WordRushConfig { seed: number; seconds?: number }

export interface WordRushSnapshot {
  status: GameStatus;
  score: number;
  combo: number;
  multiplier: number;
  cleared: number;
  missed: number;
  word: string;
  typed: string;
  wordTimeLeftMs: number;
  wordBudgetMs: number;
  timeLeftMs: number;
  upcoming: string[];
}

export interface WordRushResult {
  score: number;
  wpm: number;
  rawWpm: number;
  accuracy: number;
  errors: number;
  cleared: number;
  missed: number;
  maxCombo: number;
  durationMs: number;
  totalKeystrokes: number;
  keyStats: Record<string, KeyStat>;
  confusions: Record<string, Record<string, number>>;
}

export const multiplierFor = (combo: number) => 1 + Math.min(3, Math.floor(combo / 4));
export const wordBudgetMs = (word: string, index: number) => Math.max(2000, Math.round((3000 + word.length * 400) * Math.max(0.5, 1 - index * 0.01)));

const WORD_COUNT = 600;
const MIN_WPM_MS = 1000;

export class WordRush {
  readonly seconds: number;
  private words: string[];
  private _status: GameStatus = "idle";
  private startedAt = 0;
  private pausedAt = 0;
  private pausedTotal = 0;
  private finishedElapsed = 0;
  private idx = 0;
  private wordStart = 0; // game-elapsed ms at which the current word began
  private typed = "";
  private score = 0;
  private combo = 0;
  private maxCombo = 0;
  private cleared = 0;
  private missed = 0;
  private correctChars = 0;
  private hits = 0;
  private misses = 0;
  private keyStats: Record<string, KeyStat> = {};
  private confusions: Record<string, Record<string, number>> = {};

  constructor(cfg: WordRushConfig) {
    this.seconds = cfg.seconds ?? 60;
    if (this.seconds <= 0) throw new Error("seconds must be > 0");
    const rand = rng(cfg.seed);
    const pool = COMMON_WORDS.filter((w) => w.length >= 3 && w.length <= 9 && /^[a-z]+$/.test(w));
    this.words = [];
    for (let i = 0; i < WORD_COUNT; i++) {
      let w = pool[Math.floor(rand() * pool.length)];
      if (w === this.words[i - 1]) w = pool[(pool.indexOf(w) + 1) % pool.length];
      this.words.push(w);
    }
  }

  get status(): GameStatus { return this._status; }

  start(now: number) {
    if (this._status !== "idle") return;
    this._status = "running";
    this.startedAt = now;
  }

  private elapsed(now: number): number {
    if (this._status === "idle") return 0;
    if (this._status === "finished") return this.finishedElapsed;
    return Math.max(0, (this._status === "paused" ? this.pausedAt : now) - this.startedAt - this.pausedTotal);
  }

  private budget() { return wordBudgetMs(this.words[this.idx], this.idx); }

  private nextWord(at: number) {
    this.idx++;
    this.typed = "";
    this.wordStart = at;
  }

  /** Processes word timeouts and the end of the game. Returns true if the game just finished. */
  tick(now: number): boolean {
    if (this._status !== "running") return false;
    const limit = this.seconds * 1000;
    const e = this.elapsed(now);
    for (;;) {
      const expiry = this.wordStart + this.budget();
      if (expiry > e || expiry >= limit) break;
      this.combo = 0;
      this.missed++;
      this.nextWord(expiry);
    }
    if (e >= limit) {
      this._status = "finished";
      this.finishedElapsed = limit;
      return true;
    }
    return false;
  }

  /** One typed letter (not Space/Enter). */
  input(ch: string, now: number): boolean {
    if (ch.length !== 1 || ch === " ") return false;
    this.tick(now);
    if (this._status !== "running") return false;
    const word = this.words[this.idx];
    const pos = this.typed.length;
    const expected = pos < word.length ? word[pos] : " "; // typing past the end counts as a miss on "space"
    const stat = (this.keyStats[expected] ??= { hits: 0, misses: 0 });
    if (ch === expected) { this.hits++; stat.hits++; }
    else {
      this.misses++; stat.misses++;
      const row = (this.confusions[expected] ??= {});
      row[ch] = (row[ch] ?? 0) + 1;
    }
    this.typed += ch;
    return true;
  }

  backspace(now: number): boolean {
    this.tick(now);
    if (this._status !== "running" || this.typed.length === 0) return false;
    this.typed = this.typed.slice(0, -1);
    return true;
  }

  /** Space/Enter: judge the typed word. Returns null if nothing was typed or the game is not running. */
  submit(now: number): "correct" | "wrong" | null {
    this.tick(now);
    if (this._status !== "running" || this.typed.length === 0) return null;
    const word = this.words[this.idx];
    const at = this.elapsed(now);
    if (this.typed === word) {
      this.score += word.length * 10 * multiplierFor(this.combo);
      this.combo++;
      this.maxCombo = Math.max(this.maxCombo, this.combo);
      this.cleared++;
      this.correctChars += word.length;
      this.nextWord(at);
      return "correct";
    }
    this.combo = 0;
    this.missed++;
    this.nextWord(at);
    return "wrong";
  }

  pause(now: number) {
    if (this._status !== "running") return;
    this.tick(now);
    if (this._status !== "running") return;
    this._status = "paused";
    this.pausedAt = now;
  }

  resume(now: number) {
    if (this._status !== "paused") return;
    this.pausedTotal += now - this.pausedAt;
    this._status = "running";
  }

  snapshot(now: number): WordRushSnapshot {
    const e = this.elapsed(now);
    const budget = this.budget();
    return {
      status: this._status,
      score: this.score,
      combo: this.combo,
      multiplier: multiplierFor(this.combo),
      cleared: this.cleared,
      missed: this.missed,
      word: this.words[this.idx],
      typed: this.typed,
      wordBudgetMs: budget,
      wordTimeLeftMs: this._status === "idle" ? budget : Math.max(0, budget - (e - this.wordStart)),
      timeLeftMs: Math.max(0, this.seconds * 1000 - e),
      upcoming: this.words.slice(this.idx + 1, this.idx + 5),
    };
  }

  result(now: number): WordRushResult {
    const durationMs = this.elapsed(now);
    const mins = Math.max(durationMs, MIN_WPM_MS) / 60000;
    const total = this.hits + this.misses;
    const r1 = (n: number) => Math.round(n * 10) / 10;
    return {
      score: this.score,
      wpm: r1(this.correctChars / 5 / mins),
      rawWpm: r1(total / 5 / mins),
      accuracy: total === 0 ? 100 : r1((this.hits / total) * 100),
      errors: this.misses,
      cleared: this.cleared,
      missed: this.missed,
      maxCombo: this.maxCombo,
      durationMs,
      totalKeystrokes: total,
      keyStats: structuredClone(this.keyStats),
      confusions: structuredClone(this.confusions),
    };
  }
}
