import { levelFor } from "@typemaster/content";
import { auth } from "@/auth";
import { AppShell } from "@/components/shell/AppShell";
import { SyncOnLogin } from "@/components/shell/SyncOnLogin";
import { getDb } from "@/lib/server/db";
import { getXp } from "@/lib/server/progression";
import { getStreakInfo } from "@/lib/server/stats";

export const metadata = { robots: { index: false, follow: false } };

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const sessionUser = (await auth())?.user;
  const user = sessionUser?.id ? sessionUser : null; // a revoked session has no id
  const db = getDb();
  // Streak and level are non-critical chrome: never let a failure here take the whole app down.
  const [streak, xp] = user?.id
    ? await Promise.all([getStreakInfo(db, user.id).then((s) => s.streak).catch(() => 0), getXp(db, user.id).catch(() => 0)])
    : [0, 0];
  return (
    <AppShell user={user ? { name: user.name ?? user.email ?? "You" } : null} streak={streak} level={user ? levelFor(xp) : undefined}>
      {user && <SyncOnLogin />}
      {children}
    </AppShell>
  );
}
