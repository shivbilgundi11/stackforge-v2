import { expect, test } from "@playwright/test";

import { E2E_PASSWORD, signUpAndIn, uniqueEmail } from "./helpers";

/**
 * Choosing a plan at signup, and the wall that follows it.
 *
 * What is *not* here: authorizing a mandate in Razorpay Checkout. Driving
 * a third party's page from a browser test asserts their markup, not ours, and
 * it breaks when they redesign it. The half that follows the mandate — the
 * signed webhook, the upgrade it applies, and the duplicate delivery that must
 * apply once — is covered by the backend suite.
 *
 * What is here is the half a browser is needed for, and it is the half most
 * likely to break: that the choice made on the form survives the round trip
 * through registration and login, that the wall actually stands in the way
 * afterwards, and that it can be declined. The last one matters most — a wall
 * with no exit is a support queue, and nothing else in the suite would notice
 * if the button stopped working.
 */

test("a plan chosen at signup follows the account to the payment wall", async ({ page }) => {
  const email = uniqueEmail("wall-pro", true);

  await page.goto("/signup");

  // Step one is the plan, and Free is preselected — the common path is one
  // click, not a decision.
  await expect(page.getByRole("heading", { name: "Choose a plan" })).toBeVisible();
  await expect(page.getByRole("radio", { name: "Free", exact: true })).toBeChecked();

  await page.getByRole("radio", { name: "Pro", exact: true }).click();
  await page.getByRole("button", { name: /^continue$/i }).click();

  // Step two carries the answer to step one, so nobody has to remember what
  // they are about to be charged.
  await expect(page.getByText(/Plan:\s*pro/i)).toBeVisible();

  await page.getByLabel("Name").fill("Paula Payer");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: false }).fill(E2E_PASSWORD);
  await page.getByRole("button", { name: /create account and continue to payment/i }).click();

  // No "check your email" on the paid path: the address gets proven by the
  // card, and holding a paying customer at an email link loses them.
  await page.waitForURL(/\/login\?next=/);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: false }).fill(E2E_PASSWORD);
  await page.getByRole("button", { name: /sign in|log in/i }).click();

  await page.waitForURL(/\/checkout/);
  await expect(page.getByRole("heading", { name: /complete your subscription/i })).toBeVisible();
  // Opened on what was chosen, not on a default.
  await expect(page.getByRole("radio", { name: "Pro", exact: true })).toBeChecked();
});

test("the wall stands in front of the account pages until it is settled", async ({ page }) => {
  const email = uniqueEmail("wall-guard", true);
  await signUpAndIn(page, email, { name: "Gary Gated", plan: "pro" });

  // Every account-only surface bounces back to the wall.
  await page.goto("/dashboard");
  await page.waitForURL(/\/checkout/);

  await page.goto("/settings/billing");
  await page.waitForURL(/\/checkout/);

  // But the tools are not walled. The anonymous tier reaches every calculator
  // by design (D-17), and a signed-in account must not have *less* than that
  // while it decides whether to pay.
  await page.goto("/cost/llm-pricing?model_id=claude-opus-5&requests_per_day=1000");
  await expect(page.getByRole("button", { name: /^Run$|Calculate/i }).first()).toBeVisible();
});

test("the wall can be declined, and the account continues on free", async ({ page }) => {
  const email = uniqueEmail("wall-decline", true);
  await signUpAndIn(page, email, { name: "Dana Decliner", plan: "team" });

  await expect(page.getByRole("radio", { name: "Team", exact: true })).toBeChecked();

  await page.getByRole("button", { name: /continue on the free plan/i }).click();
  await page.waitForURL(/\/dashboard/);

  // And it stays declined: the wall does not reappear on the next visit.
  await page.goto("/settings/billing");
  await expect(page.getByRole("heading", { name: "Billing" })).toBeVisible();
  expect(new URL(page.url()).pathname).toBe("/settings/billing");
});

test("a free signup never sees the wall", async ({ page }) => {
  const email = uniqueEmail("wall-free", true);
  await signUpAndIn(page, email, { name: "Fred Free" });

  expect(new URL(page.url()).pathname).toBe("/dashboard");

  await page.goto("/settings/billing");
  await expect(page.getByRole("heading", { name: "Billing" })).toBeVisible();
});

test("the pricing page carries the chosen plan into the signup form", async ({ page }) => {
  await page.goto("/pricing");

  // Signed out, a paid plan offers an account rather than a card — you cannot
  // buy without one either way.
  const cta = page.getByRole("link", { name: /Start 7-day trial/ }).first();
  await expect(cta).toHaveAttribute("href", /\/signup\?plan=(pro|team)/);

  await cta.click();
  await page.waitForURL(/\/signup\?plan=/);
  await expect(page.getByRole("radio", { name: "Pro", exact: true })).toBeChecked();
});

test("an invitee is never asked to buy the seat they were given", async ({ page }) => {
  // No token, so the accept page will refuse it — but the signup form reads
  // the parameter before the token is ever checked, and skipping the plan step
  // is the behaviour under test. The full invite journey lives in team.spec.ts.
  await page.goto("/signup?invite=not-a-real-token-but-long-enough-to-pass&email=x@y.com");

  await expect(page.getByRole("heading", { name: "Join your team" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Choose a plan" })).toBeHidden();
});

test("the wall is a wrong turn, not a bill, when nothing is owed", async ({ page }) => {
  await signUpAndIn(page, uniqueEmail("wall-none", true), { name: "Nora Normal" });

  await page.goto("/checkout");
  await page.waitForURL(/\/dashboard/);
});
