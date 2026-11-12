import type { RewardsView } from "@/components/ui/RewardsPanel";
import type { SessionPayload } from "@/lib/session-payload";

/**
 * Client persistence (docs/07 §13b):
 *  - guest results live in localStorage until sign-up, then are merged via /api/guest/import
 *  - signed-in results are queued in an outbox and retried until the server accepts them
 * Every storage access is guarded: storage can be unavailable (private mode, blocked site data).
 */
const OUTBOX = "tm-outbox-v1";
const GUEST = "tm-guest-v1";
const MAX = 20;
export const MIN_SAVE_SECONDS = 10;

export type SaveState = "guest" | "saving" | "saved" | "failed" | "skipped";
export interface SaveResult { state: SaveState; id?: string; personalBest?: boolean; previousBest?: number | null; rewards?: RewardsView }

const read = (k: string): SessionPayload[] => {
  try { const v = JSON.parse(localStorage.getItem(k) ?? "[]"); return Array.isArray(v) ? v : []; } catch { return []; }
};
const write = (k: string, v: SessionPayload[]) => { try { localStorage.setItem(k, JSON.stringify(v.slice(-MAX))); } catch { /* ignore */ } };
const push = (k: string, p: SessionPayload) => { const all = read(k); if (!all.some((x) => x.clientId === p.clientId)) write(k, [...all, p]); };

export const guestResults = () => read(GUEST);
export const pendingCount = () => read(OUTBOX).length;

type Server = { id?: string; personalBest?: boolean; previousBest?: number | null; rewards?: RewardsView };
const responses = new Map<string, Server>(); // clientId -> server reply for items sent in this page session

let flushing: Promise<void> | null = null;

/** Sends queued results. Keeps items on network/auth/server errors; drops ones the server rejects as invalid. */
export function flushOutbox(): Promise<void> {
  flushing ??= (async () => {
    for (const item of read(OUTBOX)) {
      let status = 0;
      try {
        const res = await fetch("/api/sessions", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(item) });
        status = res.status;
        if (res.ok) responses.set(item.clientId, await res.json());
      } catch { return; } // offline: try again later
      if (status === 401 || status === 429 || status >= 500) return;
      write(OUTBOX, read(OUTBOX).filter((x) => x.clientId !== item.clientId)); // saved, duplicate, or permanently invalid (400/422)
    }
  })().finally(() => { flushing = null; });
  return flushing;
}

export async function saveResult(p: SessionPayload, signedIn: boolean): Promise<SaveResult> {
  if (p.durationS < MIN_SAVE_SECONDS) return { state: "skipped" };
  if (!signedIn) { push(GUEST, p); return { state: "guest" }; }
  push(OUTBOX, p);
  await flushOutbox();
  const stillQueued = read(OUTBOX).some((x) => x.clientId === p.clientId);
  return stillQueued ? { state: "failed" } : { state: "saved", ...responses.get(p.clientId) };
}

/** After login/sign-up: merge any guest results into the account. */
export async function importGuest(): Promise<number> {
  const sessions = guestResults();
  if (sessions.length === 0) return 0;
  try {
    const res = await fetch("/api/guest/import", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ sessions }) });
    if (!res.ok) return 0;
    write(GUEST, []);
    return ((await res.json()) as { imported: number }).imported;
  } catch { return 0; }
}
