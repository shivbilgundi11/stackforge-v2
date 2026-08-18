import { expect, test } from "@playwright/test";

/**
 * The marketing site (M22).
 *
 * Three things here are worth more than the rest: that no navigation item
 * points at a page that does not exist, that the pricing page agrees with the
 * plan configuration the checkout charges from, and that these pages render
 * with the API down. Each of those is a failure the previous build actually
 * shipped — a nav pointing at redirects, a hand-maintained price table, and an
 * acquisition surface that went dark whenever the application did.
 */

const ROUTES = [
  { path: "/", heading: /Plan your AI stack before you build it/i },
  { path: "/features", heading: /Everything you need to argue for a stack/i },
  { path: "/pricing", heading: /Every tool is open/i },
  { path: "/faq", heading: /Questions worth a straight answer/i },
  { path: "/about", heading: /The planning layer that should already exist/i },
  { path: "/contact", heading: /Get in touch/i },
  { path: "/legal/privacy", heading: /Privacy/i },
  { path: "/legal/terms", heading: /Terms/i },
] as const;

for (const route of ROUTES) {
  test(`${route.path} renders its heading`, async ({ page }) => {
    const response = await page.goto(route.path);
    expect(response?.status(), `${route.path} should be 200`).toBe(200);
    await expect(page.getByRole("heading", { name: route.heading }).first()).toBeVisible();
  });
}

test("no navigation item points at a page that does not exist", async ({ page, request }) => {
  await page.goto("/");

  const hrefs = await page
    .locator("header a[href^='/'], footer a[href^='/']")
    .evaluateAll((links) =>
      Array.from(
        new Set(links.map((link) => link.getAttribute("href")).filter(Boolean) as string[]),
      ),
    );

  expect(hrefs.length, "expected the header and footer to link somewhere").toBeGreaterThan(10);

  for (const href of hrefs) {
    const response = await request.get(href);
    expect(response.status(), `${href} is linked but does not resolve`).toBeLessThan(400);
  }
});

test("nothing on the marketing site links into the application", async ({ page }) => {
  // The marketing site used to link at the workbench from three places: the
  // footer's directory of workflow hubs, "Templates" in the header, and the
  // call-to-action on every feature. All of them resolved — those routes are
  // public to anonymous visitors by design (D-17) — so no link was broken and
  // the link-integrity test above passed the whole time.
  //
  // Following any of them still swapped the marketing chrome for the
  // application shell mid-browse: sidebar, command palette, breadcrumbs, and no
  // route back to the site being read. The only sanctioned crossing is signing
  // up or signing in, which are standalone pages rather than the workbench.
  //
  // This asserts over *every* link, not just the navigation, because the last
  // pass fixed the nav and left seven call-to-action buttons pointing straight
  // at the tools.
  const MARKETING = ["/", "/features", "/pricing", "/faq", "/about", "/contact", "/legal"];
  const AUTH = ["/login", "/signup"];

  for (const path of ["/", "/features", "/pricing", "/faq", "/about", "/contact"]) {
    await page.goto(path);

    const hrefs = await page
      .locator("a[href^='/']")
      .evaluateAll((links) =>
        Array.from(new Set(links.map((link) => link.getAttribute("href") ?? "").filter(Boolean))),
      );

    expect(hrefs.length, `${path} should link somewhere`).toBeGreaterThan(3);

    for (const href of hrefs) {
      const route = href.split("#")[0] || "/";
      const allowed =
        AUTH.includes(route) ||
        MARKETING.some((prefix) =>
          prefix === "/" ? route === "/" : route === prefix || route.startsWith(`${prefix}/`),
        );
      expect(allowed, `${path} links to ${href}, which is an application route`).toBe(true);
    }
  }
});

test("the pricing page renders the plans the API actually configures", async ({
  page,
  request,
}) => {
  // The whole point of this page reading from `GET /billing/plans`: a
  // hand-maintained price table drifts from the billing configuration, and the
  // drift is invisible until a customer is quoted one number and charged
  // another.
  const api = await request.get("http://localhost:8000/api/v1/billing/plans");
  expect(api.ok()).toBeTruthy();
  const plans = (await api.json()).data as { key: string; label: string }[];

  await page.goto("/pricing");
  for (const plan of plans) {
    await expect(
      page.getByText(plan.label, { exact: false }).first(),
      `the ${plan.key} plan is configured but not shown`,
    ).toBeVisible();
  }
});

test("product screenshots ship in both themes", async ({ page, request }) => {
  // A screenshot baked in one theme is the most obvious way for a themed page
  // to look broken, so every shot is captured twice and swapped on `.dark`.
  await page.goto("/features");

  const sources = await page
    .locator("figure img")
    .evaluateAll((images) => images.map((image) => image.getAttribute("src") ?? ""));

  const stems = new Set(
    sources
      .map((src) => /\/marketing\/(.+?)-(light|dark)\.png/.exec(decodeURIComponent(src))?.[1])
      .filter(Boolean) as string[],
  );
  expect(stems.size, "expected a screenshot per feature").toBeGreaterThanOrEqual(6);

  for (const stem of stems) {
    for (const theme of ["light", "dark"]) {
      const response = await request.get(`/marketing/${stem}-${theme}.png`);
      expect(response.status(), `${stem}-${theme}.png is referenced but missing`).toBe(200);
    }
  }
});

test("the FAQ publishes structured data that matches what it renders", async ({ page }) => {
  await page.goto("/faq");

  const raw = await page.locator('script[type="application/ld+json"]').first().textContent();
  const parsed = JSON.parse(raw ?? "{}") as {
    "@type": string;
    mainEntity: { name: string; acceptedAnswer: { text: string } }[];
  };

  expect(parsed["@type"]).toBe("FAQPage");
  expect(parsed.mainEntity.length).toBeGreaterThanOrEqual(8);

  // Structured data that has drifted from the visible answer is worse than
  // none, because the stale copy is what gets surfaced in search.
  for (const entry of parsed.mainEntity.slice(0, 3)) {
    await expect(page.getByText(entry.name, { exact: false }).first()).toBeVisible();
  }
});

test("the sitemap lists the marketing pages and excludes the noindex ones", async ({ request }) => {
  const response = await request.get("/sitemap.xml");
  expect(response.ok()).toBeTruthy();
  const xml = await response.text();

  for (const path of ["/features", "/pricing", "/faq", "/about", "/contact"]) {
    expect(xml, `${path} is public but missing from the sitemap`).toContain(path);
  }

  // Both legal pages are noindex while they await counsel review. Listing a
  // noindex URL in the sitemap tells a crawler two contradictory things.
  expect(xml).not.toContain("/legal/");
});

test("marketing pages render with the API unavailable", async ({ page }) => {
  // Static generation is not only a performance choice here: the acquisition
  // surface should not go dark because the application is restarting.
  await page.route("**/api/v1/**", (route) => route.abort());

  const response = await page.goto("/");
  expect(response?.status()).toBe(200);
  await expect(
    page.getByRole("heading", { name: /Plan your AI stack before you build it/i }),
  ).toBeVisible();

  await page.goto("/features");
  await expect(
    page.getByRole("heading", { name: /Everything you need to argue for a stack/i }),
  ).toBeVisible();
});
