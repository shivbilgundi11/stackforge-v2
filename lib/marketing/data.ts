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
 * verified snapshot of the real catalog, and they are checked in CI against
 * the live endpoint — so if the catalog grows and this file does not, the
 * build tells someone. What must never happen is a marketing figure that was
 * never true (Q-02): the previous build's site claimed 200+ tools against a
 * catalog of 80, and 50,000 users against no users at all.
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
 * `null` rather than a fallback: prices are the one thing this site must not
 * guess at. A pricing page that disagrees with the checkout is a support and
 * trust problem, so when the API is unreachable the page says the numbers are
 * temporarily unavailable and links to checkout, instead of rendering a
 * remembered price that may already have changed.
 */
export async function getPlansStatic(): Promise<Plan[] | null> {
  return fetchPublic<Plan[]>("/api/v1/billing/plans", HOUR);
}
