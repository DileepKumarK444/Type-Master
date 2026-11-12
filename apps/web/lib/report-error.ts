/**
 * Single place errors are reported from the browser. By default it only logs to the console.
 * To plug in a monitoring service, set NEXT_PUBLIC_ERROR_ENDPOINT (receives a small JSON POST via sendBeacon) or
 * replace the body of this function with the vendor SDK call (e.g. Sentry.captureException).
 * We deliberately send no typing text, no account details and no stack for anything other than the error itself.
 */
export function reportError(error: unknown, context: string): void {
  const e = error instanceof Error ? error : new Error(String(error));
  const payload = { context, message: e.message, digest: (e as { digest?: string }).digest, stack: e.stack?.split("\n").slice(0, 8).join("\n"), path: typeof location !== "undefined" ? location.pathname : undefined, at: new Date().toISOString() };
  console.error("[typemaster]", payload);
  const endpoint = process.env.NEXT_PUBLIC_ERROR_ENDPOINT;
  if (endpoint && typeof navigator !== "undefined" && "sendBeacon" in navigator) {
    try { navigator.sendBeacon(endpoint, new Blob([JSON.stringify(payload)], { type: "application/json" })); } catch { /* never throw from the error handler */ }
  }
}
