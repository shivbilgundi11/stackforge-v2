import type { Metadata } from "next";

import { CtaBand, Section, SectionHeader } from "@/components/marketing/section";
import { getCatalogStats } from "@/lib/marketing/data";

/**
 * About (M22).
 *
 * Positioning and the principles the product is actually built to, with no
 * invented company history, team size, funding, or customer count. StackForge
 * is early and the page says so — a claim we would have to retract later is
 * worth less than the credibility of the ones we can defend today (Q-02).
 */

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "About",
  description:
    "Why StackForge exists, what it refuses to do, and the principles the product is built to.",
  alternates: { canonical: "/about" },
};

const PRINCIPLES = [
  {
    title: "The rule engine decides. The model explains.",
    body: "Every figure is computed deterministically before any language model is involved. Where a model writes the prose over that result, the result is badged as model-authored — and when the model is unavailable, the computed answer ships regardless. A planning tool whose numbers change because an API had a bad afternoon is not a planning tool.",
  },
  {
    title: "Every number carries its provenance.",
    body: "Prices come from vendor documentation with the source and the date they were last verified attached, and that date is shown on the result. Pricing moves constantly; pretending otherwise would make the tool feel more authoritative and be less useful.",
  },
  {
    title: "Constraints eliminate rather than penalise.",
    body: "If your data cannot leave your infrastructure, a managed-only option is not a slightly-lower-scoring choice — it is not a choice. Recommendations that quietly rank down a disqualifying option produce answers that look reasonable and cannot be acted on.",
  },
  {
    title: "The output is an artifact, not advice.",
    body: "A recommendation you cannot hand to anyone is a conversation. Every result generates the architecture document, the diagram, the roadmap, and the starter files from the same data the page renders, so what you export and what you read cannot drift apart.",
  },
  {
    title: "We say when something is generated.",
    body: "Generated infrastructure is a starter template and is described that way everywhere it appears. So is an estimate that fell back to a heuristic instead of a real tokenizer. The product is more useful when you know which parts to check.",
  },
];

export default async function Page() {
  const catalog = await getCatalogStats();

  return (
    <>
      <Section bleed>
        <SectionHeader
          eyebrow="About"
          title="The planning layer that should already exist."
          lede="Teams decide their AI architecture in documents and Slack threads, then discover the cost in an invoice. StackForge is the step in between — the one where the numbers get worked out while they can still change the decision."
        />
      </Section>

      <Section>
        <div className="grid gap-10 lg:grid-cols-[minmax(0,20rem)_1fr] lg:gap-16">
          <h2 className="font-serif text-[1.75rem] leading-tight tracking-[-0.018em] text-fg">
            What it is
          </h2>
          <div className="flex max-w-[64ch] flex-col gap-4 text-[14.5px] leading-relaxed text-pretty text-fg-muted">
            <p>
              StackForge is an engineering workbench for planning AI systems. You describe what you
              are building and its constraints; it costs the options, scores them against each
              other, checks whether they work together, and hands back the artifacts — an
              architecture document, a diagram, a roadmap, and starter configuration.
            </p>
            <p>
              It is not a code generator and it does not want to be. Writing the application is your
              job and you will do it better than a generator would. What is missing from most teams
              is the step before that: the one where somebody works out whether the plan survives
              contact with a budget.
            </p>
            <p>
              Underneath is a catalog of {catalog.models} priced models, {catalog.tools} tools,{" "}
              {catalog.gpus} GPUs, and {catalog.compatibility_pairs.toLocaleString()} scored
              compatibility pairs. The counts on this site are read from that catalog rather than
              typed into the page, so they cannot quietly become wrong.
            </p>
          </div>
        </div>
      </Section>

      <Section>
        <SectionHeader eyebrow="Principles" title="What the product is built to." />
        <div className="mt-10 flex flex-col divide-y divide-line border-y border-line">
          {PRINCIPLES.map((principle) => (
            <div key={principle.title} className="grid gap-2 py-6 md:grid-cols-[minmax(0,24rem)_1fr] md:gap-10">
              <h3 className="text-[15px] font-semibold text-balance text-fg">{principle.title}</h3>
              <p className="max-w-[62ch] text-[14px] leading-relaxed text-pretty text-fg-muted">
                {principle.body}
              </p>
            </div>
          ))}
        </div>
      </Section>

      <Section>
        <SectionHeader
          eyebrow="Where we are"
          title="Early, and saying so."
          lede="StackForge is in active development. There are no customer logos on this site because there are no customers to name yet, and a wall of invented testimonials would tell you nothing except that we were willing to invent them. What we can show you is the product doing the work — which is why every screenshot here is a real result rather than a mockup."
        />
      </Section>

      <CtaBand
        title="Judge it on the output."
        lede="Run it against a system you are actually planning, and see whether the numbers hold up."
        primary={{ href: "/stack-architect/new", label: "Design a stack" }}
        secondary={{ href: "/contact", label: "Get in touch" }}
      />
    </>
  );
}
