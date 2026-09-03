import { expect, test } from "@playwright/test";

import { expectRealNumber, run, signUpAndIn, uniqueEmail } from "./helpers";

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

test("a free account can export a result as Markdown", async ({ page }) => {
  await signUpAndIn(page, uniqueEmail("export-md"));
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
  await signUpAndIn(page, uniqueEmail("share"), { name: "Exports Test" });

  await page.goto("/cost/llm-pricing?model_id=claude-opus-5&requests_per_day=1000");
  await run(page);
  await expectRealNumber(page);

  // Wait for the signed-in state before opening the dialog. The access token
  // lives in a module closure, so a full navigation drops it and the provider
  // re-acquires one from the refresh cookie on mount. Until that lands the
  // page renders as though signed out, and `AuthGuard` holds a skeleton over
  // it until the session lands.
  await expect(page.getByRole("button", { name: /keep this run/i })).toBeVisible();

  await page.getByRole("button", { name: "Share", exact: true }).click();
  await page.getByRole("button", { name: /create link/i }).click();

  const field = page.getByLabel("Your link");
  await expect(field).toBeVisible({ timeout: 20_000 });
  const url = await field.inputValue();
  expect(url).toMatch(/\/s\/[\w-]{20,}$/);

  // Follow the *path*, not the absolute URL. The backend builds the link from
  // its own `WEB_BASE_URL`, which is the developer's dev server on port 3000 —
  // a port this suite deliberately does not use, because reusing it would
  // adopt whatever `next dev` was already serving. Navigating to the origin
  // the backend named fails with ERR_CONNECTION_REFUSED and looks like a
  // broken share link. The absolute form is asserted above; what is under test
  // here is whether the token opens for a stranger and dies on revoke.
  const path = new URL(url).pathname;

  // A genuinely separate context: no cookies, no token, no storage. This is
  // the recipient, not the owner with the dialog still open.
  const stranger = await browser.newContext();
  try {
    const visitor = await stranger.newPage();
    const response = await visitor.goto(path);

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
    const after = await visitor.goto(path);
    expect(after?.status()).toBe(404);
  } finally {
    await stranger.close();
  }
});
