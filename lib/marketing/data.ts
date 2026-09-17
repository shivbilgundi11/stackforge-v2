import type { Plan } from "@/lib/api/billing";
import type { components } from "@/types/api";

/**
 * Build-time reads for the marketing site (M22).
 *
 * The marketing pages must render with the API down, so every read here fails
 * soft to a written-down fallback rather than throwing. That trade is the
 * whole point: the acquisition surface should not go dark because the
 * application is restarting.
 *
 * ## Why the fallbacks are allowed to be stale but not invented
 *
 * A fallback that guesses is worse than no page. These numbers are the last
 * verified snapshot of the real catalog. What must never happen is a marketing
 * figure that was never true (Q-02): the previous build's site claimed 200+
 * tools against a catalog of 80, and 50,000 users against no users at all.
 *
 * This docblock used to claim the numbers were "checked in CI against the live
 * endpoint". Nothing checked them — grep for `CATALOG_FALLBACK` and this file
 * is the only hit. The date on the constant below is therefore the only thing
 * standing behind it, so re-verify it by hand when you touch it.
 *
 * The plan snapshot is the version of this that *is* enforced, because it can
 * be: `data/plans.py` is static and importable with no database, so
 * `npm run plans:check` re-derives it on every run. Catalog counts are live
 * rows, so the same trick does not work here — closing this properly means a
 * job that reads the deployed `/catalog/stats` and opens a PR when the
 * snapshot drifts, which is worth doing and is not done.
 */

const BASE_URL = process.env["NEXT_PUBLIC_API_URL"] ?? "http://localhost:8000";
const HOUR = 3600;

export type CatalogStats = components["schemas"]["CatalogStatsOut"];

/** Verified 2026-08-17 against `GET /api/v1/catalog/stats`. */
export const CATALOG_FALLBACK: CatalogStats = {
  models: 96,
  gpus: 35,
  tools: 80,
  compatibility_pairs: 2014,
  oldest_verification: "2026-06-24",
  stale_rows: 26,
};

async function fetchPublic<T>(path: string, revalidate: number): Promise<T | null> {
  try {
    const response = await fetch(`${BASE_URL}${path}`, { next: { revalidate } });
    if (!response.ok) return null;
    const payload = (await response.json()) as { data?: T | null };
    return payload.data ?? null;
  } catch {
    return null;
  }
}

export async function getCatalogStats(): Promise<CatalogStats> {
  return (await fetchPublic<CatalogStats>("/api/v1/catalog/stats", HOUR)) ?? CATALOG_FALLBACK;
}

/**
 * The plan catalog, for the pricing page and the home-page teaser.
 *
 * `null` rather than a fallback *here*, because this layer has no way to tell
 * a stale price from a current one — it either read the catalog or it did not,
 * and saying so is the honest thing for it to return.
 *
 * The fallback lives one level up, in `PlanCards`, and it is a generated
 * snapshot of `backend/app/data/plans.py` that `npm run plans:check` diffs
 * against the backend on every run. That is what makes rendering a price
 * without the API safe: not that the figure is remembered, but that it cannot
 * differ from the billing configuration without failing the build. See
 * `lib/marketing/plans.ts`.
 */
export async function getPlansStatic(): Promise<Plan[] | null> {
  return fetchPublic<Plan[]>("/api/v1/billing/plans", HOUR);
}
