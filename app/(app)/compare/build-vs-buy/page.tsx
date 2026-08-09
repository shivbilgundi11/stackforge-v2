import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ToolPageBySlug } from "@/components/features/tools/tool-page-by-slug";
import { getTool } from "@/lib/tools/registry";

const SLUG = "compare-build-vs-buy";

// Title and description come from the spec, so a tool renamed in one
// place is renamed everywhere — including the browser tab.
export function generateMetadata(): Metadata {
  const spec = getTool(SLUG);
  return { title: spec?.title, description: spec?.summary };
}

export default function Page() {
  if (!getTool(SLUG)) notFound();
  return <ToolPageBySlug slug={SLUG} />;
}
