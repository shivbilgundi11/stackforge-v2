"use client";

import { notFound } from "next/navigation";

import { ToolPage } from "@/components/features/tools/tool-page";
import { getTool } from "@/lib/tools/registry";

/**
 * The client boundary for a tool page.
 *
 * A `ToolSpec` holds functions — `format`, `showWhen`, `newItem` — and
 * functions cannot cross the server/client boundary. Passing a spec straight
 * from a Server Component to `<ToolPage>` throws at runtime, so the spec is
 * resolved from the registry *here*, on the client, and only its slug crosses.
 *
 * This keeps `page.tsx` a Server Component, which is what lets it export
 * `metadata`.
 */
export function ToolPageBySlug({ slug }: { slug: string }) {
  const spec = getTool(slug);
  if (!spec) notFound();
  return <ToolPage spec={spec} />;
}
