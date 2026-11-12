/**
 * Framework-free typing session (decision D-007). All time is injected (`now` in ms)
 * so behaviour is deterministic and testable.
 *
 * Definitions (docs/07-technical-architecture.md §3):
 *  - WPM        = (correct characters currently in the text / 5) / minutes
 *  - Raw WPM    = (all keystrokes / 5) / minutes
 *  - Accuracy   = correct keystrokes / total keystrokes (backspace excluded)
 *  - Consistency= 100 * (1 - stddev/mean) of per-second typing speed, clamped 0..100
 */

export type CharState = 0 | 1 | 2; // 0 pending, 1 correct, 2 incorrect
export type Status = "idle" | "running" | "paused" | "finished";
export type SessionMode = { kind: "time"; seconds: number } | { kind: "text" };

export interface SessionConfig {
  text: string;
  mode: SessionMode;
}

export interface KeyStat {
  hits: number;
  misses: number;
}

export interface Snapshot {
  status: Status;
  index: number;
  elapsedMs: number;
  remainingMs: number | null;
  wpm: number;
  rawWpm: number;
  accuracy: number;
  errors: number;
}

export interface SessionResult extends Snapshot {
  consistency: number;
  correctChars: number;
  totalKeystrokes: number;
  durationMs: number;
  keyStats: Record<string, KeyStat>;
  /** expected key -> (typed char -> count), for "you hit V instead of C" feedback */
  confusions: Record<string, Record<string, number>>;
  wpmSeries: number[];
}

/** Minimum time used as denominator so the first keystrokes do not show absurd WPM. */
const MIN_WPM_MS = 1000;

export class TypingSession {
  readonly text: string;
  readonly mode: SessionMode;

  private states: CharState[];
  private _index = 0;
  private _status: Status = "idle";
  private startedAt = 0;
  private pausedAt = 0;
  private pausedTotal = 0;
  private finishedElapsed = 0;
  private correctKeys = 0;
  private totalKeys = 0;
  private mistakes = 0;
  private keyStats: Record<string, KeyStat> = {};
  private confusions: Record<string, Record<string, number>> = {};
  private buckets: number[] = []; // correct keystrokes per elapsed second

  constructor(config: SessionConfig) {
    if (config.mode.kind === "time" && config.mode.seconds <= 0) throw new Error("seconds must be > 0");
    this.text = config.text;
    this.mode = config.mode;
    this.states = new Array<CharState>(config.text.length).fill(0);
  }

  get status(): Status { return this._status; }
  get index(): number { return this._index; }
  get length(): number { return this.text.length; }
  get nextChar(): string | undefined { return this.text[this._index]; }

  /** Compact state string for a range, e.g. "1120" (used by renderers). */
  stateString(from: number, to: number): string { return this.states.slice(from, to).join(""); }

  elapsed(now: number): number {
    if (this._status === "idle") return 0;
    if (this._status === "finished") return this.finishedElapsed;
    const ref = this._status === "paused" ? this.pausedAt : now;
    return Math.max(0, ref - this.startedAt - this.pausedTotal);
  }

  /** Feed one typed character. Returns false if ignored. */
  input(ch: string, now: number): boolean {
    if (this._status === "finished" || this._status === "paused" || ch.length !== 1) return false;
    if (this._status === "idle") this.start(now);
    if (this.expire(now)) return false;
    if (this._index >= this.text.length) return false;

    const expected = this.text[this._index];
    const ok = ch === expected;
    this.states[this._index] = ok ? 1 : 2;
    this._index++;
    this.totalKeys++;
    const stat = (this.keyStats[expected.toLowerCase()] ??= { hits: 0, misses: 0 });
    if (ok) {
      this.correctKeys++;
      stat.hits++;
      const sec = Math.floor(this.elapsed(now) / 1000);
      this.buckets[sec] = (this.buckets[sec] ?? 0) + 1;
    } else {
      this.mistakes++;
      stat.misses++;
      const row = (this.confusions[expected.toLowerCase()] ??= {});
      row[ch] = (row[ch] ?? 0) + 1;
    }
    if (this._index >= this.text.length) this.finish(now);
    return true;
  }

