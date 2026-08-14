import { expect, test } from "@playwright/test";

import { run, signUpAndIn, uniqueEmail } from "./helpers";

/**
 * M20 — pricing, quota, and the gate, against the real backend.
 *
 * What is *not* here: authorizing a mandate in Razorpay Checkout. Driving
 * a third party's page from a browser test asserts their markup, not ours. The
 * backend suite covers the checkout-to-upgrade path end to end with a fake
 * client and hand-built webhook deliveries, which is where the interesting
 * failure — a duplicate delivery applying twice — actually lives.
 *
 * What is here is everything a browser is needed for: that the pricing page
 * renders real limits from the API, that hitting the anonymous cap produces the
 * dialog with real figures rather than a dead end, and that the locked export
 * formats explain themselves.
 */

test("the pricing page renders every plan, signed out", async ({ page }) => {
  await page.goto("/pricing");

  await expect(page.getByRole("heading", { name: "Pricing" })).toBeVisible();
  for (const plan of ["Free", "Pro", "Team", "Enterprise"]) {
    await expect(page.getByRole("heading", { name: plan, exact: true })).toBeVisible();
  }

  // The price comes from the server, not from copy in the page.
  await expect(page.getByText("₹1,599", { exact: true })).toBeVisible();
  // And so do the limits, including the unlimited ones.
  await expect(page.getByText("Unlimited").first()).toBeVisible();
});

test("annual billing shows the discounted price", async ({ page }) => {
  await page.goto("/pricing");

  await page.getByRole("button", { name: "annual" }).click();

  await expect(page.getByText("₹15,999", { exact: true })).toBeVisible();
  await expect(page.getByText(/Save ₹3,189 a year/)).toBeVisible();
});

test("an anonymous visitor is offered an account rather than a card", async ({ page }) => {
  await page.goto("/pricing");

  const cta = page.getByRole("link", { name: /Start 7-day trial/ }).first();
  await expect(cta).toHaveAttribute("href", /\/signup/);
});

test("the sidebar meter shows the anonymous allowance", async ({ page }) => {
  await page.goto("/cost/llm-pricing?model_id=claude-opus-5&requests_per_day=1000");
  await run(page);

  // The gate has to be visible before it is hit — that is the only moment it
  // can convert rather than annoy.
  await expect(page.getByText(/anonymous plan/i)).toBeVisible();
  await expect(page.getByText(/Tool runs today/i)).toBeVisible();
});

test("hitting the anonymous cap shows the dialog with real figures", async ({ page }) => {
  await page.goto("/cost/llm-pricing?model_id=claude-opus-5&requests_per_day=1000");

  // The anonymous allowance is five a day (D-17). One more than that.
  for (let attempt = 0; attempt < 6; attempt += 1) {
    await page
      .getByRole("button", { name: /^Run$|Calculate/i })
      .first()
      .click();
    await page.waitForTimeout(400);
    if (
      await page
        .getByRole("dialog")
        .isVisible()
        .catch(() => false)
    )
      break;
  }

  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText(/Daily limit reached/i)).toBeVisible();
  // Figures, not a dead end: the reader has to be able to choose between
  // waiting and paying.
  await expect(dialog.getByText("Used", { exact: true })).toBeVisible();
  await expect(dialog.getByText("Limit", { exact: true })).toBeVisible();
  await expect(dialog.getByText("Resets", { exact: true })).toBeVisible();
  await expect(dialog.getByRole("link", { name: /account|Upgrade/i })).toBeVisible();
});

test("a signed-in free user sees their plan and usage on the billing page", async ({ page }) => {
  await signUpAndIn(page, uniqueEmail("billing"), { name: "Billing Test" });

  await page.goto("/settings/billing");

  await expect(page.getByRole("heading", { name: "Billing" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Usage" })).toBeVisible();

  // Scoped to the panel. Every meter label is also a word in the shell — the
  // sidebar has a "Projects" link and the quota strip carries "Tool runs
  // today" — so a page-wide match asserts that the navigation exists, which is
  // not what this test is about and is not what breaks.
  const usage = page.locator("#usage");
  await expect(usage.getByText("Tool runs today", { exact: true })).toBeVisible();
  await expect(usage.getByText("Projects", { exact: true })).toBeVisible();

  // Free has no subscription to cancel and nothing to manage in a portal.
  // Scoped to the plan panel, like the meters above: the quota strip in the
  // sidebar carries its own "Upgrade for unlimited" link, and matching both
  // makes the assertion about the shell rather than about the plan.
  const plan = page.locator("#plan");
  await expect(plan.getByRole("button", { name: "Cancel plan" })).toBeHidden();
  await expect(plan.getByRole("link", { name: "Upgrade", exact: true })).toBeVisible();
});

test("a locked export format explains what it is, not just that it is locked", async ({ page }) => {
  await page.goto("/cost/llm-pricing?model_id=claude-opus-5&requests_per_day=1000");
  await run(page);

  await page
    .getByRole("button", { name: /Export/i })
    .first()
    .click();
  const pdf = page.getByRole("button", { name: /PDF/i }).first();
  await pdf.click();

  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  // The pitch, not the wall: nobody buys something nobody described.
  await expect(dialog.getByText(/paginated|cover page|send to a client/i)).toBeVisible();
  await expect(dialog.getByText(/Markdown export is free/i)).toBeVisible();
});
