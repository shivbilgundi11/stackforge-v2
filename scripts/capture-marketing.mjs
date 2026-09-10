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
 *     AIVEDA_CAPTURE=1 npx next build
 *     AIVEDA_CAPTURE=1 npx next start -p 3100
 *     node scripts/capture-marketing.mjs
 *
 * Port 3100 because the backend already allows that origin through CORS, and
 * `AIVEDA_CAPTURE` because it moves the build into its own directory — so
 * none of this disturbs a dev server already running on :3000.
 *
 * ## It has to sign in
 *
 * These shots were originally captured anonymously, back when a signed-out
 * visitor could run five tools a day. That tier is gone — `AuthGuard` wraps
 * the whole `(app)` shell, so a `goto` to a calculator now lands on `/login`.
 * The script therefore signs in once and reuses that session for all fourteen
 * captures.
 *
 * The account is Pro on purpose. Free allows three AI calls a day against
 * fourteen shots, so most of the run would render the non-AI path and the set
 * would not agree with itself. Pro is unlimited on both counts, which is the
 * only way fourteen images come out of one run looking like one product.
 *
 * Create the account once, then grant it the plan from the backend:
 *
 *     uv run python -m app.cli set-plan <email> pro
 *
 * Override the credentials with CAPTURE_EMAIL and CAPTURE_PASSWORD.
 */

import { existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { chromium } from "playwright";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "public", "marketing");
const BASE = process.env.CAPTURE_BASE_URL ?? "http://localhost:3100";
const EMAIL = process.env.CAPTURE_EMAIL ?? "press-kit@aivedashots.com";
const PASSWORD = process.env.CAPTURE_PASSWORD ?? "Qr7!vTzm-Lp4Wdx";

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

/** Every `ToolGroup` in `lib/tools/spec.ts` — the first-run notice is keyed by it. */
const TOOL_GROUPS = ["cost", "compare", "rag", "agents", "infra", "roi", "architect"];

if (!existsSync(OUT)) mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
const written = [];

/**
 * Sign in on this page.
 *
 * Once per context, not once per run. Capturing one `storageState` and
 * handing it to all fourteen contexts looks like the obvious saving and is a
 * trap: refresh tokens rotate on use, so the second context presents a token
 * the first already spent. The API reads a replayed refresh token as theft and
 * revokes the whole family — `reuse_detected` in `api/v1/auth.py` — which
 * strands every context after the first. The visible symptom is one good
 * screenshot followed by a run that hangs until the timeout, so it reads as a
 * slow tool rather than as a dead session.
 *
 * Fourteen logins cost a couple of seconds each. That is the price of every
 * context owning its own session.
 */
async function signIn(page) {
  await page.goto(`${BASE}/login`, { waitUntil: "domcontentloaded" });
  await page.getByLabel("Email").fill(EMAIL);
  await page.getByLabel("Password", { exact: true }).fill(PASSWORD);
  await page.getByRole("button", { name: /sign in|log in/i }).click();

  // The dashboard is the landing route for an account that owes nothing. A
  // timeout here is almost always the plan: an account on a paid tier with no
  // subscription behind it is held at `/checkout` by the guard, and no tool
  // page will render until `set-plan` has been run against it.
  await page.waitForURL(/\/dashboard/, { timeout: 30_000 }).catch(() => {
    throw new Error(
      `signed in as ${EMAIL} but landed on ${page.url()} rather than /dashboard. ` +
        "If this is /checkout the account is on a paid plan with no subscription; " +
        "grant it with `uv run python -m app.cli set-plan <email> pro`.",
    );
  });

}

try {
  for (const shot of SHOTS) {
    for (const theme of THEMES) {
      // New context per shot *and* per theme, each with its own session.
      // Fresh contexts also keep the shots independent — a stray toast or an
      // open popover from the previous capture cannot leak into the next.
      const context = await browser.newContext({
        viewport: VIEWPORT,
        deviceScaleFactor: SCALE,
        colorScheme: theme,
      });

      // Written before the first paint, so the page never renders in one
      // theme and flips to the other — which a screenshot is fast enough to
      // catch in the act.
      //
      // The first-run notice is marked seen in the same script. It is a real
      // banner a real first-time user gets, but it sits above the form and
      // pushes the result out of a 900px frame — and every capture runs in a
      // fresh context, so without this every shot is a first run.
      await context.addInitScript(
        ([key, value, groups]) => {
          window.localStorage.setItem(key, value);
          for (const group of groups) {
            window.localStorage.setItem(`aiveda.first-run.${group}`, "1");
          }
        },
        ["aiveda-theme", theme, TOOL_GROUPS],
      );

      const page = await context.newPage();
      await signIn(page);
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
        // Measured at ~37s for the architect against a warm backend. The
        // ceiling is for the slow tail of a live model call, not the norm —
        // a run that genuinely hangs still fails, just later.
        { timeout: 180_000 },
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
