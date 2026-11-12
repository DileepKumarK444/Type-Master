"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

/** Only ever return a same-origin path (middleware passes an absolute URL; anything off-site falls back to /app). */
function safePath(p?: string): string {
  if (!p) return "/app";
  try {
    const u = new URL(p, window.location.origin);
    return u.origin === window.location.origin && u.pathname.startsWith("/") ? u.pathname + u.search : "/app";
  } catch {
    return "/app";
  }
}
const input = "w-full rounded-token border border-line bg-surface px-3.5 py-2.5 outline-none focus:border-accent focus:ring-2 focus:ring-accent/30";

export function AuthForm({ mode, googleEnabled, callbackUrl, notice }: { mode: "login" | "register"; googleEnabled: boolean; callbackUrl?: string; notice?: string }) {
  const router = useRouter();
  const [error, setError] = useState<string>();
  const [fields, setFields] = useState<Record<string, string[]>>({});
  const [busy, setBusy] = useState(false);
  const reg = mode === "register";

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(undefined); setFields({}); setBusy(true);
    const f = new FormData(e.currentTarget);
    const email = String(f.get("email") ?? "").trim();
    const password = String(f.get("password") ?? "");
    try {
      if (reg) {
        const res = await fetch("/api/auth/register", {
          method: "POST", headers: { "content-type": "application/json" },
          body: JSON.stringify({ name: String(f.get("name") ?? ""), email, password }),
        });
        if (res.status === 409) { setError("That email is already registered. Log in instead?"); return; }
        if (res.status === 429) { setError("Too many attempts. Please try again later."); return; }
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          setFields(body.fields ?? {}); setError("Please fix the highlighted fields."); return;
        }
      }
      const r = await signIn("credentials", { email, password, redirect: false });
      if (r?.error) { setError(reg ? "Account created, but sign-in failed. Try logging in." : "Incorrect email or password."); return; }
      router.push(safePath(callbackUrl));
      router.refresh();
    } catch {
      setError("Network problem. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="mx-auto w-full max-w-md space-y-4 p-7">
      <h1 className="text-2xl font-bold">{reg ? "Create your account" : "Welcome back"}</h1>
      {notice && <p role="status" className="rounded-token bg-ok/10 px-3 py-2 text-sm text-ok">{notice}</p>}
      {googleEnabled && (
        <>
          <Button variant="secondary" className="w-full" onClick={() => signIn("google", { callbackUrl: safePath(callbackUrl) })}>Continue with Google</Button>
          <div className="text-center text-xs text-muted">or</div>
        </>
      )}
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        {reg && (
          <label className="block text-sm font-semibold">Name
            <input name="name" autoComplete="name" required className={`${input} mt-1.5 font-normal`} />
            {fields.name && <span className="text-xs font-normal text-bad">{fields.name[0]}</span>}
          </label>
        )}
        <label className="block text-sm font-semibold">Email
          <input name="email" type="email" autoComplete="email" required className={`${input} mt-1.5 font-normal`} />
          {fields.email && <span className="text-xs font-normal text-bad">{fields.email[0]}</span>}
        </label>
        <label className="block text-sm font-semibold">Password
          <input name="password" type="password" autoComplete={reg ? "new-password" : "current-password"} required minLength={reg ? 8 : 1} className={`${input} mt-1.5 font-normal`} />
          {reg && <span className="text-xs font-normal text-muted">At least 8 characters.</span>}
          {!reg && <Link href="/forgot-password" className="mt-1.5 block text-right text-xs font-semibold text-accent underline">Forgot password?</Link>}
          {fields.password && <span className="block text-xs font-normal text-bad">{fields.password[0]}</span>}
        </label>
        {error && <p role="alert" className="rounded-token bg-bad/10 px-3 py-2 text-sm text-bad">{error}</p>}
        <Button type="submit" size="lg" className="w-full" disabled={busy}>{busy ? "Please wait…" : reg ? "Create account" : "Log in"}</Button>
      </form>
      <p className="text-center text-sm text-muted">
        {reg ? <>Already have an account? <Link className="font-semibold text-accent" href="/login">Log in</Link></>
             : <>New here? <Link className="font-semibold text-accent" href="/register">Sign up</Link></>}
      </p>
    </Card>
  );
}
