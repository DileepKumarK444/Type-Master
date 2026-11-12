import { InvalidLink, ResetForm } from "@/components/auth/ResetForm";
import { getDb } from "@/lib/server/db";
import { isResetTokenValid } from "@/lib/server/password-reset";

// The token is a secret in the URL: keep the page out of search and never leak the URL as a referrer.
export const metadata = { title: "Reset password", robots: { index: false }, referrer: "no-referrer" as const };
export const dynamic = "force-dynamic";

export default async function Page({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  const valid = !!token && token.length <= 128 && (await isResetTokenValid(getDb(), token));
  return (
    <main id="main" tabIndex={-1} className="grid min-h-screen place-items-center px-4 py-10 outline-none">
      {valid ? <ResetForm token={token} /> : <InvalidLink />}
    </main>
  );
}
