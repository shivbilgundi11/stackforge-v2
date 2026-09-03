import { expect, test } from "@playwright/test";

import { expectRealNumber, run, signUpAndIn, uniqueEmail } from "./helpers";

/**
 * M17 — saved work, against the real backend.
 *
 * The claim this module used to exist for — work done *before* an account
 * survives creating one — is gone with the anonymous tier: there is no such
 * work. What remains is the claim no unit test can make, that a run reaches
 * the dashboard aggregate and reopens with its inputs intact, across the
 * session, the runs table, and the aggregate — three layers that each pass
 * their own tests while the run quietly disappears between them.
 *
 * A fresh browser context per test means a fresh session, so the run asserted
 * on here is unambiguously this test's.
 */

test("a signed-out visitor is sent to login, not to a calculator", async ({ page }) => {
  await page.goto("/cost/llm-pricing?model_id=claude-opus-5&requests_per_day=1000");

  await page.waitForURL(/\/login\?next=/);
  await expect(page.getByRole("button", { name: /sign in|log in/i })).toBeVisible();
});

test("a run is waiting on the dashboard afterwards", async ({ page }) => {
  await signUpAndIn(page, uniqueEmail("recent"), { name: "Workspace Test" });

  await page.goto("/cost/llm-pricing?model_id=claude-opus-5&requests_per_day=1000");
  await run(page);
  await expectRealNumber(page);

  await page.goto("/dashboard");
  const recent = page.getByRole("link", { name: /LLM Pricing/i });
  await expect(recent.first()).toBeVisible();
});

test("a run reopens with its inputs restored", async ({ page }) => {
  await signUpAndIn(page, uniqueEmail("reopen"), { name: "Workspace Test" });

  await page.goto("/cost/llm-pricing?model_id=claude-opus-5&requests_per_day=4242");
  await run(page);
  await expectRealNumber(page);

  await page.goto("/dashboard");
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
  await signUpAndIn(page, uniqueEmail("keep"), { name: "Workspace Test" });

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
