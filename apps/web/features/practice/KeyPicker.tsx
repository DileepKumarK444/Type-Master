"use client";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { TEMPLATE_GROUPS, templateInfo, templateText, type TemplateInfo } from "@typemaster/content";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Tabs } from "@/components/ui/Tabs";
import { cn } from "@/lib/utils";

export type KeyStat = { accuracy: number; attempts: number };
const MIN_ATTEMPTS = 10; // below this the accuracy is not meaningful yet
const QWERTY = ["qwertyuiop", "asdfghjkl", "zxcvbnm"];
const QUICK = ["row:home", "row:top", "row:bottom", "hand:left", "hand:right", "finger:left-pinky", "finger:right-index", "vowels"];
const FREE_LENGTHS: (number | null)[] = [25, 50, 100, null];

const tone = (a: number) => (a >= 97 ? "ok" : a >= 93 ? "warn" : "bad");
const toneClass = { ok: "bg-ok/10 text-ok", warn: "bg-warn/10 text-warn", bad: "bg-bad/10 text-bad" } as const;
const barClass = { ok: "bg-ok", warn: "bg-warn", bad: "bg-bad" } as const;

function Tile({ info, stat, selected, onSelect }: { info: TemplateInfo; stat?: KeyStat; selected: boolean; onSelect: () => void }) {
  const ch = info.keys![0];
  const known = !!stat && stat.attempts >= MIN_ATTEMPTS;
  const t = known ? tone(stat.accuracy) : null;
  return (
    <button
      type="button" onClick={onSelect} aria-pressed={selected}
      aria-label={`Key ${/[a-z]/.test(ch) ? ch.toUpperCase() : ch}${known ? `, ${Math.round(stat.accuracy)}% accurate` : ", not enough data yet"}`}
      className={cn("rounded-[10px] border border-line px-1 py-2 text-center transition", t ? toneClass[t] : "bg-surface2 text-muted", selected && "outline outline-[3px] outline-offset-1 outline-accent")}
    >
      <div className="font-mono text-xl font-bold uppercase leading-tight text-fg">{ch}</div>
      <div className="text-[11px] font-bold">{known ? `${Math.round(stat.accuracy)}%` : "—"}</div>
      <div className="mx-1.5 mt-1 h-1 overflow-hidden rounded-full bg-surface2"><div className={cn("h-full", t ? barClass[t] : "")} style={{ width: known ? `${stat.accuracy}%` : 0 }} /></div>
    </button>
  );
}

