import { expect, test } from "@playwright/test";

/**
 * M19 — the template library, against the real backend.
 *
 * The load-bearing test is the first one. Everything else in this suite could
 * pass with the content assembled client-side, and that would make the library
 * invisible to the crawler it exists for. So the check is on the *response
 * body* rather than on the rendered DOM: `page.goto` returns the HTML the
 * server sent, before any JavaScript has run.
 */

test("template prose is in the server-rendered HTML, not assembled by the client", async ({
  page,
}) => {
  const response = await page.goto("/resources/templates/rag-chatbot");
  const html = (await response?.text()) ?? "";

  // A phrase from deep in the body, so this cannot pass on the metadata alone.
  expect(html).toContain("Where this goes wrong");
  expect(html).toContain("Chunking is the whole game");
  // Structured data and the canonical, which are the rest of the SEO claim.
  expect(html).toContain("application/ld+json");
  expect(html).toContain('rel="canonical"');
});

test("a premium template previews its body and gates the files", async ({ page }) => {
  const response = await page.goto("/resources/templates/fastapi-rag");
  const html = (await response?.text()) ?? "";

  // Previewed, not hidden — the page is indexable either way.
  expect(html).toContain("A working retrieval service");
  // The body is not.
  expect(html).not.toContain("class Settings(BaseSettings)");

  await expect(
    page.getByRole("heading", { name: /the rest of this template is on pro/i }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: /upgrade to pro/i })).toBeVisible();
});

test("a stack template opens the Architect pre-filled and it runs", async ({ page }) => {
  await page.goto("/resources/templates/rag-chatbot");
  await page.getByRole("link", { name: /use this stack/i }).click();

  await page.waitForURL(/\/stack-architect\/new\?/);

  // The template's constraints, on the form rather than only in the URL.
  await expect(page.getByLabel(/monthly budget/i)).toHaveValue("2000");

  await page.getByRole("button", { name: /design my stack/i }).click();

  // The Architect renders its headline through a bespoke score ring rather
  // than a metric tile, so this reads the same label `architect.spec.ts` does.
  const score = page.getByLabel(/stack score \d+ out of 100/i);
  await expect(score).toBeVisible({ timeout: 20_000 });

  // A real recommendation scored against today's catalog — which is what makes
  // a stack template part of the product rather than a description of one that
  // goes stale the moment the catalog moves.
  const label = (await score.getAttribute("aria-label")) ?? "";
  expect(Number(/(\d+)/.exec(label)?.[1])).toBeGreaterThan(0);
});

test("filtering the library round-trips through the URL", async ({ page }) => {
  await page.goto("/resources/templates");

  await page.getByRole("button", { name: "Checklists", exact: true }).click();
  await page.waitForURL(/category=checklist/);

  const cards = page.getByRole("link", { name: /checklist/i });
  await expect(page.getByText(/^4 templates$/)).toBeVisible();

  // The filtered view is a link someone can send — which is most of why the
  // filters live in the URL at all.
  await page.reload();
  await expect(page.getByRole("button", { name: "Checklists", exact: true })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(page.getByText(/^4 templates$/)).toBeVisible();
  await expect(cards.first()).toBeVisible();
});

test("search finds a template by a term only in its body", async ({ page }) => {
  await page.goto("/resources/templates");

  await page.getByRole("searchbox", { name: /search templates/i }).fill("barge-in");
  await page.waitForURL(/q=barge-in/);

  await expect(page.getByRole("link", { name: /voice ai blueprint/i })).toBeVisible();
});

test("a multi-file starter shows a file tree with per-file copy", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto("/resources/templates/dockerised-rag");

  const files = page.getByRole("navigation", { name: /files in this starter/i });
  await expect(files).toBeVisible();
  await expect(
    files.getByRole("button", { name: "docker-compose.yml", exact: true }),
  ).toBeVisible();

  await files.getByRole("button", { name: "app/main.py", exact: true }).click();
  await expect(page.getByText("Ingest and ask, against local Ollama")).toBeVisible();

  await page.getByRole("button", { name: /copy file/i }).click();
  const copied = await page.evaluate(() => navigator.clipboard.readText());
  expect(copied).toContain("FastAPI");
});

test("the library is reachable without an account", async ({ page }) => {
  // `/resources` used to be in ACCOUNT_ONLY_PREFIXES, which would have
  // redirected this to /login and wasted the whole acquisition channel.
  await page.goto("/resources");

  await expect(page).toHaveURL(/\/resources$/);
  await expect(page.getByRole("heading", { name: "Resources" })).toBeVisible();
  await expect(page.getByRole("link", { name: /stack templates/i })).toBeVisible();
});

test("the sitemap lists every template", async ({ request }) => {
  const response = await request.get("/sitemap.xml");
  const xml = await response.text();

  expect(xml).toContain("/resources/templates/rag-chatbot");
  expect(xml).toContain("/resources/templates/ai-production-readiness");
  // Account-only routes are excluded — crawling them teaches a search engine
  // that the site is mostly a login page.
  expect(xml).not.toContain("/dashboard");
});
