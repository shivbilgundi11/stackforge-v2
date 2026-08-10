import { expect, test, type Page } from "@playwright/test";

import { expectRealNumber, run } from "./helpers";

/**
 * M17 — saved work, against the real backend.
 *
 * The claim under test is the one the module exists for and that no unit test
 * can make: work done *before* an account survives creating one. It spans the
 * anonymous cookie, the login handler's claim step, the runs table, and the
 * dashboard aggregate — four layers that each pass their own tests while the
 * run quietly disappears between them.
 *
 * A fresh browser context per test means a fresh anonymous session, so the
 * run claimed here is unambiguously this test's.
 */

/** Registration is a 202 with no session; login is what authenticates. */
async function signUpAndIn(page: Page, email: string) {
  const password = "Forge-Workspace-99";

  await page.goto("/signup");
  await page.getByLabel("Name").fill("Workspace Test");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: false }).fill(password);
  await page.getByRole("button", { name: /create account|sign up/i }).click();
  await expect(page.getByText(/check your email/i)).toBeVisible();

  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: false }).fill(password);
  await page.getByRole("button", { name: /sign in|log in/i }).click();
  await page.waitForURL(/\/dashboard/);
}

function uniqueEmail(label: string) {
  // A real-looking TLD, not `.test`: the validator rejects special-use names
  // (.test, .invalid, .local, example.com) outright, so the obvious choice
  // fails at the field rather than at the API.
  //
  // Stable across runs rather than timestamped. Re-registering an existing
  // address returns the same 202 by design, the password is unchanged, and a
  // fixed set of addresses keeps a repeatedly-run suite from filling the dev
  // database with accounts.
  return `e2e-${label}-${test.info().workerIndex}@stackforge-e2e.com`;
}

test("a run made before signing up is waiting on the dashboard after", async ({ page }) => {
  await page.goto("/cost/llm-pricing?model_id=claude-opus-5&requests_per_day=1000");
  await run(page);
  await expectRealNumber(page);

  // Signed out, the result carries the ask rather than a save button.
  await expect(page.getByText(/kept for 30 days/i)).toBeVisible();

  await signUpAndIn(page, uniqueEmail("claim"));

  // The claim happens in the login handler, so the run is already on the
  // account by the time the dashboard renders.
  const recent = page.getByRole("link", { name: /LLM Pricing/i });
  await expect(recent.first()).toBeVisible();
});

test("a claimed run reopens with its inputs restored", async ({ page }) => {
  await page.goto("/cost/llm-pricing?model_id=claude-opus-5&requests_per_day=4242");
  await run(page);
  await expectRealNumber(page);

  await signUpAndIn(page, uniqueEmail("reopen"));

  await page
    .getByRole("link", { name: /LLM Pricing/i })
    .first()
    .click();

  // The value goes back on the *form*, not into a read-only receipt: the
  // point of reopening is to adjust a figure and re-run.
  await expect(page.getByLabel(/requests per day/i)).toHaveValue("4242");
  await expectRealNumber(page);
});

test("a signed-in user can keep a run, and Free is told why it has no projects", async ({
  page,
}) => {
  await signUpAndIn(page, uniqueEmail("keep"));

  await page.goto("/cost/llm-pricing");
  await run(page);
  await expectRealNumber(page);

  // Signed in, the ask becomes a control. Saving is what exempts the run from
  // the 30-day purge — it was already stored either way.
  const keep = page.getByRole("button", { name: /keep this run/i });
  await expect(keep).toBeVisible();
  await keep.click();
  await expect(page.getByRole("button", { name: /^kept$/i })).toBeVisible();

  // A new account is on Free, which has no projects. The refusal has to reach
  // the screen as a pricing answer — a 402 swallowed into "something went
  // wrong" hides the only thing the user can act on. The happy path (create,
  // add items, reorder, pin) is covered against a Pro account in
  // `backend/tests/integration/test_workspace.py`; a browser cannot upgrade a
  // plan, so it is not re-proved here.
  await page.goto("/projects");
  await page.getByLabel("Project name").fill("E2E rollout");
  await page.getByRole("button", { name: "Create" }).click();
  await expect(page.getByText(/not included on the free plan/i)).toBeVisible();
});
