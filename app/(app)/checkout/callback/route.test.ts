import { expect, it } from "vitest";

import { POST } from "./route";

it("turns Razorpay's POST callback into the confirmation-page GET", () => {
  const response = POST(
    new Request("https://app.stackforge.dev/checkout/callback?plan=team", {
      method: "POST",
      body: "razorpay_signature=untrusted",
    }),
  );

  expect(response.status).toBe(303);
  expect(response.headers.get("location")).toBe(
    "https://app.stackforge.dev/checkout/done?plan=team",
  );
});
