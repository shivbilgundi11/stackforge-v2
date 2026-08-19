import { NextResponse } from "next/server";

/** Razorpay posts Checkout results here. The webhook remains authoritative. */
export function POST(request: Request) {
  const url = new URL(request.url);
  const plan = url.searchParams.get("plan");
  const done = new URL("/checkout/done", url);
  if (plan) done.searchParams.set("plan", plan);
  return NextResponse.redirect(done, 303);
}
