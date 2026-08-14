import { expect, test } from "@playwright/test";

import { expectRealNumber, run, signUpAndIn, uniqueEmail } from "./helpers";

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

test("a run made before signing up is waiting on the dashboard after", async ({ page }) => {
  await page.goto("/cost/llm-pricing?model_id=claude-opus-5&requests_per_day=1000");
  await run(page);
  await expectRealNumber(page);

  // Signed out, the result carries the ask rather than a save button.
  await expect(page.getByText(/kept for 30 days/i)).toBeVisible();

  await signUpAndIn(page, uniqueEmail("claim"), { name: "Workspace Test" });

  // The claim happens in the login handler, so the run is already on the
  // account by the time the dashboard renders.
  const recent = page.getByRole("link", { name: /LLM Pricing/i });
  await expect(recent.first()).toBeVisible();
});

test("a claimed run reopens with its inputs restored", async ({ page }) => {
  await page.goto("/cost/llm-pricing?model_id=claude-opus-5&requests_per_day=4242");
  await run(page);
  await expectRealNumber(page);

  await signUpAndIn(page, uniqueEmail("reopen"), { name: "Workspace Test" });

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
