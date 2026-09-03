import { expect, test } from "@playwright/test";

import { expectRealNumber, run, signedIn } from "./helpers";

/**
 * The two paths that only exist across a navigation.
 *
 * Both were built as one component talking to another through a store or a
 * URL, so neither is provable in a single-component test — and both fail
 * quietly rather than loudly when they break.
 */

signedIn("workflow");

test("a cost result carries into the budget estimator", async ({ page }) => {
  await page.goto(
    "/cost/llm-pricing?model_id=claude-opus-5&input_tokens=4000&output_tokens=800" +
      "&requests_per_day=250&cached_input_ratio=0",
  );
  await run(page);
  await expectRealNumber(page);

  await page.getByRole("button", { name: /add as a workload/i }).click();

  await expect(page).toHaveURL(/\/cost\/budget-estimator$/);

  // The figures arrived, rather than the destination's defaults.
  await expect(page.getByLabel(/req\/day/i)).toHaveValue("250");
  await expect(page.getByLabel(/^in$/i)).toHaveValue("4000");

  // And the carried state is actually runnable.
  await run(page);
  await expectRealNumber(page);
});

test("a run reopened from history restores its inputs and its result", async ({ page }) => {
  // The case that made shared coercion necessary: decimals cross the wire as
  // strings, so a stored 0.7 put the slider at 0% beside a result computed at
  // 70%. Nothing throws — the page just disagrees with itself.
  await page.goto(
    "/cost/llm-pricing?model_id=claude-opus-5&input_tokens=4000&output_tokens=800" +
      "&requests_per_day=1000&cached_input_ratio=0.7",
  );
  await run(page);
  const live = await expectRealNumber(page);

  await page.goto("/cost");

  // Scoped to the panel: the sidebar carries a link with the same accessible
  // name, and an unscoped match navigates to a blank tool instead of the run.
  const feed = page.getByTestId("recent-runs");
  await expect(feed).toBeVisible({ timeout: 20_000 });

  await feed
    .getByRole("link", { name: /LLM Pricing Calculator/i })
    .first()
    .click();
  await expect(page).toHaveURL(/[?&]run=run_/);

  // Same figure, and the slider agrees with it.
  await expect(page.locator('[data-slot="metric-value"]').first()).toHaveText(live);
  await expect(page.getByRole("slider")).toHaveAttribute("aria-valuenow", "0.7");
});

test("hub pages show no history panel before anything has been run", async ({ page }) => {
  // An empty "no history" panel above a grid of tools nobody has used is
  // noise, so the panel renders nothing at all until there is something in it.
  await page.goto("/compare");

  await expect(page.getByRole("heading", { name: /compare center/i })).toBeVisible();
  await expect(page.getByTestId("recent-runs")).toHaveCount(0);
});
