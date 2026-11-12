/** "+4" / "−2" / "—" label and tone for a change between two periods. `prev` 0 means there is nothing to compare with. */
export function delta(current: number, previous: number, unit = ""): { text: string; tone: "up" | "down" | "flat" | "none" } {
  if (!previous) return { text: "—", tone: "none" };
  const d = Math.round((current - previous) * 10) / 10;
  if (d === 0) return { text: `no change`, tone: "flat" };
  return { text: `${d > 0 ? "+" : "−"}${Math.abs(d)}${unit}`, tone: d > 0 ? "up" : "down" };
}
