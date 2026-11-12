import { getDb } from "@/lib/server/db";
import { clientIp, err, json, readJson, sameOrigin } from "@/lib/server/http";
import { rateLimit } from "@/lib/server/ratelimit";
import { EmailTakenError, registerUser } from "@/lib/server/users";
import { registerSchema } from "@/lib/server/validation";

export async function POST(req: Request) {
  if (!sameOrigin(req)) return err("forbidden", 403);
  const rl = rateLimit(`register:${clientIp(req)}`, 10, 60 * 60_000);
  if (!rl.ok) return err("rate_limited", 429, { retryAfterS: rl.retryAfterS });

  const parsed = registerSchema.safeParse(await readJson(req));
  if (!parsed.success) return err("invalid", 400, { fields: parsed.error.flatten().fieldErrors });
  try {
    const { id } = await registerUser(getDb(), parsed.data);
    return json({ id }, 201);
  } catch (e) {
    if (e instanceof EmailTakenError) return err("email_taken", 409);
    throw e;
  }
}
