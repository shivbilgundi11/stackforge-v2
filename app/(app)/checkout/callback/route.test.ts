import { expect, it } from "vitest";

import { POST } from "./route";

function callback(url: string) {
  return POST(new Request(url, { method: "POST", body: "razorpay_signature=untrusted" }));
}

it("turns Razorpay's POST callback into the confirmation-page GET", () => {
  const response = callback("https://app.aiveda.dev/checkout/callback?plan=team");

  expect(response.status).toBe(303);
  expect(response.headers.get("location")).toBe("/checkout/done?plan=team");
});

it("carries no plan through when Razorpay sent none", () => {
  expect(callback("https://app.aiveda.dev/checkout/callback").headers.get("location")).toBe(
    "/checkout/done",
  );
});

// The bug this route shipped with. Behind a proxy the Next server reports its
// own bind address as `request.url`, so a redirect built from it sent a paying
// customer to `http://0.0.0.0:3000/checkout/done` — an address that exists
// only inside the container. The location must not depend on the origin it
// was asked from.
it("does not resolve against the server's own origin", () => {
  const proxied = callback("http://0.0.0.0:3000/checkout/callback?plan=pro");

  expect(proxied.headers.get("location")).toBe("/checkout/done?plan=pro");
  expect(proxied.headers.get("location")).not.toContain("0.0.0.0");
});

it("escapes a plan that would otherwise break out of the query", () => {
  const response = callback("https://app.aiveda.dev/checkout/callback?plan=a%26b%3Dc");

  expect(response.headers.get("location")).toBe("/checkout/done?plan=a%26b%3Dc");
});
