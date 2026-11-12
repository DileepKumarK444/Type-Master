/** Logs every server-side request error as one JSON line (picked up by the host's log drain). No request bodies or user data. */
export function onRequestError(error: unknown, request: { path: string; method: string }, context: { routeType?: string; routePath?: string }) {
  const e = error as { message?: string; digest?: string };
  console.error(JSON.stringify({ level: "error", msg: "request_error", method: request.method, path: request.path, route: context.routePath, type: context.routeType, error: e?.message, digest: e?.digest, at: new Date().toISOString() }));
}
