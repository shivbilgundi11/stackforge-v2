import { expect, test } from "@playwright/test";

import { run } from "./helpers";

/**
 * The flagship, against the real backend.
 *
 * Two claims are worth an end-to-end test and cannot be made anywhere else:
 * an anonymous visitor gets a complete recommendation with no account and no
 * AI key configured, and a hard constraint removes components from the answer
 * rather than ranking them down.
 *
 * The generous timeout is for a machine with no Redis. Every cache and quota
 * read fails open, and failing open still costs a connect attempt each — a
 * recommendation touches nine of them. With Redis up this returns in well
 * under a second.
 */

const RECOMMEND_TIMEOUT = 45_000;

test("an anonymous visitor gets a scored stack with no account", async ({ page }) => {
  await page.goto("/stack-architect/new");
  await run(page, "Design my stack");

  const score = page.getByLabel(/stack score \d+ out of 100/i);
  await expect(score).toBeVisible({ timeout: RECOMMEND_TIMEOUT });

  // A real score, not a zero from a stack that failed to assemble.
  const label = (await score.getAttribute("aria-label")) ?? "";
  const value = Number(label.match(/(\d+)/)?.[1] ?? 0);
  expect(value).toBeGreaterThan(0);
  expect(value).toBeLessThanOrEqual(100);

  await expect(page.getByRole("heading", { name: "Components" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Score breakdown" })).toBeVisible();
});

test("a restricted-data constraint eliminates rather than ranks down", async ({ page }) => {
  await page.goto("/stack-architect/new?sensitivity=restricted");
  await run(page, "Design my stack");

  await expect(page.getByRole("heading", { name: "Components" })).toBeVisible({
    timeout: RECOMMEND_TIMEOUT,
  });

  // Every recommended component can run inside the network.
  const managedOnly = page.getByText("managed only");
  await expect(managedOnly).toHaveCount(0);

  // And the exclusions are shown, not silently dropped.
  const exclusions = page.getByRole("heading", { name: /\d+ tools excluded/ });
  await expect(exclusions).toBeVisible();
});

test("the compatibility checker scores an arbitrary set", async ({ page }) => {
  await page.goto("/stack-architect/compatibility");
  await run(page, "Score this set");

  const headline = page.locator('[data-slot="metric-value"]').first();
  await expect(headline).toBeVisible({ timeout: RECOMMEND_TIMEOUT });
  await expect(headline).not.toHaveText("—");
});
