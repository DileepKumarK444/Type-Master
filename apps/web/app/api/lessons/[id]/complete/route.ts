import { auth } from "@/auth";
import { getDb } from "@/lib/server/db";
import { err, json, readJson, sameOrigin } from "@/lib/server/http";
import { completeLesson } from "@/lib/server/lessons";
import { rateLimit } from "@/lib/server/ratelimit";
import { UserGoneError } from "@/lib/server/sessions";
import { LESSON_MIN_SECONDS, checkPlausible, lessonCompleteSchema } from "@/lib/server/validation";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!sameOrigin(req)) return err("forbidden", 403);
  const user = (await auth())?.user;
  if (!user?.id) return err("unauthorized", 401);
  if (!rateLimit(`lesson:${user.id}`, 60, 60_000).ok) return err("rate_limited", 429);

  const lessonId = Number((await params).id);
  if (!Number.isInteger(lessonId)) return err("unknown_lesson", 404);

  const parsed = lessonCompleteSchema.safeParse(await readJson(req));
  if (!parsed.success) return err("invalid", 400);
  const check = checkPlausible(parsed.data, LESSON_MIN_SECONDS);
  if (!check.ok) return err(check.reason, 422);

  try {
    const r = await completeLesson(getDb(), user.id, lessonId, parsed.data);
    if (!r.ok) return err(r.reason, r.reason === "locked" ? 403 : 404);
    return json(r, r.duplicate ? 200 : 201);
  } catch (e) {
    if (e instanceof UserGoneError) return err("unauthorized", 401);
    throw e;
  }
}
