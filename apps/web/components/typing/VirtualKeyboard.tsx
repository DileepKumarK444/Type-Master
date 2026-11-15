import { cn } from "@/lib/utils";

/** A key: `id` is what we match against (the typed character, or a name for modifiers), `w` its width in key units. */
type K = { id: string; label?: string; w?: number };
const c = (id: string): K => ({ id });
const chars = (s: string): K[] => [...s].map(c);
const mod = (id: string, label: string, w: number): K => ({ id, label, w });

// Full ANSI QWERTY layout; every row is 15 units wide.
const ROWS: K[][] = [
  [...chars("`1234567890-="), mod("backspace", "Backspace", 2)],
  [mod("tab", "Tab", 1.5), ...chars("qwertyuiop[]"), { id: "\\", w: 1.5 }],
  [mod("caps", "Caps", 1.75), ...chars("asdfghjkl;'"), mod("enter", "Enter", 2.25)],
  [mod("shift-l", "Shift", 2.25), ...chars("zxcvbnm,./"), mod("shift-r", "Shift", 2.75)],
  [mod("ctrl-l", "Ctrl", 1.25), mod("os-l", "Win", 1.25), mod("alt-l", "Alt", 1.25), mod("space", "", 6.25),
    mod("alt-r", "Alt", 1.25), mod("os-r", "Win", 1.25), mod("menu", "Menu", 1.25), mod("ctrl-r", "Ctrl", 1.25)],
];

// finger zones (same colours as the approved prototype)
const FINGER_COLOR: Record<string, string> = {
  "`1qaz": "#f472b6", "2wsx": "#fb923c", "3edc": "#facc15", "4rfv5tgb": "#4ade80",
  "6yhn7ujm": "#38bdf8", "8ik,": "#facc15", "9ol.": "#fb923c", "0p;/-=[]'\\": "#f472b6",
};
const colorOf = (k: string) => (k.length === 1 ? Object.entries(FINGER_COLOR).find(([keys]) => keys.includes(k))?.[1] : undefined);

// shifted character → the key you press with Shift
const SHIFTED: Record<string, string> = {};
[..."~!@#$%^&*()_+{}|:\"<>?"].forEach((s, i) => { SHIFTED[s] = [..."`1234567890-=[]\\;',./"][i]; });

type Target = { id?: string; shift: boolean };

/** Which key (and whether Shift) a typed character needs. Enter is "\n", space is " ". */
function resolve(ch?: string): Target {
  if (!ch) return { shift: false };
  if (ch === " ") return { id: "space", shift: false };
  if (ch === "\n") return { id: "enter", shift: false };
  if (SHIFTED[ch]) return { id: SHIFTED[ch], shift: true };
  if (ch !== ch.toLowerCase()) return { id: ch.toLowerCase(), shift: true };
  return { id: ch, shift: false };
}

const lit = (t: Target, id: string) => t.id === id || (t.shift && id.startsWith("shift-"));

export function VirtualKeyboard({ next, pressed, fingers = true, highlight = [], heat }: {
  next?: string; pressed?: string; fingers?: boolean; highlight?: string[]; heat?: Record<string, number>;
}) {
  const nextKey = resolve(next);
  const pressedKey = resolve(pressed);

  const key = ({ id, label, w = 1 }: K) => {
    const isChar = id.length === 1;
    const color = fingers && !heat && isChar ? colorOf(id) : undefined;
    const a = isChar ? heat?.[id] : undefined;
    const heatStyle = a === undefined ? undefined : { backgroundColor: `color-mix(in srgb, rgb(var(--${a < 90 ? "bad" : a < 95 ? "warn" : "ok"})) ${a < 85 ? 65 : a < 90 ? 45 : a < 95 ? 35 : 18}%, rgb(var(--surface)))` };
    return (
      <div
        key={id}
        data-key={id}
        style={{
          width: `calc(var(--u) * ${w} + var(--gap) * ${w - 1})`,
          ...(heatStyle ?? (color ? { backgroundColor: `color-mix(in srgb, ${color} 22%, rgb(var(--surface)))` } : {})),
        }}
        title={a === undefined ? undefined : `${id.toUpperCase()}: ${Math.round(a)}% accurate`}
        className={cn(
          "relative grid h-[var(--u)] shrink-0 place-items-center rounded-md border border-line bg-surface2 text-muted transition-transform",
          isChar ? "font-mono text-[11px] uppercase lg:text-sm" : "text-[9px] font-semibold lg:text-[11px]",
          (fingers || heat) && isChar && "text-fg",
          isChar && "fj".includes(id) && "after:absolute after:bottom-1 after:h-0.5 after:w-3 after:rounded after:bg-current after:opacity-60",
          lit(nextKey, id) && "!bg-accent -translate-y-0.5 !text-white [[data-theme=dark]_&]:!text-bg",
          lit(pressedKey, id) && "translate-y-0.5 brightness-75",
          isChar && highlight.includes(id) && "ring-2 ring-accent ring-offset-1 ring-offset-surface",
        )}
      >
        {label ?? (isChar ? id : "")}
      </div>
    );
  };

  return (
    <div className="flex flex-col items-center gap-[var(--gap)] [--gap:0.25rem] [--u:2.2rem] lg:[--u:2.75rem]" aria-hidden="true">
      {ROWS.map((r, i) => <div key={i} className="flex gap-[var(--gap)]">{r.map(key)}</div>)}
    </div>
  );
}
