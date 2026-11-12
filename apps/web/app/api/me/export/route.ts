import { auth } from "@/auth";
import { exportData } from "@/lib/server/account";
import { getDb } from "@/lib/server/db";
import { err } from "@/lib/server/http";

export async function GET() {
  const user = (await auth())?.user;
  if (!user?.id) return err("unauthorized", 401);
  const data = await exportData(getDb(), user.id);
  return new Response(JSON.stringify(data, null, 2), {
    headers: { "content-type": "application/json", "content-disposition": 'attachment; filename="typemaster-export.json"', "cache-control": "no-store" },
  });
}
