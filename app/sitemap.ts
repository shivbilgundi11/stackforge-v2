import type { MetadataRoute } from "next";

/**
 * The sitemap.
 *
 * Only the marketing surface. Everything under `(app)` — every tool, every
 * hub, the template library — requires an account and redirects a signed-out
 * caller to `/login`, so listing any of it teaches a search engine that the
 * site is a sign-in form with a sitemap.
 *
 * This used to be built from the tool and template registries. That was
 * correct while the shell was open to anonymous visitors; it is not now, and a
 * sitemap of redirects is worse than a short one.
 */

const SITE = process.env["NEXT_PUBLIC_SITE_URL"] ?? "http://localhost:3000";

export const revalidate = 3600;

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  return [
    { url: SITE, lastModified: now, changeFrequency: "weekly", priority: 1 },
    // The marketing surface (M22). `/legal/*` is deliberately absent: both
    // pages carry `robots: { index: false }` while they await counsel review,
    // and listing a noindex page in the sitemap sends a search engine two
    // contradictory instructions about the same URL.
    ...["/features", "/pricing", "/faq", "/about", "/contact"].map((path) => ({
      url: `${SITE}${path}`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.9,
    })),
  ];
}
