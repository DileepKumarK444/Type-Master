import { templateInfo } from "@typemaster/content";
import { auth } from "@/auth";
import { PracticeTabs } from "@/components/typing/PracticeTabs";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { PracticeClient, type Mode } from "@/features/practice/PracticeClient";
import { getProfile } from "@/lib/server/account";
import { getDb } from "@/lib/server/db";
import { getWeakKeys } from "@/lib/server/stats";

export const metadata = { title: "Practice" };
export const dynamic = "force-dynamic";

type Search = { drill?: string; t?: string; m?: string; w?: string };

const parseMode = (m?: string): Mode | undefined => (m === "free" ? "free" : [15, 30, 60, 120].includes(Number(m)) ? Number(m) : undefined);
const parseWords = (w?: string): number | null | undefined => (w === "endless" ? null : [25, 50, 100].includes(Number(w)) ? Number(w) : undefined);

export default async function Page({ searchParams }: { searchParams: Promise<Search> }) {
  const q = await searchParams;
  const user = (await auth())?.user;
  const db = getDb();
  const profile = user?.id ? await getProfile(db, user.id) : null;

  // What to practise: a chosen template (?t=), the weak-key drill (?drill=weak), or plain random words.
  const wantsWeak = q.drill === "weak" && !!profile;
  const weak = wantsWeak ? await getWeakKeys(db, profile!.id, 5) : [];
  const chosen = q.t ? templateInfo(q.t) : undefined;
  const template = wantsWeak
    ? weak.length ? { id: `keys:${weak.map((k) => k.key).join("")}`, label: `Weak keys ${weak.map((k) => k.key.toUpperCase()).join(" ")}` } : undefined
    : chosen ? { id: chosen.id, label: chosen.label } : undefined;

  const active = wantsWeak ? "weak" : template ? "keys" : "timed";
  const title = wantsWeak ? "Weak-key drill" : template ? "Practice by key" : "Practice";
  const blurb = wantsWeak ? "Words built around the keys you miss most." : template ? "Focused practice on exactly what you chose." : "Practise against the clock, or at your own pace with no timer.";

  const heading = (
    <>
      {profile && <PracticeTabs active={active} />}
      <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
      <p className="mt-1 text-muted">{blurb}</p>
    </>
  );

  return (
    <div className="mx-auto max-w-5xl">
      {wantsWeak && weak.length === 0 && <div className="mb-6">{heading}</div>}
      {wantsWeak && weak.length === 0 ? (
        <Card className="grid place-items-center gap-3 border-dashed py-14 text-center">
          <p className="text-lg font-bold">No weak keys yet</p>
          <p className="max-w-md text-sm text-muted">We need a bit more typing history to find the keys that slow you down. Take a few tests or lessons first, or pick any key yourself.</p>
          <div className="flex gap-3"><Button href="/app/practice">Take a typing test</Button><Button variant="secondary" href="/app/practice/keys">Practice by key</Button></div>
        </Card>
      ) : (
        <PracticeClient
          heading={heading} signedIn={!!profile} showKeyboard={profile?.prefs?.showKeyboard ?? true} template={template}
          initialMode={parseMode(q.m) ?? (wantsWeak ? 60 : undefined)} initialWords={parseWords(q.w)}
        />
      )}
    </div>
  );
}
