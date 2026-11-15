"use client";
import { Fragment, memo, useEffect, useMemo, useRef, useState } from "react";
import type { TypingSession } from "@typemaster/typing-engine";
import { cn } from "@/lib/utils";

type Props = {
  session: TypingSession;
  onChar: (ch: string) => void;
  onBackspace: () => void;
  onFocusChange: (focused: boolean) => void;
  onRestart: () => void;
  /** bump value so the surface re-reads the session */
  version: number;
  /** focus on mount (default). Disable when the surface is embedded in a page that should not jump. */
  autoFocus?: boolean;
};

/**
 * One word. Most words are either untouched or entirely correct, and render as a single element; only the word
 * under the cursor (or one containing a mistake) is split into per-character spans. This keeps the DOM small
 * (a 60s test is ~270 words), which matters: the first style pass over ~1,700 spans cost ~850 ms on mobile.
 */
const glyph = (c: string) => (c === "\n" ? "↵" : c); // code practice: Enter is shown as ↵, then the line breaks

const Word = memo(function Word({ chars, states, cursor }: { chars: string; states: string; cursor: number }) {
  if (cursor === -1 && /^0+$/.test(states)) return <span className="inline-block whitespace-pre text-muted">{[...chars].map(glyph).join("")}</span>;
  if (cursor === -1 && /^1+$/.test(states)) return <span className="inline-block whitespace-pre text-fg">{[...chars].map(glyph).join("")}</span>;
  return (
    <span className="inline-block whitespace-pre">
      {[...chars].map((c, i) => {
        const s = states[i];
        return (
          <span
            key={i}
            data-cursor={cursor === i ? "" : undefined}
            className={cn(
              "rounded-[3px]",
              s === "0" && "text-muted",
              s === "1" && "text-fg",
              s === "2" && "bg-bad/15 text-bad underline decoration-bad",
              cursor === i && "bg-accent-soft shadow-[0_2px_0_rgb(var(--accent))]",
            )}
          >
            {glyph(c)}
          </span>
        );
      })}
    </span>
  );
});

/** Words rendered beyond the cursor. Far more than the three visible lines, but a fraction of the whole text. */
const LOOKAHEAD_WORDS = 80;

/**
 * Typing input surface. A hidden <input> captures keys via `beforeinput` so desktop keyboards,
 * mobile soft keyboards and IMEs all go through one path.
 */
export function TypingSurface({ session, onChar, onBackspace, onFocusChange, onRestart, version, autoFocus = true }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const tabArmed = useRef(false);
  const [focused, setFocused] = useState(false);

  const words = useMemo(() => {
    const out: { chars: string; offset: number }[] = [];
    // Every character belongs to exactly one chunk: a word plus one trailing whitespace, or a run of whitespace (indentation).
    for (const m of session.text.matchAll(/\S+\s?|\s+/g)) out.push({ chars: m[0], offset: m.index ?? 0 });
    return out;
  }, [session]);

  // Render only up to the furthest word reached plus a lookahead; the window never shrinks (no layout jumps).
  const reached = useRef(0);
  let cursorWord = reached.current;
  while (cursorWord < words.length - 1 && words[cursorWord + 1].offset <= session.index) cursorWord++;
  while (cursorWord > 0 && words[cursorWord].offset > session.index) cursorWord--;
  reached.current = Math.max(reached.current, cursorWord);
  const visibleWords = words.slice(0, Math.min(words.length, reached.current + LOOKAHEAD_WORDS));

  // Keep the handlers current without re-binding the native listener.
  const handlers = useRef({ onChar, onBackspace });
  handlers.current = { onChar, onBackspace };

  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    if (autoFocus) el.focus({ preventScroll: true });
    const before = (e: InputEvent) => {
      e.preventDefault();
      if (e.inputType === "insertText" && e.data) [...e.data].forEach((c) => handlers.current.onChar(c));
      else if (e.inputType === "deleteContentBackward") handlers.current.onBackspace();
    };
    el.addEventListener("beforeinput", before);
    return () => el.removeEventListener("beforeinput", before);
  }, [session, autoFocus]);

  // Keep the cursor on the second visible line.
  useEffect(() => {
    const box = boxRef.current;
    const cur = box?.querySelector<HTMLElement>("[data-cursor]");
    if (!box || !cur) return;
    const line = parseFloat(getComputedStyle(box).lineHeight) || 48;
    box.scrollTop = Math.max(0, cur.offsetTop - line);
  }, [version]);

  const setFocus = (f: boolean) => { setFocused(f); onFocusChange(f); };

  return (
    <div className="relative" onClick={() => inputRef.current?.focus()}>
      <input
        ref={inputRef}
        aria-label="Typing input"
        className="absolute left-0 top-0 h-px w-px opacity-0"
        autoCapitalize="off" autoComplete="off" autoCorrect="off" spellCheck={false}
        onFocus={() => setFocus(true)}
        onBlur={() => setFocus(false)}
        onKeyDown={(e) => {
          if (e.key === "Escape") inputRef.current?.blur();
          else if (e.key === "Tab") { e.preventDefault(); tabArmed.current = true; }
          else if (e.key === "Enter" && tabArmed.current) { tabArmed.current = false; onRestart(); }
          else if (e.key === "Enter") {
            tabArmed.current = false;
            if (session.nextChar === "\n") { e.preventDefault(); handlers.current.onChar("\n"); } // code practice: Enter is a typed character
          } else tabArmed.current = false;
        }}
      />
      <div
        ref={boxRef}
        role="textbox" aria-readonly="true" aria-label="Text to type"
        className={cn(
          "h-[7.75rem] select-none overflow-hidden rounded-token border-2 px-5 py-1 font-mono text-xl leading-[2.5rem] tracking-wide sm:text-2xl",
          focused ? "border-accent" : "border-dashed border-line",
        )}
      >
        {visibleWords.map((w) => {
          const cursor = session.index >= w.offset && session.index < w.offset + w.chars.length ? session.index - w.offset : -1;
          return (
            <Fragment key={w.offset}>
              <Word chars={w.chars} states={session.stateString(w.offset, w.offset + w.chars.length)} cursor={cursor} />
              {w.chars.endsWith("\n") && <br />}
            </Fragment>
          );
        })}
      </div>
      {!focused && session.status !== "finished" && (
        <div className="absolute inset-0 grid cursor-text place-items-center rounded-token bg-bg/70 backdrop-blur-[2px]">
          <span className="rounded-full bg-surface px-4 py-2 text-sm font-semibold shadow">
            {session.status === "paused" ? "Paused — click or press any key to continue" : "Click here or start typing"}
          </span>
        </div>
      )}
    </div>
  );
}
