import { NextResponse } from "next/server";

export const json = (body: unknown, status = 200, headers?: HeadersInit) => NextResponse.json(body, { status, headers });
export const err = (error: string, status: number, extra: Record<string, unknown> = {}) => json({ error, ...extra }, status);

/**
 * CSRF defence for cookie-authenticated mutations (in addition to SameSite=Lax cookies):
 * if the browser sent an Origin header it must match the Host we are serving.
 */
export function sameOrigin(req: Request): boolean {
  const origin = req.headers.get("origin");
  if (!origin) return true; // non-browser clients / same-origin GET-like requests
  try {
    return new URL(origin).host === (req.headers.get("x-forwarded-host") ?? req.headers.get("host"));
  } catch {
    return false;
  }
}

export const clientIp = (req: Request) => req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "local";

export async function readJson(req: Request): Promise<unknown> {
  try { return await req.json(); } catch { return undefined; }
}
