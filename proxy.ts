import { NextResponse, type NextRequest } from "next/server";

/**
 * Next 16 uses `proxy.ts`, not `middleware.ts`. Runtime is nodejs.
 *
 * **This does not gate authentication, and cannot.** Two reasons, both found
 * by trying:
 *
 *   1. The refresh cookie is path-scoped to `/api/v1/auth`, so the browser
 *      does not send it on a request for `/dashboard`. Widening the path to
 *      `/` would put the token on every request to every route — the exact
 *      exposure the scoping exists to prevent.
 *   2. In production the API is a different origin from the web app, so its
 *      cookies never reach this server at all.
 *
 * Auth is enforced by the API on every request, and the client-side
 * `<AuthGuard>` handles the redirect without a flash. This file is left for
 * concerns that genuinely belong at the edge — redirects, rewrites, headers.
 */

export function proxy(_request: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|woff2?)$).*)",
  ],
};
