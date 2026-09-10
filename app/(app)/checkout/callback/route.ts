import { NextResponse } from "next/server";

/**
 * Razorpay posts Checkout results here. The webhook remains authoritative.
 *
 * ## Why the redirect is relative
 *
 * `request.url` is not the URL the customer typed. Behind a reverse proxy the
 * Next server reports its own bind address — `http://0.0.0.0:3000/…` in a
 * container, `http://localhost:3000/…` on a bare `next start` — so building
 * the target with `new URL("/checkout/done", request.url)` sent a paying
 * customer to an address that exists only inside the server. The payment
 * succeeded and the browser landed nowhere.
 *
 * `X-Forwarded-Host` would work and is what the proxy sends, but it is a
 * header the client controls on any deployment that does not strip it, and
 * an open redirect on the one route that handles money is not a trade worth
 * making. A relative `Location` needs no origin at all: RFC 7231 has the
 * browser resolve it against the request URL, which is by definition the one
 * the customer is on.
 *
 * `NextResponse.redirect` requires an absolute URL, hence the plain Response.
 */
export function POST(request: Request) {
  const plan = new URL(request.url).searchParams.get("plan");
  const location = plan ? `/checkout/done?plan=${encodeURIComponent(plan)}` : "/checkout/done";

  return new NextResponse(null, { status: 303, headers: { Location: location } });
}
