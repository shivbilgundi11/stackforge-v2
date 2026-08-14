import { expect, test, type Page } from "@playwright/test";

/**
 * Shared assertions.
 *
 * The one that matters is `expectRealNumber`. A tool that renders `$0.00`, an
 * em dash, or `NaN` has technically produced a result, and every "did it
 * render?" assertion passes. Those are precisely the failures this product
 * cannot ship: the number *is* the product, and a plausible-looking wrong one
 * is worse than a visible error.
 */

/** The headline figure of the first metric strip. */
export function headline(page: Page) {
  return page.locator('[data-slot="metric-value"]').first();
}

export async function run(page: Page, label = "Calculate") {
  await page.getByRole("button", { name: label, exact: false }).click();
}

/**
 * Assert a rendered figure is a real computed value.
 *
 * Rejects the four ways this can look fine and be broken: an em dash for a
 * missing key, `NaN` from a string reaching arithmetic, `$0.00` from a price
 * that failed to load, and `undefined` rendered as text.
 */
export async function expectRealNumber(page: Page, locator = headline(page)) {
  await expect(locator).toBeVisible({ timeout: 20_000 });
  const text = (await locator.textContent())?.trim() ?? "";

  expect(text, "no figure rendered").not.toBe("");
  expect(text, "rendered an em dash — a metric key is missing").not.toBe("—");
  expect(text, "rendered NaN — a decimal string reached arithmetic").not.toMatch(/NaN/i);
  expect(text, "rendered undefined as text").not.toMatch(/undefined/i);
  expect(text, "rendered a zero — pricing probably failed to load").not.toMatch(/^\$?0(\.0+)?$/);
  expect(text, `"${text}" contains no digits`).toMatch(/\d/);

  return text;
}

/** Provenance is the trust claim; a result without it is not finished. */
export async function expectProvenance(page: Page) {
  await expect(page.getByText(/verified/i).first()).toBeVisible({ timeout: 20_000 });
}

// ── Accounts ────────────────────────────────────────────────────────────────

/**
 * The password every e2e account uses.
 *
 * One value rather than one per spec: they are all checked against the same
 * policy and the same breach list, so four different strings tested four times
 * the same thing.
 */
export const E2E_PASSWORD = "Forge-E2E-Suite-99";

/**
 * A short marker for the password these addresses were registered under.
 *
 * Registration is deliberately idempotent-looking — re-registering an existing
 * address returns the same 202 and does *not* change the password, because
 * doing otherwise would be an account-takeover endpoint. Combined with stable
 * addresses that means changing `E2E_PASSWORD` silently strands every account
 * a previous run created: signup keeps returning 202 and every login fails.
 *
 * Folding the password into the address makes a password change produce fresh
 * accounts on its own, rather than a suite that fails until someone works out
 * that the database is the problem.
 */
const PASSWORD_TAG = Array.from(E2E_PASSWORD)
  .reduce((hash, char) => (hash * 31 + char.charCodeAt(0)) % 0xffff, 7)
  .toString(36);

/**
 * A per-spec, per-worker address.
 *
 * A real-looking TLD, not `.test`: the validator rejects special-use names
 * (.test, .invalid, .local, example.com) outright, so the obvious choice fails
 * at the field rather than at the API.
 *
 * Stable across runs rather than timestamped, so a repeatedly-run suite does
 * not fill the dev database with accounts. Pass `unique` when a test genuinely
 * needs an address that has never existed — a fresh invitation, or anything
 * asserting on the state a brand-new account starts in.
 */
export function uniqueEmail(label: string, unique = false) {
  const suffix = unique ? `-${Date.now()}` : "";
  const worker = test.info().workerIndex;
  return `e2e-${label}-${worker}-${PASSWORD_TAG}${suffix}@stackforge-e2e.com`;
}

/**
 * Create an account and sign into it.
 *
 * Lives here rather than in each spec because signup gained a plan step, and
 * four copies of this function meant fixing the same walk-through four times —
 * which is the argument for it having been one function all along.
 *
 * Free by default. A spec that wants a paid tier reaches it with the `set-plan`
 * CLI command instead: choosing Pro here parks the account on the payment wall
 * rather than on the dashboard, which is asserted separately in
 * `checkout.spec.ts`.
 */
export async function signUpAndIn(
  page: Page,
  email: string,
  { name = "E2E Tester", plan }: { name?: string; plan?: "pro" | "team" } = {},
) {
  await page.goto("/signup");

  // Step one: the plan. Free is preselected, so the common case is one click.
  await expect(page.getByRole("heading", { name: "Choose a plan" })).toBeVisible();
  if (plan) await page.getByRole("radio", { name: new RegExp(`^${plan}$`, "i") }).click();
  await page.getByRole("button", { name: /^continue$/i }).click();

  // Step two: the account.
  await page.getByLabel("Name").fill(name);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: false }).fill(E2E_PASSWORD);
  await page.getByRole("button", { name: /create account/i }).click();

  if (plan) {
    // A paid signup is sent straight to login with `next` pointing at the
    // wall. Sign in on the page it landed on rather than navigating to
    // `/login` again — a fresh visit drops `next`, and the account then
    // reaches the wall only by being bounced off the dashboard, which is a
    // longer route that tests a different thing.
    await page.waitForURL(/\/login\?next=/);
  } else {
    await expect(page.getByText(/check your email/i)).toBeVisible();
    // A full navigation, deliberately. The confirmation screen has no footer
    // and so no "Sign in" link to click — the only way onward from it is the
    // address bar, which is also what the real user does after following the
    // link in their inbox.
    await page.goto("/login");
  }

  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: false }).fill(E2E_PASSWORD);
  await page.getByRole("button", { name: /sign in|log in/i }).click();

  await page.waitForURL(plan ? /\/checkout/ : /\/dashboard/);
}