  /** Delete the previous character. Does not change keystroke/accuracy counts. */
  backspace(now: number): boolean {
    if (this._status !== "running" || this._index === 0) return false;
    if (this.expire(now)) return false;
    this._index--;
    this.states[this._index] = 0;
    return true;
  }

  /** Call periodically; ends time-limited sessions. Returns true if the session just finished. */
  tick(now: number): boolean {
    return this._status === "running" ? this.expire(now) : false;
  }

  pause(now: number): void {
    if (this._status !== "running") return;
    this._status = "paused";
    this.pausedAt = now;
  }

  resume(now: number): void {
    if (this._status !== "paused") return;
    this.pausedTotal += now - this.pausedAt;
    this._status = "running";
  }

  snapshot(now: number): Snapshot {
    const elapsedMs = this.elapsed(now);
    const mins = Math.max(elapsedMs, MIN_WPM_MS) / 60000;
    const idle = this._status === "idle";
    const correctChars = this.countCorrect();
    return {
      status: this._status,
      index: this._index,
      elapsedMs,
      remainingMs: this.mode.kind === "time" ? Math.max(0, this.mode.seconds * 1000 - elapsedMs) : null,
      wpm: idle ? 0 : round1(correctChars / 5 / mins),
      rawWpm: idle ? 0 : round1(this.totalKeys / 5 / mins),
      accuracy: this.totalKeys === 0 ? 100 : round1((this.correctKeys / this.totalKeys) * 100),
      errors: this.mistakes,
    };
  }

  result(now: number): SessionResult {
    const snap = this.snapshot(now);
    const seconds = Math.floor(snap.elapsedMs / 1000);
    const perSecond: number[] = [];
    for (let s = 0; s < seconds; s++) perSecond.push((this.buckets[s] ?? 0) * 12); // chars/s * 60 / 5
    const series: number[] = [];
    let cum = 0;
    for (let s = 0; s < seconds; s++) {
      cum += this.buckets[s] ?? 0;
      series.push(round1(cum / 5 / ((s + 1) / 60)));
    }
    return {
      ...snap,
      consistency: consistency(perSecond),
      correctChars: this.countCorrect(),
      totalKeystrokes: this.totalKeys,
      durationMs: snap.elapsedMs,
      keyStats: structuredClone(this.keyStats),
      confusions: structuredClone(this.confusions),
      wpmSeries: series,
    };
  }

  // ---- internals ----
  private start(now: number) {
    this._status = "running";
    this.startedAt = now;
  }

  private expire(now: number): boolean {
    if (this.mode.kind !== "time") return false;
    const limit = this.mode.seconds * 1000;
    if (this.elapsed(now) >= limit) {
      this.finishWith(limit);
      return true;
    }
    return false;
  }

  private finish(now: number) {
    const e = this.elapsed(now);
    this.finishWith(this.mode.kind === "time" ? Math.min(e, this.mode.seconds * 1000) : e);
  }

  private finishWith(elapsedMs: number) {
    this.finishedElapsed = elapsedMs;
    this._status = "finished";
  }

  private countCorrect(): number {
    let n = 0;
    for (const s of this.states) if (s === 1) n++;
    return n;
  }
}

export function consistency(perSecond: number[]): number {
  if (perSecond.length < 2) return 100;
  const mean = perSecond.reduce((a, b) => a + b, 0) / perSecond.length;
  if (mean === 0) return 0;
  const variance = perSecond.reduce((a, b) => a + (b - mean) ** 2, 0) / perSecond.length;
  return Math.round(Math.min(100, Math.max(0, 100 * (1 - Math.sqrt(variance) / mean))));
}

const round1 = (n: number) => Math.round(n * 10) / 10;
