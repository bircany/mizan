/** Cookie-authenticated mutation routes only; signed webhooks are excluded. */
export function requiresSameOrigin(path: string, method: string) {
  if (["GET", "HEAD", "OPTIONS"].includes(method.toUpperCase())) return false;
  return /^\/api\/delivery\/(groups|messages|videos|campaigns)(\/|$)/.test(path) ||
    path === "/api/delivery/uploads/session" ||
    /^\/api\/donations\/eft\/[^/]+\/review$/.test(path) ||
    /^\/api\/donations\/eft-review(\/|$)/.test(path);
}

export function hasSameOrigin(request: Request) {
  try {
    const origin = request.headers.get("origin");
    const target = new URL(request.url);
    // Next may normalize the URL hostname to localhost behind its dev proxy.
    // Host is the browser's request authority; never trust forwarded-host input.
    const host = request.headers.get("host");
    if (host) {
      if (!/^[a-z0-9.\-\[\]:]+$/i.test(host)) return false;
      target.host = host;
    }
    return !!origin && new URL(origin).origin === target.origin &&
      !["cross-site"].includes(request.headers.get("sec-fetch-site") || "");
  } catch { return false; }
}
