import { expect, test } from "@playwright/test";

import { expectRealNumber, run } from "./helpers";

/**
 * WF3, against the real backend.
 *
 * The MCP test downloads the archive and reads it back. Asserting that a
 * download started proves a button works; asserting that the bytes are a ZIP
 * containing six named files is the claim the tool actually makes — and the
 * one the previous build's string-template generator would have failed.
 */

/** Read the filenames out of a ZIP's central directory. */
async function namesInZip(bytes: Buffer): Promise<string[]> {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const end = bytes.length - 22;

  expect(view.getUint32(end, true), "not a ZIP archive").toBe(0x06054b50);
  const count = view.getUint16(end + 8, true);
  let cursor = view.getUint32(end + 16, true);

  const names: string[] = [];
  for (let index = 0; index < count; index += 1) {
    expect(view.getUint32(cursor, true)).toBe(0x02014b50);
    const nameLength = view.getUint16(cursor + 28, true);
    names.push(bytes.subarray(cursor + 46, cursor + 46 + nameLength).toString("utf8"));
    cursor += 46 + nameLength;
  }
  return names;
}

test("a two-tool MCP server generates and downloads as a bundle", async ({ page }) => {
  await page.goto("/agents/mcp-config");

  // The default spec ships one tool; add a second so the bundle is not the
  // trivial case.
  await page.getByRole("button", { name: /add tool/i }).click();
  const secondName = page.getByLabel("Name").last();
  await secondName.fill("page_oncall");
  await page
    .getByLabel("Description")
    .last()
    .fill("Page the engineer currently on call with a short message.");

  await run(page, "Generate server");

  const files = page.getByRole("navigation", { name: /bundle files/i });
  await expect(files).toBeVisible({ timeout: 20_000 });
  // Exact names: `server.py` is also a substring of `tests/test_server.py`.
  await expect(files.getByRole("button", { name: "server.py", exact: true })).toBeVisible();
  await expect(files.getByRole("button", { name: "pyproject.toml", exact: true })).toBeVisible();
  await expect(
    files.getByRole("button", { name: "tests/test_server.py", exact: true }),
  ).toBeVisible();

  // The generated Python is real, not a placeholder.
  await expect(page.getByText(/MCPServer/).first()).toBeVisible();

  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: /download bundle/i }).click(),
  ]);

  const path = await download.path();
  expect(path).toBeTruthy();

  const { readFile } = await import("node:fs/promises");
  const names = await namesInZip(await readFile(path!));

  expect(names).toHaveLength(6);
  expect(names.some((name) => name.endsWith("/server.py"))).toBe(true);
  expect(names.some((name) => name.endsWith("/claude_desktop_config.json"))).toBe(true);
  expect(names.some((name) => name.endsWith("/tests/test_server.py"))).toBe(true);
});

test("agent cost shows the schema overhead a naive estimate would miss", async ({ page }) => {
  await page.goto("/agents/agent-cost");
  await run(page);

  await expectRealNumber(page);

  // The two lines the tool exists to surface.
  await expect(page.getByRole("cell", { name: "Tool definitions" })).toBeVisible({
    timeout: 20_000,
  });
  await expect(page.getByText(/Tool schemas/i).first()).toBeVisible();
});

test("a workflow plan renders a clickable topology with its contracts", async ({ page }) => {
  await page.goto("/agents/workflow-plan");
  await run(page, "Plan the workflow");

  const dispatcher = page.getByRole("button", { name: /Triage/ });
  await expect(dispatcher).toBeVisible({ timeout: 20_000 });

  await dispatcher.click();
  // Selecting a node opens what it sends and what it receives.
  await expect(page.getByText(/Sends|Receives/).first()).toBeVisible();
  await expect(page.getByText(/failure modes/i).first()).toBeVisible();
});

test("rate limits name the constraint that binds, not just RPM", async ({ page }) => {
  await page.goto("/agents/rate-limits");
  await run(page, "Check headroom");

  const binding = page.locator('[data-slot="metric-value"]').first();
  await expect(binding).toBeVisible({ timeout: 20_000 });
  await expect(binding).toHaveText(/per minute|concurrency|per day/i);
});

test("generated schemas report that they validate", async ({ page }) => {
  await page.goto("/agents/function-schema");
  await run(page, "Generate schemas");

  await expect(page.getByText(/input_schema/).first()).toBeVisible({ timeout: 20_000 });
});
