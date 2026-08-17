import type { MetadataRoute } from "next";

import { listTemplatesStatic } from "@/lib/api/templates";
import { toolRoutes } from "@/lib/tools/registry";

/**
 * The sitemap.
 *
 * Built from the same registries the navigation reads, so a tool added as a
 * spec file or a template added as a Markdown file appears here without anyone
 * remembering to. A hand-maintained list is a list that is wrong within a
 * month, and a wrong sitemap wastes crawl budget on 404s.
 *
 * Only public routes. `/dashboard`, `/projects`, and `/settings` need an
 * account and would be crawled to a login page — which teaches a search engine
 * that the site is mostly a login page.
 */

const SITE = process.env["NEXT_PUBLIC_SITE_URL"] ?? "http://localhost:3000";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const fixed: MetadataRoute.Sitemap = [
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
    {
      url: `${SITE}/resources`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: `${SITE}/resources/templates`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.9,
    },
    ...["/cost", "/compare", "/rag", "/agents", "/infra", "/roi", "/stack-architect"].map(
      (path) => ({
        url: `${SITE}${path}`,
        lastModified: now,
        changeFrequency: "weekly" as const,
        priority: 0.8,
      }),
    ),
    ...toolRoutes().map((path) => ({
      url: `${SITE}${path}`,
      lastModified: now,
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
  ];

  // Templates last and failing soft: an API blip should shrink the sitemap for
  // an hour, not fail the build that produces it.
  const templates = (await listTemplatesStatic()) ?? [];

  return [
    ...fixed,
    ...templates.map((template) => ({
      url: `${SITE}/resources/templates/${template.slug}`,
      lastModified: template.published_at ? new Date(template.published_at) : now,
      changeFrequency: "monthly" as const,
      // Templates outrank tool pages: they are the pages with the content a
      // search brings someone to, and the tools are what they click next.
      priority: 0.8,
    })),
  ];
}
