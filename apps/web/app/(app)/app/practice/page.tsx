import { auth } from "@/auth";
import { PracticeClient } from "@/features/practice/PracticeClient";
import { getProfile } from "@/lib/server/account";
import { getDb } from "@/lib/server/db";
import { getWeakKeys } from "@/lib/server/stats";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

export const metadata = { title: "Practice" };
export const dynamic = "force-dynamic";

export default async function Page({ searchParams }: { searchParams: Promise<{ drill?: string }> }) {
  const { drill } = await searchParams;
  const user = (await auth())?.user;
  const db = getDb();
  const profile = user?.id ? await getProfile(db, user.id) : null;
  const wantsDrill = drill === "weak" && !!profile;
  const weak = wantsDrill ? await getWeakKeys(db, profile!.id, 5) : [];

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="text-3xl font-bold tracking-tight">{wantsDrill ? "Weak-key drill" : "Practice"}</h1>
      <p className="mb-6 mt-1 text-muted">{wantsDrill ? "Words built around the keys you miss most." : "Timed typing test. Just start typing."}</p>
      {wantsDrill && weak.length === 0 ? (
        <Card className="grid place-items-center gap-3 border-dashed py-14 text-center">
          <p className="text-lg font-bold">No weak keys yet</p>
          <p className="max-w-md text-sm text-muted">We need a bit more typing history to find the keys that slow you down. Take a few tests or lessons first.</p>
          <Button href="/app/practice">Take a typing test</Button>
        </Card>
      ) : (
        <PracticeClient signedIn={!!profile} showKeyboard={profile?.prefs?.showKeyboard ?? true} drillKeys={wantsDrill ? weak.map((k) => k.key) : undefined} />
      )}
    </div>
  );
}
