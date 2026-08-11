import type { Metadata } from "next";
import { Suspense } from "react";

import { TemplateBrowser } from "@/components/features/templates/template-browser";
import { PageHeader } from "@/components/forge/page-header";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata: Metadata = {
  title: "Templates",
  description:
    "Search thirty templates for building AI systems — stacks, blueprints, code starters, prompts, configs, checklists, and business documents.",
  alternates: { canonical: "/resources/templates" },
};

export default function TemplatesPage() {
  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        eyebrow="Resources"
        title="Templates"
        description="Every filter lives in the URL, so a filtered view is a link you can send."
      />
      {/* `useQueryStates` reads the search params, which suspends on the server
          render. The boundary is what lets the header paint immediately rather
          than holding the whole page on the first data fetch. */}
      <Suspense fallback={<Skeleton className="h-96 rounded-md" />}>
        <TemplateBrowser />
      </Suspense>
    </div>
  );
}
