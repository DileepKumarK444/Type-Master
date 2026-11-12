"use client";
import { useEffect } from "react";
import { reportError } from "@/lib/report-error";

/** Last-resort boundary: replaces the whole page, so it must bring its own <html> and minimal styling. */
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => reportError(error, "global-error"), [error]);
  return (
    <html lang="en">
      <body style={{ fontFamily: "system-ui, sans-serif", display: "grid", placeItems: "center", minHeight: "100vh", margin: 0, padding: 24, textAlign: "center" }}>
        <main>
          <h1 style={{ fontSize: 24 }}>Something went wrong</h1>
          <p style={{ color: "#555" }}>Sorry about that. Your typing history is safe.</p>
          <button onClick={reset} style={{ padding: "10px 20px", fontSize: 16, borderRadius: 8, border: 0, background: "#2f5bea", color: "#fff", cursor: "pointer" }}>Try again</button>
        </main>
      </body>
    </html>
  );
}
