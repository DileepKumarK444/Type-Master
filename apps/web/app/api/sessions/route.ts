import { auth } from "@/auth";
import { getDb } from "@/lib/server/db";
import { err, json, readJson, sameOrigin } from "@/lib/server/http";
import { rateLimit } from "@/lib/server/ratelimit";
import { recordPractice } from "@/lib/server/activity";
import { UserGoneError, listSessions } from "@/lib/server/sessions";
import { checkPlausible, sessionInputSchema } from "@/lib/server/validation";

export async function POST(req: Request) {
  if (!sameOrigin(req)) return err("forbidden", 403);
  const user = (await auth())?.user;
  if (!user?.id) return err("unauthorized", 401);
  const rl = rateLimit(`sessions:${user.id}`, 60, 60_000);
  if (!rl.ok) return err("rate_limited", 429, { retryAfterS: rl.retryAfterS });

  const parsed = sessionInputSchema.safeParse(await readJson(req));
  if (!parsed.success) return err("invalid", 400);
  const check = checkPlausible(parsed.data);
  if (!check.ok) return err(check.reason, 422);

  try {
    const saved = await recordPractice(getDb(), user.id, parsed.data);
    return json(saved, saved.duplicate ? 200 : 201);
  } catch (e) {
    if (e instanceof UserGoneError) return err("unauthorized", 401);
    throw e;
  }
}

export async function GET(req: Request) {
  const user = (await auth())?.user;
  if (!user?.id) return err("unauthorized", 401);
  const limit = Number(new URL(req.url).searchParams.get("limit") ?? 30);
  return json({ sessions: await listSessions(getDb(), user.id, Number.isFinite(limit) ? limit : 30) });
}
