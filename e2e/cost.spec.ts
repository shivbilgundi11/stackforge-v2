import { expect, test } from "@playwright/test";

import { expectProvenance, expectRealNumber, headline, run } from "./helpers";

/**
 * WF1 — Cost Planner, against the real backend.
 *
 * Each test starts from a fresh browser context, so each gets its own
 * anonymous session and its own 5-run allowance.
 */

test("llm-pricing computes a real monthly figure", async ({ page }) => {
  await page.goto("/cost/llm-pricing");
  await run(page);

  await expectRealNumber(page);
  await expectProvenance(page);
});

test("llm-pricing prices prompt caching lower than none", async ({ page }) => {
  // The arithmetic is unit-tested on the backend. What this proves is that the
  // slider's value actually reaches it — a control that looks right and sends
  // nothing produces a confident, unchanged, wrong answer.
  await page.goto(
    "/cost/llm-pricing?model_id=claude-opus-5&input_tokens=4000&output_tokens=800" +
      "&requests_per_day=1000&cached_input_ratio=0",
  );
  await run(page);
  const uncached = await expectRealNumber(page, page.getByText("$833.99").or(headline(page)));

  await page.goto(
    "/cost/llm-pricing?model_id=claude-opus-5&input_tokens=4000&output_tokens=800" +
      "&requests_per_day=1000&cached_input_ratio=0.7",
  );
  await run(page);
  const cached = await expectRealNumber(page);

  const toNumber = (text: string) => Number(text.replace(/[^0-9.]/g, ""));
  expect(toNumber(cached), "caching 70% of input must cost less").toBeLessThan(toNumber(uncached));
});

test("token-calculator counts pasted text", async ({ page }) => {
  await page.goto("/cost/token-calculator");
  await page.getByLabel(/^text$/i).fill("The quick brown fox jumps over the lazy dog. ".repeat(40));

  await run(page, "Count tokens");
  await expectRealNumber(page);
});

test("token-calculator refuses to run on empty input", async ({ page }) => {
  // A validation message, not a request. The 422 path is component-tested;
  // this checks the client-side schema stops it first.
  await page.goto("/cost/token-calculator");
  await run(page, "Count tokens");

  await expect(page.getByText(/paste some text to count/i)).toBeVisible();
});

test("embedding-cost computes ingestion for a corpus", async ({ page }) => {
  await page.goto("/cost/embedding-cost");
  await run(page);

  await expectRealNumber(page);
  await expectProvenance(page);
});

test("budget-estimator totals a workload line", async ({ page }) => {
  await page.goto("/cost/budget-estimator");
  await run(page);

  await expectRealNumber(page);
  // The projection is the reason to use this over the single-model calculator.
  await expect(page.getByText(/12-month projection/i)).toBeVisible();
});
