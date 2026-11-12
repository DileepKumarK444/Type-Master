import { getDb } from "@/lib/server/db";
import { clientIp, err, json, readJson, sameOrigin } from "@/lib/server/http";
import { resetPassword } from "@/lib/server/password-reset";
import { rateLimit } from "@/lib/server/ratelimit";
import { resetSchema } from "@/lib/server/validation";

export async function POST(req: Request) {
  if (!sameOrigin(req)) return err("forbidden", 403);
  const rl = rateLimit(`reset:${clientIp(req)}`, 10, 15 * 60_000);
  if (!rl.ok) return err("rate_limited", 429, { retryAfterS: rl.retryAfterS });

  const parsed = resetSchema.safeParse(await readJson(req));
  if (!parsed.success) {
    // Password rule problems are safe to explain; a malformed token is just "invalid".
    const fields = parsed.error.flatten().fieldErrors;
    return err(fields.password ? "weak_password" : "invalid_link", 400, fields.password ? { fields } : {});
  }
  const result = await resetPassword(getDb(), parsed.data.token, parsed.data.password);
  if (!result.ok) return err("invalid_link", 400); // expired, already used and unknown look the same
  return json({ ok: true });
}
