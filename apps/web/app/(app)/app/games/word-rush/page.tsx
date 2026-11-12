import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { WordRushClient } from "@/features/games/WordRushClient";
import { getProfile } from "@/lib/server/account";
import { getDb } from "@/lib/server/db";
import { getUserStats } from "@/lib/server/progression";

export const metadata = { title: "Word Rush" };
export const dynamic = "force-dynamic";

export default async function Page() {
  const user = (await auth())?.user;
  if (!user?.id) redirect("/login");
  const db = getDb();
  const profile = await getProfile(db, user.id);
  if (!profile) redirect("/login");
  const stats = await getUserStats(db, user.id);
  return <WordRushClient bestScore={stats.bestGameScore} />;
}
