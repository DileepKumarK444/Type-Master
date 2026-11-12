import { cn } from "@/lib/utils";

const ROWS = ["1234567890", "qwertyuiop", "asdfghjkl;", "zxcvbnm,./"];
const INDENT = [0, 16, 30, 52];

// finger index → colour (same zones as the approved prototype)
const FINGER_COLOR: Record<string, string> = {
  "1qaz": "#f472b6", "2wsx": "#fb923c", "3edc": "#facc15", "4rfv5tgb": "#4ade80",
  "6yhn7ujm": "#38bdf8", "8ik,": "#facc15", "9ol.": "#fb923c", "0p;/": "#f472b6",
};
const colorOf = (k: string) => Object.entries(FINGER_COLOR).find(([keys]) => keys.includes(k))?.[1];

export function VirtualKeyboard({ next, pressed, fingers = true, highlight = [], heat }: { next?: string; pressed?: string; fingers?: boolean; highlight?: string[]; heat?: Record<string, number> }) {
  const n = next?.toLowerCase();
  const key = (k: string, extra?: string) => {
    const color = fingers && !heat ? colorOf(k) : undefined;
    const a = heat?.[k];
    const heatStyle = a === undefined ? undefined : { backgroundColor: `color-mix(in srgb, rgb(var(--${a < 90 ? "bad" : a < 95 ? "warn" : "ok"})) ${a < 85 ? 65 : a < 90 ? 45 : a < 95 ? 35 : 18}%, rgb(var(--surface)))` };
    return (
      <div
        key={k}
        data-key={k}
        style={heatStyle ?? (color ? { backgroundColor: `color-mix(in srgb, ${color} 22%, rgb(var(--surface)))` } : undefined)}
        title={a === undefined ? undefined : `${k.toUpperCase()}: ${Math.round(a)}% accurate`}
        className={cn(
          "relative grid h-9 w-9 place-items-center rounded-lg border border-line bg-surface2 font-mono text-xs uppercase text-muted transition-transform lg:h-11 lg:w-11 lg:text-sm",
          (fingers || heat) && "text-fg",
          "fj".includes(k) && "after:absolute after:bottom-1 after:h-0.5 after:w-3 after:rounded after:bg-current after:opacity-60",
          n === k && "!bg-accent -translate-y-0.5 !text-white [[data-theme=dark]_&]:!text-bg",
          pressed?.toLowerCase() === k && "translate-y-0.5 brightness-75",
          highlight.includes(k) && "ring-2 ring-accent ring-offset-1 ring-offset-surface",
          extra,
        )}
      >
        {k === " " ? "" : k}
      </div>
    );
  };
  return (
    <div className="flex flex-col items-center gap-1.5" aria-hidden="true">
      {ROWS.map((r, i) => (
        <div key={r} className="flex gap-1.5" style={{ marginLeft: INDENT[i] }}>{[...r].map((k) => key(k))}</div>
      ))}
      <div className="flex">{key(" ", "!w-52 lg:!w-72")}</div>
    </div>
  );
}
