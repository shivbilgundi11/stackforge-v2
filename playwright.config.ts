import { defineConfig, devices } from "@playwright/test";

/**
 * End-to-end coverage for the eight live tools.
 *
 * These exist to catch what unit and component tests structurally cannot: the
 * frontend and the backend disagreeing. Every layer between them is mocked
 * somewhere else in the suite, so a renamed metric key or a changed envelope
 * shape passes everything and still renders an empty panel. Here the real
 * FastAPI process answers the real fetch.
 *
 * Both servers are started by Playwright and reused if already up, so `npm run
 * e2e` works from a cold shell and from a session that already has dev
 * running.
 */
// Port 3100, not 3000: `reuseExistingServer` would otherwise adopt whatever
// `next dev` is already serving, which is the one thing this config is trying
// to avoid running against.
// `localhost`, not `127.0.0.1`: the browser sends the literal host as the
// Origin header, and the two are different origins to CORS. 127.0.0.1 fails
// preflight against a backend that allows localhost, which surfaces as an
// empty model dropdown rather than as a network error.
const PORT = 3100;
const FRONTEND = `http://localhost:${PORT}`;
const BACKEND = "http://localhost:8000";

export default defineConfig({
  testDir: "./e2e",
  // Anonymous quota is 5 runs per session per day. Each test gets a fresh
  // browser context and therefore its own anonymous session, so tests do not
  // compete for one allowance — but a single test must stay under it.
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? "list" : [["list"], ["html", { open: "never" }]],

  use: {
    baseURL: FRONTEND,
    trace: "on-first-retry",
    // These are arithmetic tools; a run that takes longer than this is a bug
    // worth failing on rather than waiting out.
    actionTimeout: 15_000,
  },

  // The default 5s assumes a page that is already built. It is generous for a
  // rendered result and tight for a first paint, so it is raised once here
  // rather than passed at every call site.
  expect: { timeout: 15_000 },

  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],

  webServer: [
    {
      command: "uv run uvicorn app.main:app --port 8000",
      cwd: "../backend",
      url: `${BACKEND}/api/v1/catalog/stats`,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
    {
      // A production build, not `next dev`. Turbopack compiles a route on
      // first request, so in dev the first visit to each page renders an
      // empty `<main>` for seconds — every assertion then races the
      // compiler and fails for a reason that has nothing to do with the
      // code. It is also what users actually get.
      command: `npm run build && npm run start -- --port ${PORT}`,
      url: FRONTEND,
      reuseExistingServer: !process.env.CI,
      timeout: 300_000,
    },
  ],
});
