import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { ProfileForm } from "@/features/profile/ProfileForm";
import { getProfile } from "@/lib/server/account";
import { getDb } from "@/lib/server/db";

export const metadata = { title: "Profile & settings" };

export default async function Page() {
  const user = (await auth())?.user;
  if (!user?.id) redirect("/login");
  const p = await getProfile(getDb(), user.id);
  if (!p) redirect("/login"); // account deleted but cookie still valid
  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-3xl font-bold tracking-tight">Profile &amp; settings</h1>
      <p className="mb-6 mt-1 text-muted">Make TypeMaster work your way.</p>
      <ProfileForm email={p.email} initial={{ displayName: p.displayName, goalWpm: p.goalWpm ?? 40, dailyMinutes: p.dailyMinutes ?? 10, showKeyboard: p.prefs?.showKeyboard ?? true }} />
    </div>
  );
}
