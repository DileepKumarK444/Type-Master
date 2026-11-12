import { redirect } from "next/navigation";
import Link from "next/link";
import { levelProgress } from "@typemaster/content";
import { auth } from "@/auth";
import { MoreLogout } from "@/components/shell/MoreLogout";
import { Card } from "@/components/ui/Card";
import { Icon } from "@/components/ui/Icon";
import { getDb } from "@/lib/server/db";
import { getXp } from "@/lib/server/progression";

export const metadata = { title: "More" };
export const dynamic = "force-dynamic";

const LINKS = [["/app/progress", "chart", "Progress"], ["/app/achievements", "trophy", "Achievements"], ["/app/profile", "user", "Profile & settings"]] as const;

/** The phone's "More" tab: everything that has no room in the 5-tab bar (the desktop sidebar's footer, in effect). */
export default async function Page() {
  const user = (await auth())?.user;
  if (!user?.id) redirect("/login");
  const lvl = levelProgress(await getXp(getDb(), user.id));
  return (
    <div className="mx-auto max-w-xl space-y-4">
      <h1 className="text-3xl font-bold tracking-tight">More</h1>
      <Card className="flex items-center gap-4">
        <span className="grid h-12 w-12 place-items-center rounded-full bg-accent text-lg font-bold text-white [[data-theme=dark]_&]:text-bg" aria-hidden="true">{(user.name ?? user.email ?? "?").slice(0, 1).toUpperCase()}</span>
        <div className="min-w-0"><div className="truncate font-bold">{user.name ?? user.email}</div><div className="text-sm text-muted">Level {lvl.level} · {lvl.into} / {lvl.needed} XP</div></div>
      </Card>
      <Card className="divide-y divide-line py-1">
        {LINKS.map(([href, icon, label]) => (
          <Link key={href} href={href} className="flex items-center gap-4 py-3.5 font-semibold">
            <Icon name={icon} />{label}<span className="ml-auto text-muted" aria-hidden="true">›</span>
          </Link>
        ))}
      </Card>
      <MoreLogout />
    </div>
  );
}
