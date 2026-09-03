import { expect, test } from "@playwright/test";

import { expectProvenance, run, signedIn } from "./helpers";

/**
 * Compare Center, against the real backend.
 *
 * A comparison's output is a recommendation, not a figure, so these assert
 * that one option is actually named as the winner. A matrix that renders with
 * no winner is the failure mode — it looks like a working table and answers
 * nothing.
 */

const COMPARISONS = [
  { path: "/compare/models", name: "models" },
  { path: "/compare/vector-db", name: "vector databases" },
  { path: "/compare/stacks", name: "stack archetypes" },
  { path: "/compare/build-vs-buy", name: "build against buy" },
];

for (const { path, name } of COMPARISONS) {
  test(`comparing ${name} names a winner and explains it`, async ({ page }) => {
    await page.goto(path);
    await run(page, "Compare");

    // The recommendation banner. Present for every comparison, by contract.
    const recommendation = page.getByTestId("comparison-winner");
    await expect(recommendation).toBeVisible({ timeout: 20_000 });
    await expect(recommendation).not.toBeEmpty();

    // A score with no reasoning is an assertion, not an argument.
    await expect(page.getByTestId("comparison-rationale")).toBeVisible();
  });
}

signedIn("compare");

test("a comparison reports its confidence", async ({ page }) => {
  await page.goto("/compare/models");
  await run(page, "Compare");

  await expect(page.getByText(/high|medium|low/i).first()).toBeVisible({ timeout: 20_000 });
  await expectProvenance(page);
});

test("comparing fewer than two models is refused client-side", async ({ page }) => {
  await page.goto("/compare/models?model_ids=gpt-4o-mini");
  await run(page, "Compare");

  await expect(page.getByText(/at least two models/i)).toBeVisible();
});
