"use client";
import { useEffect } from "react";
import { flushOutbox, importGuest } from "@/lib/client/outbox";

/** Mounted inside the authenticated shell: merges guest results and retries unsent ones. */
export function SyncOnLogin() {
  useEffect(() => {
    void importGuest().then(() => flushOutbox());
  }, []);
  return null;
}
