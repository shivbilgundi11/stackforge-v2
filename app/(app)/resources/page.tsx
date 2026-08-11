import type { Metadata } from "next";
import Link from "next/link";

import { TemplateCard } from "@/components/features/templates/template-card";
import { PageHeader } from "@/components/forge/page-header";
import { EmptyState, Panel, PanelBody, PanelHeader } from "@/components/forge/panel";
import { getLibraryStatic } from "@/lib/api/templates";

/**
 * The resources hub (M19).
 *
 * Statically generated and revalidated hourly: templates change on a deploy,
 * not on a request, and this is the page most likely to be someone's first
 * view of the product. Rendering it per-request would trade the thing that
 * makes it a good landing page for freshness nobody needs.
 */

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Resources",
  description:
    "Stack templates, architecture blueprints, code starters, prompts, configs, and checklists for building AI systems — with the reasoning behind each decision.",
  alternates: { canonical: "/resources" },
  openGraph: {
    title: "Resources · StackForge",
    description:
      "Thirty templates for building AI systems: stacks, blueprints, starters, prompts, configs, and checklists.",
    type: "website",
  },
};

export default async function ResourcesPage() {
  const library = await getLibraryStatic();

  if (!library) {
    return (
      <>
        <PageHeader title="Resources" description="Templates, blueprints, and checklists." />
        <Panel>
          <EmptyState
            title="The library is not reachable"
            description="The API did not answer. Reload in a moment — nothing is lost."
          />
        </Panel>
      </>
    );
  }

  // The API defaults these to empty lists, so the generated types make them
  // optional. Defaulted rather than asserted — a library with nothing
  // featured yet is an ordinary state.
  const featured = library.featured ?? [];
  const recent = library.recent ?? [];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Resources"
        description={`${library.total} templates. Stack templates open the Architect pre-filled; everything else is a document you can take.`}
      />

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {library.categories.map((category) => (
          <Link
            key={category.key}
            href={`/resources/templates?category=${category.key}`}
            className="flex flex-col gap-1.5 rounded-md border border-line bg-surface px-4 py-3.5 transition-colors hover:border-line-strong"
          >
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-[13.5px] font-medium text-fg">{category.label}</span>
              <span className="font-mono text-xs text-fg-subtle tabular-nums">
                {category.count}
              </span>
            </div>
            <p className="text-xs leading-relaxed text-fg-muted">{category.description}</p>
          </Link>
        ))}
      </section>

      {featured.length > 0 ? (
        <Panel>
          <PanelHeader
            title="Start here"
            description="The four that answer the most common questions."
            actions={
              <Link
                href="/resources/templates"
                className="text-xs text-fg-muted underline underline-offset-2 hover:text-fg"
              >
                Browse all
              </Link>
            }
          />
          <PanelBody className="grid gap-3 sm:grid-cols-2">
            {featured.map((template) => (
              <TemplateCard key={template.slug} template={template} />
            ))}
          </PanelBody>
        </Panel>
      ) : null}

      {recent.length > 0 ? (
        <Panel>
          <PanelHeader title="Recently added" />
          <PanelBody className="grid gap-3 sm:grid-cols-2">
            {recent.map((template) => (
              <TemplateCard key={template.slug} template={template} />
            ))}
          </PanelBody>
        </Panel>
      ) : null}
    </div>
  );
}
