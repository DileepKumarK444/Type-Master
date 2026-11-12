import clsx, { type ClassValue } from "clsx";

export const cn = (...v: ClassValue[]) => clsx(v);

/** Clamp a number into [min, max]. */
export const clamp = (n: number, min = 0, max = 100) => Math.min(max, Math.max(min, n));
