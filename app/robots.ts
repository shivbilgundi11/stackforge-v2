import type { MetadataRoute } from "next";

/**
 * `robots.txt`.
 *
 * `/s/` is the share-link space (M18). Those are capability URLs, and a
 * capability URL in a search index is no longer a capability. The pages
 * already send `noindex` in a header and a meta tag; this is the third layer,
 * and it is the one that stops the crawl happening at all.
 *
 * Everything else disallowed here is the app shell, which is account-only in
 * its entirety: every one of those paths answers a signed-out crawler with a
 * redirect to `/login`. What remains crawlable is the marketing site and the
 * auth pages themselves.
 */

const SITE = process.env["NEXT_PUBLIC_SITE_URL"] ?? "http://localhost:3000";

/** Mirrors the `(app)` route group. A new hub added there belongs here too. */
const APP_PREFIXES = [
  "/agents",
  "/checkout",
  "/compare",
  "/cost",
  "/dashboard",
  "/infra",
  "/projects",
  "/rag",
  "/resources",
  "/roi",
  "/settings",
  "/stack-architect",
  "/team",
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/s/", "/invite", "/api/", ...APP_PREFIXES],
    },
    sitemap: `${SITE}/sitemap.xml`,
  };
}
