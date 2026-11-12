import { after } from "next/server";
import { getDb } from "@/lib/server/db";
import { RESET_TTL_MINUTES, createResetToken } from "@/lib/server/password-reset";
import { resetEmail, sendEmail } from "@/lib/server/email";
import { clientIp, err, json, readJson, sameOrigin } from "@/lib/server/http";
import { rateLimit } from "@/lib/server/ratelimit";
import { forgotSchema } from "@/lib/server/validation";

/** Same answer whether or not the email has an account (no account enumeration). */
const GENERIC = { ok: true, message: "If that email has an account, we've sent a link to reset the password." };

/** Where the link in the email points. In production this must be configured; we never trust the request's Host header. */
function baseUrl(req: Request): string | null {
  // SITE_URL is read at runtime; NEXT_PUBLIC_SITE_URL is frozen at build time and only a fallback here.
  const configured = process.env.SITE_URL ?? process.env.NEXT_PUBLIC_SITE_URL;
  if (configured) return configured.replace(/\/$/, "");
  return process.env.NODE_ENV === "production" ? null : new URL(req.url).origin;
}

export async function POST(req: Request) {
  if (!sameOrigin(req)) return err("forbidden", 403);
  const parsed = forgotSchema.safeParse(await readJson(req));
  if (!parsed.success) return err("invalid", 400);
  const { email } = parsed.data;

  const ip = rateLimit(`forgot-ip:${clientIp(req)}`, 5, 60 * 60_000);
  const perEmail = rateLimit(`forgot-email:${email}`, 3, 60 * 60_000);
  if (!ip.ok || !perEmail.ok) return err("rate_limited", 429, { retryAfterS: Math.max(ip.retryAfterS, perEmail.retryAfterS) });

  const base = baseUrl(req);
  // Do the lookup + send after responding, so response time does not reveal whether the account exists.
  after(async () => {
    try {
      if (!base) throw new Error("NEXT_PUBLIC_SITE_URL is not set; cannot build a safe reset link");
      const created = await createResetToken(getDb(), email);
      if (!created) return;
      const link = `${base}/reset-password?token=${encodeURIComponent(created.token)}`;
      await sendEmail(resetEmail(created.email, link, RESET_TTL_MINUTES));
    } catch (e) {
      console.error(JSON.stringify({ level: "error", msg: "password_reset_email_failed", error: (e as Error).message }));
    }
  });
  return json(GENERIC);
}