export function KeyPicker({ stats }: { stats: Record<string, KeyStat> }) {
  const router = useRouter();
  const [group, setGroup] = useState("letters");
  const [selected, setSelected] = useState("key:e");
  const [mode, setMode] = useState<"free" | 30 | 60>("free");
  const [words, setWords] = useState<number | null>(50);

  const info = templateInfo(selected)!;
  const g = TEMPLATE_GROUPS.find((x) => x.id === group)!;
  const preview = useMemo(() => templateText(selected, 1, info.kind === "code" ? 10 : 14), [selected, info.kind]);
  const stat = info.keys?.length === 1 ? stats[info.keys[0]] : undefined;
  const byKey = (c: string) => TEMPLATE_GROUPS[0].items.find((i) => i.keys![0] === c)!;

  const start = () => router.push(`/app/practice?t=${encodeURIComponent(selected)}&m=${mode}&w=${words ?? "endless"}`);

  return (
    <div className="grid items-start gap-4 lg:grid-cols-[1fr_340px]">
      <div className="space-y-4">
        <div role="tablist" aria-label="Template groups" className="inline-flex flex-wrap gap-0.5 rounded-token bg-surface2 p-1">
          {TEMPLATE_GROUPS.map((x) => (
            <button key={x.id} role="tab" aria-selected={x.id === group} onClick={() => setGroup(x.id)}
              className={cn("rounded-[7px] px-4 py-1.5 text-sm font-semibold", x.id === group ? "bg-surface text-fg shadow-sm" : "text-muted")}>{x.label}</button>
          ))}
        </div>

        <Card className="space-y-4 p-5">
          {group === "letters" && (
            <>
              <div className="flex items-center justify-between gap-2"><h2 className="font-bold">Your accuracy per letter</h2><span className="text-xs text-muted">green 97%+ · amber 93–96% · red under 93%</span></div>
              <div className="flex flex-col items-center gap-2">
                {QWERTY.map((row, i) => (
                  <div key={row} className="flex gap-1.5" style={{ marginLeft: i * 20 }}>
                    {[...row].map((c) => <div key={c} className="w-11 sm:w-14"><Tile info={byKey(c)} stat={stats[c]} selected={selected === `key:${c}`} onSelect={() => setSelected(`key:${c}`)} /></div>)}
                  </div>
                ))}
              </div>
              <div>
                <div className="mb-2 text-xs text-muted">Quick templates</div>
                <div className="flex flex-wrap gap-2">
                  {QUICK.map((id) => (
                    <button key={id} type="button" aria-pressed={selected === id} onClick={() => setSelected(id)}
                      className={cn("rounded-full border px-3 py-1.5 text-sm font-semibold", selected === id ? "border-accent bg-accent text-white [[data-theme=dark]_&]:text-bg" : "border-line bg-surface")}>{templateInfo(id)!.label}</button>
                  ))}
                </div>
              </div>
            </>
          )}
          {(group === "numbers" || group === "symbols") && (
            <>
              <h2 className="font-bold">{group === "numbers" ? "Number keys" : "Symbol keys"}</h2>
              <div className="grid grid-cols-5 gap-2 sm:grid-cols-8">
                {g.items.filter((i) => i.keys?.length === 1 && i.id.startsWith("key:")).map((i) => (
                  <Tile key={i.id} info={i} stat={stats[i.keys![0]]} selected={selected === i.id} onSelect={() => setSelected(i.id)} />
                ))}
              </div>
              {group === "numbers" && (
                <button type="button" aria-pressed={selected === "row:numbers"} onClick={() => setSelected("row:numbers")}
                  className={cn("rounded-full border px-3 py-1.5 text-sm font-semibold", selected === "row:numbers" ? "border-accent bg-accent text-white [[data-theme=dark]_&]:text-bg" : "border-line bg-surface")}>Whole number row</button>
              )}
            </>
          )}
          {!["letters", "numbers", "symbols"].includes(group) && (
            <div className="grid gap-2 sm:grid-cols-2">
              {g.items.map((i) => (
                <button key={i.id} type="button" aria-pressed={selected === i.id} onClick={() => setSelected(i.id)}
                  className={cn("rounded-token border p-3 text-left", selected === i.id ? "border-2 border-accent bg-accent-soft" : "border-line bg-surface hover:bg-surface2")}>
                  <div className="font-bold">{i.label}</div>
                  <div className="mt-0.5 font-mono text-xs text-muted">{i.blurb}</div>
                </button>
              ))}
            </div>
          )}
        </Card>
      </div>

      <Card className="space-y-3 p-5 lg:sticky lg:top-4" aria-label="Selected template">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-xl font-bold">{info.label}</h2>
          {stat && stat.attempts >= MIN_ATTEMPTS && <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-bold", toneClass[tone(stat.accuracy)])}>{Math.round(stat.accuracy)}% accurate</span>}
        </div>
        <p className="text-sm text-muted">
          {info.keys?.length === 1
            ? stat ? `${stat.attempts.toLocaleString()} keystrokes so far` : "No data on this key yet — practise it to start tracking."
            : info.blurb}
        </p>
        <pre className="max-h-40 overflow-auto whitespace-pre-wrap rounded-token border border-line bg-surface p-3 font-mono text-sm" aria-label="Preview">{preview}</pre>
        <div>
          <div className="mb-1.5 text-xs text-muted">Mode</div>
          <Tabs items={["30s", "60s", "No timer"]} defaultIndex={2} onChange={(i) => setMode(i === 2 ? "free" : i === 0 ? 30 : 60)} />
        </div>
        {mode === "free" && (
          <div>
            <div className="mb-1.5 text-xs text-muted">Length</div>
            <Tabs items={["25 words", "50 words", "100 words", "Endless"]} defaultIndex={1} onChange={(i) => setWords(FREE_LENGTHS[i])} />
          </div>
        )}
        {mode === "free" && <p className="text-xs text-muted">No timer: saved to your history and key accuracy, but no XP.</p>}
        <Button size="lg" className="w-full" onClick={start}>Start practising {info.keys?.length === 1 ? info.keys[0].toUpperCase() : ""}</Button>
      </Card>
    </div>
  );
}
