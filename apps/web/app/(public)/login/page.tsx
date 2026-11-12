import { redirect } from "next/navigation";
import { auth, googleEnabled } from "@/auth";
import { AuthForm } from "@/components/auth/AuthForm";
import { getProfile } from "@/lib/server/account";
import { getDb } from "@/lib/server/db";

export const metadata = { title: "Log in", robots: { index: false } };

export default async function Page({ searchParams }: { searchParams: Promise<{ callbackUrl?: string; reset?: string }> }) {
  const { callbackUrl, reset } = await searchParams;
  // Only bounce to the app if the account still exists. A valid cookie for a deleted account would otherwise
  // loop /app -> /login -> /app forever.
  const user = (await auth())?.user;
  if (user?.id && (await getProfile(getDb(), user.id))) redirect("/app");
  return <main id="main" tabIndex={-1} className="grid min-h-screen outline-none place-items-center px-4 py-10"><AuthForm mode="login" googleEnabled={googleEnabled} callbackUrl={callbackUrl} notice={reset === "1" ? "Your password was updated. Log in with your new password." : undefined} /></main>;
}
