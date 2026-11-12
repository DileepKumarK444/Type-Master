import { auth } from "@/auth";
import { recordGame } from "@/lib/server/activity";
import { getDb } from "@/lib/server/db";
import { err, json, readJson, sameOrigin } from "@/lib/server/http";
import { rateLimit } from "@/lib/server/ratelimit";
import { UserGoneError } from "@/lib/server/sessions";
import { checkGamePlausible, gameInputSchema } from "@/lib/server/validation";

export async function POST(req: Request) {
  if (!sameOrigin(req)) return err("forbidden", 403);
  const user = (await auth())?.user;
  if (!user?.id) return err("unauthorized", 401);
  if (!rateLimit(`game:${user.id}`, 30, 60_000).ok) return err("rate_limited", 429);

  const parsed = gameInputSchema.safeParse(await readJson(req));
  if (!parsed.success) return err("invalid", 400);
  const check = checkGamePlausible(parsed.data);
  if (!check.ok) return err(check.reason, 422);

  try {
    const saved = await recordGame(getDb(), user.id, { ...parsed.data, consistency: 100 });
    return json(saved, saved.duplicate ? 200 : 201);
  } catch (e) {
    if (e instanceof UserGoneError) return err("unauthorized", 401);
    throw e;
  }
}
