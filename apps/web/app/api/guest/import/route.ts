import { z } from "zod";
import { auth } from "@/auth";
import { getDb } from "@/lib/server/db";
import { err, json, readJson, sameOrigin } from "@/lib/server/http";
import { rateLimit } from "@/lib/server/ratelimit";
import { recordPractice } from "@/lib/server/activity";
import { UserGoneError } from "@/lib/server/sessions";
import { checkPlausible, sessionInputSchema } from "@/lib/server/validation";

const bodySchema = z.object({ sessions: z.array(z.unknown()).max(20) });

/** Merges results a guest took before signing up. Invalid/implausible entries are skipped, never trusted. */
export async function POST(req: Request) {
  if (!sameOrigin(req)) return err("forbidden", 403);
  const user = (await auth())?.user;
  if (!user?.id) return err("unauthorized", 401);
  if (!rateLimit(`import:${user.id}`, 5, 60_000).ok) return err("rate_limited", 429);

  const body = bodySchema.safeParse(await readJson(req));
  if (!body.success) return err("invalid", 400);

  let imported = 0, skipped = 0;
  for (const raw of body.data.sessions) {
    const p = sessionInputSchema.safeParse(raw);
    if (!p.success || !checkPlausible(p.data).ok) { skipped++; continue; }
    let r;
    try { r = await recordPractice(getDb(), user.id, p.data); } catch (e) {
      if (e instanceof UserGoneError) return err("unauthorized", 401);
      throw e;
    }
    if (r.duplicate) skipped++;
    else imported++;
  }
  return json({ imported, skipped });
}
