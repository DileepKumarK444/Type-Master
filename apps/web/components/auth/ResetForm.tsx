"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

const input = "w-full rounded-token border border-line bg-surface px-3.5 py-2.5 outline-none focus:border-accent focus:ring-2 focus:ring-accent/30";

export function ResetForm({ token }: { token: string }) {
  const router = useRouter();
  const [error, setError] = useState<string>();
  const [expired, setExpired] = useState(false);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const password = String(f.get("password") ?? "");
    if (password !== String(f.get("confirm") ?? "")) { setError("The two passwords don’t match."); return; }
    setError(undefined); setBusy(true);
    try {
      const res = await fetch("/api/auth/reset", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ token, password }) });
      if (res.ok) { router.push("/login?reset=1"); return; }
      const body = await res.json().catch(() => ({}));
      if (res.status === 429) setError("Too many attempts. Please wait a few minutes and try again.");
      else if (body.error === "weak_password") setError(body.fields?.password?.[0] ?? "Choose a stronger password.");
      else setExpired(true);
    } catch {
      setError("Network problem. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  if (expired) return <InvalidLink />;
  return (
    <Card className="mx-auto w-full max-w-md space-y-4 p-7">
      <h1 className="text-2xl font-bold">Choose a new password</h1>
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <label className="block text-sm font-semibold">New password
          <input name="password" type="password" autoComplete="new-password" required minLength={8} className={`${input} mt-1.5 font-normal`} />
          <span className="text-xs font-normal text-muted">8–72 characters. Very common passwords (like 12345678) aren’t allowed.</span>
        </label>
        <label className="block text-sm font-semibold">Confirm new password
          <input name="confirm" type="password" autoComplete="new-password" required minLength={8} className={`${input} mt-1.5 font-normal`} />
        </label>
        {error && <p role="alert" className="rounded-token bg-bad/10 px-3 py-2 text-sm text-bad">{error}</p>}
        <Button type="submit" size="lg" className="w-full" disabled={busy}>{busy ? "Saving…" : "Update password"}</Button>
      </form>
      <p className="text-xs text-muted">For your security, updating your password signs you out everywhere else.</p>
    </Card>
  );
}

export function InvalidLink() {
  return (
    <Card className="mx-auto w-full max-w-md space-y-3 p-7 text-center" role="alert">
      <h1 className="text-2xl font-bold">This link isn’t valid any more</h1>
      <p className="text-muted">Reset links work once and expire after 60 minutes. Request a new one and we’ll email it right away.</p>
      <Link href="/forgot-password" className="inline-flex items-center justify-center rounded-token bg-accent px-5 py-3 font-semibold text-white [[data-theme=dark]_&]:text-bg">Request a new link</Link>
    </Card>
  );
}
