import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRightIcon, CheckIcon } from "lucide-react";

import { ProductShot } from "@/components/marketing/product-shot";
import { CtaBand, Section, SectionHeader } from "@/components/marketing/section";
import { Button } from "@/components/ui/button";
import { FEATURES } from "@/lib/marketing/content";
import { getCatalogStats } from "@/lib/marketing/data";

/**
 * Feature depth, one section per workflow (M22).
 *
 * The claims come from `lib/marketing/content.ts` so this page and the home
 * page cannot describe the same feature differently. Every bullet was checked
 * against the implementation before it shipped — see the note in that file.
 */

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Features",
  description:
    "Seven surfaces: Stack Architect, Cost Planner, Compare Center, RAG Planner, Agent & MCP Builder, Infra Planner, and the ROI Calculator — with the real product in every screenshot.",
  alternates: { canonical: "/features" },
};

export default async function Page() {
  const catalog = await getCatalogStats();

  return (
    <>
      <Section bleed>
        <SectionHeader
          eyebrow="Features"
          title="Everything you need to argue for a stack."
          lede={`Seven surfaces over one catalog: ${catalog.models} models, ${catalog.tools} tools, ${catalog.gpus} GPUs, and ${catalog.compatibility_pairs.toLocaleString()} scored compatibility pairs. Every screenshot below is the product answering a real question.`}
        />
      </Section>

      {FEATURES.map((feature, index) => (
        <Section key={feature.title} id={feature.shot}>
          <div className="grid items-start gap-8 lg:grid-cols-2 lg:gap-12">
            <div className={index % 2 === 1 ? "lg:order-2" : undefined}>
              <span className="inline-flex size-8 items-center justify-center rounded-[var(--radius-sm)] border border-line bg-surface-2 text-ember">
                <feature.icon className="size-4" aria-hidden />
              </span>
              <h2 className="mt-4 font-serif text-[clamp(1.6rem,3vw,2.1rem)] leading-tight tracking-[-0.018em] text-fg">
                {feature.title}
              </h2>
              <p className="mt-3 text-[14.5px] leading-relaxed text-pretty text-fg-muted">
                {feature.body}
              </p>
              <ul className="mt-5 flex flex-col gap-2.5">
                {feature.points.map((point) => (
                  <li key={point} className="flex gap-2.5 text-[13.5px] leading-relaxed text-fg-muted">
                    <CheckIcon className="mt-0.5 size-3.5 shrink-0 text-ember" aria-hidden />
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
              <Button asChild variant="outline" size="sm" className="mt-6">
                <Link href="/signup">
                  Start free
                  <ArrowRightIcon className="size-3.5" />
                </Link>
              </Button>
            </div>
            <ProductShot
              src={feature.shot}
              alt={feature.alt}
              className={index % 2 === 1 ? "lg:order-1" : undefined}
            />
          </div>
        </Section>
      ))}

      <CtaBand
        title="Try it on something you are actually planning."
        lede="No account needed, and the first result is a complete one."
      />
    </>
  );
}
