"use client";
import Link from "next/link";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

const input = "w-full rounded-token border border-line bg-surface px-3.5 py-2.5 outline-none focus:border-accent focus:ring-2 focus:ring-accent/30";

export function ForgotForm() {
  const [state, setState] = useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = useState<string>();

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(undefined); setState("sending");
    const email = String(new FormData(e.currentTarget).get("email") ?? "").trim();
    try {
      const res = await fetch("/api/auth/forgot", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email }) });
      if (res.status === 429) { setError("Too many requests. Please try again in a little while."); setState("idle"); return; }
      if (!res.ok) { setError("Please enter a valid email address."); setState("idle"); return; }
      setState("sent");
    } catch {
      setError("Network problem. Check your connection and try again.");
      setState("idle");
    }
  }

  if (state === "sent") {
    return (
      <Card className="mx-auto w-full max-w-md space-y-3 p-7 text-center" role="status">
        <h1 className="text-2xl font-bold">Check your email</h1>
        <p className="text-muted">If that email has an account, we’ve sent a link to reset the password. It works once and expires in 60 minutes.</p>
        <p className="text-sm text-muted">Nothing arrived? Check your spam folder, or try again in a few minutes.</p>
        <Link href="/login" className="inline-block font-semibold text-accent underline">Back to log in</Link>
      </Card>
    );
  }
  return (
    <Card className="mx-auto w-full max-w-md space-y-4 p-7">
      <h1 className="text-2xl font-bold">Forgot your password?</h1>
      <p className="text-sm text-muted">Enter the email you signed up with and we’ll send you a link to choose a new one.</p>
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <label className="block text-sm font-semibold">Email
          <input name="email" type="email" autoComplete="email" required className={`${input} mt-1.5 font-normal`} />
        </label>
        {error && <p role="alert" className="rounded-token bg-bad/10 px-3 py-2 text-sm text-bad">{error}</p>}
        <Button type="submit" size="lg" className="w-full" disabled={state === "sending"}>{state === "sending" ? "Sending…" : "Send reset link"}</Button>
      </form>
      <p className="text-center text-sm text-muted"><Link href="/login" className="font-semibold text-accent underline">Back to log in</Link></p>
    </Card>
  );
}
