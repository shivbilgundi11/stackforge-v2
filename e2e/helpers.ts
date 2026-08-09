import { expect, type Page } from "@playwright/test";

/**
 * Shared assertions.
 *
 * The one that matters is `expectRealNumber`. A tool that renders `$0.00`, an
 * em dash, or `NaN` has technically produced a result, and every "did it
 * render?" assertion passes. Those are precisely the failures this product
 * cannot ship: the number *is* the product, and a plausible-looking wrong one
 * is worse than a visible error.
 */

/** The headline figure of the first metric strip. */
export function headline(page: Page) {
  return page.locator('[data-slot="metric-value"]').first();
}

export async function run(page: Page, label = "Calculate") {
  await page.getByRole("button", { name: label, exact: false }).click();
}

/**
 * Assert a rendered figure is a real computed value.
 *
 * Rejects the four ways this can look fine and be broken: an em dash for a
 * missing key, `NaN` from a string reaching arithmetic, `$0.00` from a price
 * that failed to load, and `undefined` rendered as text.
 */
export async function expectRealNumber(page: Page, locator = headline(page)) {
  await expect(locator).toBeVisible({ timeout: 20_000 });
  const text = (await locator.textContent())?.trim() ?? "";

  expect(text, "no figure rendered").not.toBe("");
  expect(text, "rendered an em dash — a metric key is missing").not.toBe("—");
  expect(text, "rendered NaN — a decimal string reached arithmetic").not.toMatch(/NaN/i);
  expect(text, "rendered undefined as text").not.toMatch(/undefined/i);
  expect(text, "rendered a zero — pricing probably failed to load").not.toMatch(/^\$?0(\.0+)?$/);
  expect(text, `"${text}" contains no digits`).toMatch(/\d/);

  return text;
}

/** Provenance is the trust claim; a result without it is not finished. */
export async function expectProvenance(page: Page) {
  await expect(page.getByText(/verified/i).first()).toBeVisible({ timeout: 20_000 });
}
