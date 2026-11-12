import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { PracticeTabs } from "@/components/typing/PracticeTabs";
import { KeyPicker, type KeyStat } from "@/features/practice/KeyPicker";
import { getDb } from "@/lib/server/db";
import { getKeyStats } from "@/lib/server/sessions";

export const metadata = { title: "Practice by key" };
export const dynamic = "force-dynamic";

export default async function Page() {
  const user = (await auth())?.user;
  if (!user?.id) redirect("/login");
  const rows = await getKeyStats(getDb(), user.id);
  const stats: Record<string, KeyStat> = {};
  for (const r of rows) {
    const attempts = r.hits + r.misses;
    if (r.key.trim() && attempts > 0) stats[r.key] = { accuracy: Math.round((r.hits / attempts) * 1000) / 10, attempts };
  }
  return (
    <div className="mx-auto max-w-6xl">
      <PracticeTabs active="keys" />
      <h1 className="text-3xl font-bold tracking-tight">Practice by key</h1>
      <p className="mb-5 mt-1 text-muted">Pick a character, a finger, a row, a hand, common words or code, and practise just that.</p>
      <KeyPicker stats={stats} />
    </div>
  );
}
