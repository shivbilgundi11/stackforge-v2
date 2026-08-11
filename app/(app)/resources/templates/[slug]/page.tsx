import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { TemplateCard } from "@/components/features/templates/template-card";
import {
  CopyBody,
  DownloadTemplate,
  FileTree,
  UpgradeCard,
  UseThisStack,
} from "@/components/features/templates/template-detail";
import { Markdown } from "@/components/forge/markdown";
import { PageHeader } from "@/components/forge/page-header";
import { Panel, PanelBody, PanelHeader } from "@/components/forge/panel";
import { Badge } from "@/components/ui/badge";
import { getTemplateStatic, listTemplatesStatic } from "@/lib/api/templates";
import { getTool, toolHref } from "@/lib/tools/registry";

/**
 * A template page (M19).
 *
 * Statically generated with hourly revalidation, and public — this is the
 * product's best organic surface, and every choice on the page follows from
 * that: the prose is in the server-rendered HTML rather than fetched by a
 * client component, the premium preview is real content rather than a stub,
 * and the related links point back into the tools.
 */

export const revalidate = 3600;

const SITE = process.env["NEXT_PUBLIC_SITE_URL"] ?? "http://localhost:3000";

/**
 * Pre-rendered at build time.
 *
 * Failing soft rather than failing the build: `listTemplatesStatic` returns
 * null if the API is unreachable, and an empty list here means the pages are
 * generated on first request instead. A build that breaks because a service
 * was restarting is a worse outcome than a slightly slower first hit.
 */
export async function generateStaticParams(): Promise<{ slug: string }[]> {
  const templates = await listTemplatesStatic();
  return (templates ?? []).map((template) => ({ slug: template.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const template = await getTemplateStatic(slug);
  if (!template) return { title: "Template not found" };

  const url = `${SITE}/resources/templates/${slug}`;
  return {
    title: template.title,
    description: template.summary,
    keywords: [...(template.tags ?? []), ...(template.use_cases ?? [])],
    alternates: { canonical: url },
    openGraph: {
      title: `${template.title} · StackForge`,
      description: template.summary,
      url,
      type: "article",
    },
    twitter: {
      card: "summary_large_image",
      title: template.title,
      description: template.summary,
    },
  };
}

export default async function TemplatePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const template = await getTemplateStatic(slug);
  if (!template) notFound();

  const files = template.files ?? [];
  const related = template.related ?? [];
  const tools = (template.related_tools ?? [])
    .map((toolSlug) => getTool(toolSlug))
    .filter((tool): tool is NonNullable<typeof tool> => Boolean(tool));

  return (
    <div className="flex flex-col gap-5">
      {/* `SoftwareSourceCode` for a starter that carries files, `HowTo` for a
          document — the type has to describe what the page actually is, or the
          markup is worse than none. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData(template, slug)) }}
      />

      <PageHeader
        eyebrow="Resources"
        title={template.title}
        description={template.summary}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {template.is_stack_template ? <UseThisStack template={template} /> : null}
            <CopyBody template={template} />
            {!template.locked ? <DownloadTemplate template={template} /> : null}
          </div>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="outline" className="border-line capitalize">
          {template.difficulty}
        </Badge>
        {(template.use_cases ?? []).map((useCase) => (
          <Link key={useCase} href={`/resources/templates?use_case=${useCase}`}>
            <Badge variant="outline" className="border-line hover:border-line-strong">
              {useCase}
            </Badge>
          </Link>
        ))}
        {template.is_premium ? (
          <Badge variant="outline" className="border-forge-line text-forge">
            Pro
          </Badge>
        ) : null}
      </div>

      <article className="max-w-none">
        <Markdown content={template.content_markdown} />
      </article>

      {template.locked ? <UpgradeCard template={template} /> : null}

      {files.length > 0 ? (
        <section className="flex flex-col gap-2">
          <h2 className="text-[15px] font-semibold text-fg">Files</h2>
          <FileTree files={files} slug={slug} />
        </section>
      ) : null}

      {tools.length > 0 ? (
        <Panel>
          <PanelHeader
            title="Tools for this"
            description="Run the numbers before you commit to any of the above."
          />
          <ul className="divide-y divide-line">
            {tools.map((tool) => (
              <li key={tool.slug}>
                <Link
                  href={toolHref(tool)}
                  className="flex flex-col gap-0.5 px-4 py-2.5 hover:bg-surface-2/60"
                >
                  <span className="text-[13px] font-medium text-fg">{tool.title}</span>
                  <span className="text-xs text-fg-muted">{tool.summary}</span>
                </Link>
              </li>
            ))}
          </ul>
        </Panel>
      ) : null}

      {related.length > 0 ? (
        <Panel>
          <PanelHeader title="Related templates" />
          <PanelBody className="grid gap-3 sm:grid-cols-2">
            {related.map((other) => (
              <TemplateCard key={other.slug} template={other} />
            ))}
          </PanelBody>
        </Panel>
      ) : null}
    </div>
  );
}

function structuredData(
  template: Awaited<ReturnType<typeof getTemplateStatic>> & object,
  slug: string,
): Record<string, unknown> {
  const url = `${SITE}/resources/templates/${slug}`;
  const base = {
    "@context": "https://schema.org",
    name: template.title,
    description: template.summary,
    url,
    dateModified: template.published_at ?? undefined,
    author: { "@type": "Organization", name: "StackForge" },
    // Declared honestly. A premium template really is behind a paywall, and
    // claiming otherwise is exactly what gets a site penalised for cloaking.
    isAccessibleForFree: !template.is_premium,
    ...(template.is_premium
      ? {
          hasPart: {
            "@type": "WebPageElement",
            isAccessibleForFree: false,
            cssSelector: "article",
          },
        }
      : {}),
  };

  // Keyed off `file_count`, not `files`. The array is withheld from a caller
  // who cannot unlock it — and a crawler is always that caller — so keying off
  // it would mean the richer markup appeared only for signed-in Pro users. The
  // type has to describe what the page *is*, not what this visitor received.
  if (template.file_count > 0) {
    const languages = [...new Set((template.files ?? []).map((file) => file.language))];
    return {
      ...base,
      "@type": "SoftwareSourceCode",
      ...(languages.length > 0 ? { programmingLanguage: languages } : {}),
      codeSampleType: "full solution",
    };
  }

  return { ...base, "@type": "TechArticle", proficiencyLevel: template.difficulty };
}
