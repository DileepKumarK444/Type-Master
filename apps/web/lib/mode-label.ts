import type { SessionMode } from "@typemaster/db";

/** Human-readable description of a stored session ("Test · 60s · punct.", "Lesson 4", "Word Rush"). */
export function modeLabel(type: string, mode: SessionMode, long = false): string {
  if ("lessonId" in mode) return `Lesson ${mode.lessonId}`;
  if ("game" in mode) return "Word Rush";
  if ("free" in mode) return `Free practice · ${mode.words ? `${mode.words} words` : "endless"}`;
  const extras = [mode.punctuation && (long ? "punctuation" : "punct."), mode.numbers && (long ? "numbers" : "nums")].filter(Boolean);
  const kind = type === "drill" ? (long ? "Key practice" : "Drill") : long ? "Timed test" : "Test";
  return [kind, `${mode.seconds}s`, ...extras].join(" · ");
}
