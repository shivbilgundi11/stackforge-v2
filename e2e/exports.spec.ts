import { expect, test, type Page } from "@playwright/test";

import { expectRealNumber, run } from "./helpers";

/**
 * M18 — exports and share links, against the real backend.
 *
 * The share test is the one that could not be written anywhere else. Revoking
 * a link is asserted by opening it in a **separate browser context** — a real
 * incognito visitor with no cookies, no token, and no shared storage. Checking
 * a revoke in the same context proves the owner's session sees the change;
 * checking it in a clean one proves the capability is actually dead, which is
 * the property the whole design rests on.
 */

const PASSWORD = "Forge-Exports-99";

function uniqueEmail(label: string) {
  // Matches the convention in `workspace.spec.ts`: a real-looking TLD, stable
  // across runs so a repeatedly-run suite does not fill the dev database.
  return `e2e-${label}-${test.info().workerIndex}@stackforge-e2e.com`;
}

async function signUpAndIn(page: Page, email: string) {
  await page.goto("/signup");
  await page.getByLabel("Name").fill("Exports Test");
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

test("an anonymous visitor can export a result as Markdown", async ({ page }) => {
  await page.goto("/cost/llm-pricing?model_id=claude-opus-5&requests_per_day=1000");
  await run(page);
  await expectRealNumber(page);

  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: /Export as Markdown/i }).click(),
  ]);

  expect(download.suggestedFilename()).toMatch(/\.md$/);
  const stream = await download.createReadStream();
  const chunks: Buffer[] = [];
  for await (const chunk of stream) chunks.push(chunk as Buffer);
  const text = Buffer.concat(chunks).toString("utf8");

  // Real content, not an empty file with the right extension.
  expect(text).toMatch(/^#\s/m);
  expect(text).toMatch(/Figures/);
  // Provenance survives the export. A number whose source disappears the
  // moment it leaves the app is worse than one that never had a source.
  expect(text).toMatch(/verified/i);
});

test("a locked format shows the upgrade path rather than doing nothing", async ({ page }) => {
  await page.goto("/cost/llm-pricing?model_id=claude-opus-5&requests_per_day=1000");
  await run(page);
  await expectRealNumber(page);

  await page.getByRole("button", { name: /Export as PDF/i }).click();

  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText(/pro/i);
  // The free format is named in the dialog, so the paywall is not a dead end.
  await expect(dialog).toContainText(/Markdown export is free/i);
});

test("a share link opens for a stranger and dies on revoke", async ({ page, browser }) => {
  await signUpAndIn(page, uniqueEmail("share"));

  await page.goto("/cost/llm-pricing?model_id=claude-opus-5&requests_per_day=1000");
  await run(page);
  await expectRealNumber(page);

  // Wait for the signed-in state before opening the dialog. The access token
  // lives in a module closure, so a full navigation drops it and the provider
  // re-acquires one from the refresh cookie on mount. Until that lands the
  // page renders its anonymous variant — and the share dialog's anonymous
  // variant has no "create link" button, only the reason there isn't one.
  await expect(page.getByRole("button", { name: /keep this run/i })).toBeVisible();

  await page.getByRole("button", { name: "Share", exact: true }).click();
  await page.getByRole("button", { name: /create link/i }).click();

  const field = page.getByLabel("Your link");
  await expect(field).toBeVisible({ timeout: 20_000 });
  const url = await field.inputValue();
  expect(url).toMatch(/\/s\/[\w-]{20,}$/);

  // A genuinely separate context: no cookies, no token, no storage. This is
  // the recipient, not the owner with the dialog still open.
  const stranger = await browser.newContext();
  try {
    const visitor = await stranger.newPage();
    const response = await visitor.goto(url);

    expect(response?.status()).toBe(200);
    // `noindex` on the page itself, not only in the API header.
    await expect(visitor.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/i);
    await expect(visitor.getByRole("heading", { name: /plan your own stack/i })).toBeVisible();
    // Nothing about the owner reaches the page.
    await expect(visitor.locator("body")).not.toContainText("stackforge-e2e.com");

    await page.getByRole("button", { name: /revoke/i }).click();
    await expect(page.getByText(/revoked/i).first()).toBeVisible();

    // Reloaded in the stranger's context, which never held a session to
    // invalidate — so a 404 here is the token being dead, not a cache miss.
    const after = await visitor.goto(url);
    expect(after?.status()).toBe(404);
  } finally {
    await stranger.close();
  }
});
