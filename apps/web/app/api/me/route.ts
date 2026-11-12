import { auth, signOut } from "@/auth";
import { deleteAccount, getProfile, updateProfile } from "@/lib/server/account";
import { getDb } from "@/lib/server/db";
import { err, json, readJson, sameOrigin } from "@/lib/server/http";
import { profileUpdateSchema } from "@/lib/server/validation";

export async function GET() {
  const user = (await auth())?.user;
  if (!user?.id) return err("unauthorized", 401);
  const profile = await getProfile(getDb(), user.id);
  return profile ? json(profile) : err("not_found", 404);
}

export async function PATCH(req: Request) {
  if (!sameOrigin(req)) return err("forbidden", 403);
  const user = (await auth())?.user;
  if (!user?.id) return err("unauthorized", 401);
  const parsed = profileUpdateSchema.safeParse(await readJson(req));
  if (!parsed.success) return err("invalid", 400, { fields: parsed.error.flatten().fieldErrors });
  const updated = await updateProfile(getDb(), user.id, parsed.data);
  return updated ? json(updated) : err("unauthorized", 401);
}

/** Requires body {"confirm":"DELETE"} so a stray request cannot erase an account. */
export async function DELETE(req: Request) {
  if (!sameOrigin(req)) return err("forbidden", 403);
  const user = (await auth())?.user;
  if (!user?.id) return err("unauthorized", 401);
  const body = (await readJson(req)) as { confirm?: string } | undefined;
  if (body?.confirm !== "DELETE") return err("confirmation_required", 400);
  await deleteAccount(getDb(), user.id);
  await signOut({ redirect: false });
  return json({ deleted: true });
}
