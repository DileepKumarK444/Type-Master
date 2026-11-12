"use client";
import { useState, type FormEvent } from "react";
import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Toggle } from "@/components/ui/Toggle";

type Initial = { displayName: string; goalWpm: number; dailyMinutes: number; showKeyboard: boolean };
const input = "w-full rounded-token border border-line bg-surface px-3.5 py-2.5 outline-none focus:border-accent focus:ring-2 focus:ring-accent/30";

export function ProfileForm({ email, initial }: { email: string; initial: Initial }) {
  const [v, setV] = useState(initial);
  const [msg, setMsg] = useState<{ ok: boolean; text: string }>();
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState("");
  const [deleting, setDeleting] = useState(false);

  async function save(e: FormEvent) {
    e.preventDefault();
    setBusy(true); setMsg(undefined);
    try {
      const res = await fetch("/api/me", {
        method: "PATCH", headers: { "content-type": "application/json" },
        body: JSON.stringify({ displayName: v.displayName, goalWpm: v.goalWpm, dailyMinutes: v.dailyMinutes, prefs: { showKeyboard: v.showKeyboard } }),
      });
      setMsg(res.ok ? { ok: true, text: "Saved." } : { ok: false, text: "Check your values (goal 5–300 WPM, 1–240 minutes) and try again." });
    } catch {
      setMsg({ ok: false, text: "Network problem — not saved." });
    } finally { setBusy(false); }
  }

  async function remove() {
    setDeleting(true);
    const res = await fetch("/api/me", { method: "DELETE", headers: { "content-type": "application/json" }, body: JSON.stringify({ confirm: "DELETE" }) }).catch(() => null);
    if (res?.ok) await signOut({ callbackUrl: "/" });
    else { setDeleting(false); setMsg({ ok: false, text: "Couldn't delete the account. Try again." }); }
  }

  return (
    <div className="space-y-4">
      <form onSubmit={save} className="space-y-4">
        <Card className="space-y-4">
          <h2 className="font-bold">Profile</h2>
          <label className="block text-sm font-semibold">Display name
            <input className={`${input} mt-1.5 font-normal`} value={v.displayName} maxLength={60} required onChange={(e) => setV({ ...v, displayName: e.target.value })} />
          </label>
          <div className="text-sm"><span className="font-semibold">Email</span><div className="mt-1.5 text-muted">{email}</div></div>
        </Card>
        <Card className="space-y-4">
          <h2 className="font-bold">Goals</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm font-semibold">Target speed (WPM)
              <input type="number" min={5} max={300} className={`${input} mt-1.5 font-normal`} value={v.goalWpm} onChange={(e) => setV({ ...v, goalWpm: Number(e.target.value) })} />
            </label>
            <label className="block text-sm font-semibold">Daily practice (minutes)
              <input type="number" min={1} max={240} className={`${input} mt-1.5 font-normal`} value={v.dailyMinutes} onChange={(e) => setV({ ...v, dailyMinutes: Number(e.target.value) })} />
            </label>
          </div>
        </Card>
        <Card className="flex items-center justify-between">
          <span className="font-semibold">Show virtual keyboard while practicing</span>
          <Toggle label="Show virtual keyboard" defaultOn={v.showKeyboard} onChange={(on) => setV({ ...v, showKeyboard: on })} />
        </Card>
        <div className="flex items-center gap-3">
          <Button type="submit" disabled={busy}>{busy ? "Saving…" : "Save changes"}</Button>
          {msg && <span role="status" className={msg.ok ? "text-sm text-ok" : "text-sm text-bad"}>{msg.text}</span>}
        </div>
      </form>

      <Card className="space-y-3">
        <h2 className="font-bold">Account</h2>
        <div className="flex flex-wrap gap-3">
          <a href="/api/me/export" download className="inline-flex items-center justify-center rounded-token border border-line bg-surface px-4 py-2.5 font-semibold hover:bg-surface2">Export my data</a>
          <Button variant="ghost" onClick={() => signOut({ callbackUrl: "/" })}>Log out</Button>
        </div>
        <hr className="border-line" />
        <div className="space-y-2">
          <p className="text-sm text-muted">Delete your account and all typing history. This cannot be undone. Type <b>DELETE</b> to confirm.</p>
          <div className="flex gap-2">
            <input aria-label="Type DELETE to confirm" className={input} value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="DELETE" />
            <Button variant="secondary" className="text-bad" disabled={confirm !== "DELETE" || deleting} onClick={remove}>{deleting ? "Deleting…" : "Delete account"}</Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
