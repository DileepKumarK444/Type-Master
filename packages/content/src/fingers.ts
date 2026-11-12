const GROUPS: [string, string][] = [
  ["1qaz", "Left pinky"], ["2wsx", "Left ring"], ["3edc", "Left middle"], ["45rtfgvb", "Left index"],
  ["67yuhjnm", "Right index"], ["8ik,", "Right middle"], ["9ol.", "Right ring"], ["0p;/'-", "Right pinky"],
];

/** Which finger types a key on QWERTY (touch-typing standard). Undefined for keys we do not teach. */
export function fingerName(key: string): string | undefined {
  const k = key.toLowerCase();
  return GROUPS.find(([keys]) => keys.includes(k))?.[1];
}
