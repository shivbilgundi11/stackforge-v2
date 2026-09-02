/**
 * Recapture the marketing product shots.
 *
 * The fourteen files under `public/marketing/` were captured by hand, and all
 * fourteen carried the Next.js dev tools badge — a red pill in the bottom-left
 * corner, sitting over the sidebar's Settings item, on every product shot the
 * home and features pages render. Hand-captured images have no way to be wrong
 * consistently, which is why this exists as a script rather than as a one-off
 * correction of those fourteen files.
 *
 * Run it against a production build. That is the point: `next dev` paints the
 * badge, and a marketing shot should be of the thing that ships anyway.
 *
 *     STACKFORGE_CAPTURE=1 npx next build
 *     STACKFORGE_CAPTURE=1 npx next start -p 3100
 *     node scripts/capture-marketing.mjs
 *
 * Port 3100 because the backend already allows that origin through CORS, and
 * `STACKFORGE_CAPTURE` because it moves the build into its own directory — so
 * none of this disturbs a dev server already running on :3000.
 *
 * ## One browser context per shot
 *
 * Anonymous visitors get five tool runs a day (D-17) and there are seven
 * shots, so a single session runs out two tools in. A fresh context is a fresh
 * anonymous session, which also keeps the sidebar's plan card reading
 * "Anonymous Plan 0/5" exactly as the current shots do — the alternative,
 * raising the quota for the length of the run, would change the number in the
 * picture.
 */

import { existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { chromium } from "playwright";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "public", "marketing");
const BASE = process.env.CAPTURE_BASE_URL ?? "http://localhost:3100";

/** `ProductShot` declares this pair; the files have to match it. */
const VIEWPORT = { width: 1440, height: 900 };
const SCALE = 2;

/** The seven shots `lib/marketing/content.ts` names, in its order. */
const SHOTS = [
  { stem: "stack-architect", href: "/stack-architect/new" },
  { stem: "llm-pricing", href: "/cost/llm-pricing" },
  { stem: "compare-models", href: "/compare/models" },
  { stem: "rag-architecture", href: "/rag/architecture" },
  { stem: "mcp-config", href: "/agents/mcp-config" },
  { stem: "vram-estimate", href: "/infra/vram-estimate" },
  { stem: "model-roi", href: "/roi/model-roi" },
];

const THEMES = ["light", "dark"];

if (!existsSync(OUT)) mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
const written = [];

try {
  for (const shot of SHOTS) {
    for (const theme of THEMES) {
      // New context per shot *and* per theme: fourteen runs is well past the
      // five one anonymous session gets.
      const context = await browser.newContext({
        viewport: VIEWPORT,
        deviceScaleFactor: SCALE,
        colorScheme: theme,
      });

      // Written before the first paint, so the page never renders in one
      // theme and flips to the other — which a screenshot is fast enough to
      // catch in the act.
      await context.addInitScript(
        ([key, value]) => window.localStorage.setItem(key, value),
        ["stackforge-theme", theme],
      );

      const page = await context.newPage();
      const errors = [];
      page.on("console", (message) => {
        if (message.type() === "error") errors.push(message.text());
      });

      await page.goto(`${BASE}${shot.href}`, { waitUntil: "domcontentloaded" });

      // Refuse rather than write a badged file. The whole reason for this
      // script is that nobody noticed the badge for the length of a release.
      if ((await page.locator("nextjs-portal").count()) > 0) {
        throw new Error(
          `${BASE} is a dev server — the dev tools badge would be in the shot. ` +
            "Serve a production build instead; see the header of this file.",
        );
      }

      // Several forms populate a select from the catalog before they are
      // valid, and clicking into that gap submits nothing at all — which is a
      // screenshot of an empty result column, not an error anyone would see.
      await page.waitForLoadState("networkidle");
      const submit = page.locator('form button[type="submit"]');
      await submit.waitFor({ state: "visible" });
      await page.waitForFunction(
        () => !document.querySelector('form button[type="submit"]')?.hasAttribute("disabled"),
      );

      // Wait for the run itself rather than for text on the page. Result
      // wording differs per tool and drifts with copy edits, so matching on it
      // makes this script fail for reasons that have nothing to do with it.
      const run = page.waitForResponse(
        (response) =>
          response.request().method() === "POST" &&
          response.url().includes("/api/v1/") &&
          !response.url().includes("/auth/"),
        { timeout: 60_000 },
      );
      await submit.click();
      const response = await run;
      if (!response.ok()) {
        throw new Error(`${shot.stem}: the run failed with ${response.status()}`);
      }

      // Clicking scrolled the page to the submit button at the foot of the
      // form, and the result renders above it — so the shot would be of a
      // score breakdown with the score itself off the top of the frame.
      await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));

      // The score ring sweeps over 900ms and the panels stagger in behind it.
      // Capturing mid-sweep is how a marketing shot ends up claiming a stack
      // scored 43 out of 100.
      await page.waitForTimeout(2_500);

      const name = `${shot.stem}-${theme}.png`;
      await page.screenshot({ path: join(OUT, name) });
      written.push(name);

      console.log(name + (errors.length ? `  (${errors.length} console errors)` : ""));
      await context.close();
    }
  }
} finally {
  await browser.close();
}

console.log(`\n${written.length}/${SHOTS.length * THEMES.length} captured into public/marketing/`);
