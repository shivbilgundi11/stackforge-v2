import type { MetadataRoute } from "next";

/**
 * `robots.txt`.
 *
 * Two disallows, and both are deliberate rather than defensive.
 *
 * `/s/` is the share-link space (M18). Those are capability URLs, and a
 * capability URL in a search index is no longer a capability. The pages
 * already send `noindex` in a header and a meta tag; this is the third layer,
 * and it is the one that stops the crawl happening at all.
 *
 * The account-only routes are excluded because they redirect to a login page.
 * Letting them be crawled teaches a search engine that most of the site is a
 * sign-in form.
 *
 * Everything else — every tool, every hub, the whole template library — is
 * open, which is the point of M19.
 */

const SITE = process.env["NEXT_PUBLIC_SITE_URL"] ?? "http://localhost:3000";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/s/", "/dashboard", "/projects", "/settings", "/team", "/api/"],
    },
    sitemap: `${SITE}/sitemap.xml`,
  };
}
