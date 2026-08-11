import { expect, test, type Page } from "@playwright/test";

import { run } from "./helpers";

/**
 * M20 — pricing, quota, and the gate, against the real backend.
 *
 * What is *not* here: completing a Stripe checkout. That needs a test-mode key
 * this environment does not have, and asserting against a mocked redirect would
 * prove the button navigates and nothing more. The backend suite covers the
 * checkout-to-upgrade path end to end with a fake client and hand-built webhook
 * deliveries, which is where the interesting failure — a duplicate delivery
 * applying twice — actually lives.
 *
 * What is here is everything a browser is needed for: that the pricing page
 * renders real limits from the API, that hitting the anonymous cap produces the
 * dialog with real figures rather than a dead end, and that the locked export
 * formats explain themselves.
 */

const PASSWORD = "Forge-Billing-99";

function uniqueEmail(label: string) {
  return `e2e-${label}-${test.info().workerIndex}@stackforge-e2e.com`;
}

async function signUpAndIn(page: Page, email: string) {
  await page.goto("/signup");
  await page.getByLabel("Name").fill("Billing Test");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: false }).fill(PASSWORD);
  await page.getByRole("button", { name: /create account|sign up/i }).click();
  await expect(page.getByText(/check your email/i)).toBeVisible();

  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: false }).fill(PASSWORD);
  await page.getByRole("button", { name: /sign in|log in/i }).click();
  await page.waitForURL(/\/dashboard/);
}

test("the pricing page renders every plan, signed out", async ({ page }) => {
  await page.goto("/pricing");

  await expect(page.getByRole("heading", { name: "Pricing" })).toBeVisible();
  for (const plan of ["Free", "Pro", "Team", "Enterprise"]) {
    await expect(page.getByRole("heading", { name: plan, exact: true })).toBeVisible();
  }

  // The price comes from the server, not from copy in the page.
  await expect(page.getByText("$19", { exact: true })).toBeVisible();
  // And so do the limits, including the unlimited ones.
  await expect(page.getByText("Unlimited").first()).toBeVisible();
});

test("annual billing shows the discounted price", async ({ page }) => {
  await page.goto("/pricing");

  await page.getByRole("button", { name: "annual" }).click();

  await expect(page.getByText("$190", { exact: true })).toBeVisible();
  await expect(page.getByText(/Save \$38 a year/)).toBeVisible();
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
  await expect(dialog.getByText("Used")).toBeVisible();
  await expect(dialog.getByText("Limit")).toBeVisible();
  await expect(dialog.getByText("Resets")).toBeVisible();
  await expect(dialog.getByRole("link", { name: /account|Upgrade/i })).toBeVisible();
});

test("a signed-in free user sees their plan and usage on the billing page", async ({ page }) => {
  await signUpAndIn(page, uniqueEmail("billing"));

  await page.goto("/settings/billing");

  await expect(page.getByRole("heading", { name: "Billing" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Usage" })).toBeVisible();
  await expect(page.getByText("Tool runs today")).toBeVisible();
  await expect(page.getByText("Projects", { exact: true })).toBeVisible();

  // Free has no subscription to cancel and nothing to manage in a portal.
  await expect(page.getByRole("button", { name: "Cancel plan" })).toBeHidden();
  await expect(page.getByRole("link", { name: /Upgrade/ })).toBeVisible();
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
