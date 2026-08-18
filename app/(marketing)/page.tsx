import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRightIcon } from "lucide-react";

import { MetricStrip, MetricTile } from "@/components/forge/metric-tile";
import { ProvenanceChip } from "@/components/forge/provenance-chip";
import { ProductShot } from "@/components/marketing/product-shot";
import { CtaBand, Section, SectionHeader } from "@/components/marketing/section";
import { Button } from "@/components/ui/button";
import { FAQ, FEATURES, WORKFLOWS } from "@/lib/marketing/content";
import { getCatalogStats } from "@/lib/marketing/data";

/**
 * The home page (M22).
 *
 * ## Copy accuracy
 *
 * Every claim here was checked against the implementation before it shipped,
 * which is Q-02 and the single most important constraint on this page. The
 * previous build's site claimed 200+ tools against a catalog of 80, "50,000+
 * AI developers" against no users, a "$100M+ in cost savings identified"
 * figure nobody could source, three testimonials from people who do not
 * exist, a trust badge naming five companies that have never used the
 * product, and LLM synthesis over a rule engine that never called a model.
 * None of that is here, and none of it comes back without something real
 * behind it.
 *
 * What replaced the fabricated social-proof section is the catalog itself:
 * counts read live from `/catalog/stats`, and the verification date the
 * product already stamps on every price. That is the honest version of the
 * same claim — this is what the numbers rest on.
 *
 * The hero shows a real Stack Architect result rather than an illustration,
 * per the module's note that this audience trusts artifacts over claims.
 */

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "StackForge — plan, cost, and compare your AI stack before you build",
  description:
    "An engineering workbench for AI systems. Cost a stack, compare the options, size the infrastructure, and leave with the architecture document — before writing code.",
  alternates: { canonical: "/" },
};




export default async function Page() {
  const catalog = await getCatalogStats();
  const verified = new Date(catalog.oldest_verification ?? "2026-06-24").toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <>
      {/* ── 1 · Hero ─────────────────────────────────────────────────────── */}
      <Section bleed className="relative overflow-hidden">
        <div
          className="bg-grid pointer-events-none absolute inset-0 [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,black,transparent)] opacity-50"
          aria-hidden
        />
        <div className="relative">
          <span className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-2.5 py-1 text-[11.5px] text-fg-muted">
            <span className="size-1.5 rounded-full bg-ember" aria-hidden />
            {catalog.models} models · {catalog.tools} tools · {catalog.compatibility_pairs.toLocaleString()} verified pairs
          </span>

          <h1 className="mt-6 max-w-3xl font-serif text-[clamp(2.5rem,6vw,3.75rem)] leading-[1.05] tracking-[-0.02em] text-balance text-fg">
            Plan your AI stack before you build it.
          </h1>

          <p className="mt-5 max-w-xl text-[15px] leading-relaxed text-pretty text-fg-muted">
            StackForge is an engineering workbench for costing, comparing, and designing AI systems.
            Work out what it will actually spend, decide between the tools with the tradeoffs in
            front of you, and leave with the architecture document and the numbers to justify it.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Button asChild size="lg" className="h-10 bg-ember text-ember-fg shadow-none hover:bg-ember-hover">
              <Link href="/signup">
                Get started free
                <ArrowRightIcon className="size-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="h-10">
              <Link href="/features">See what it does</Link>
            </Button>
            <span className="text-[12px] text-fg-subtle">
              Free tier, no card. Five runs a day without an account.
            </span>
          </div>

          <div className="mt-14">
            <ProductShot
              src="stack-architect"
              priority
              alt="Stack Architect returning a recommended stack scored 85 out of 100 — Anthropic API, LangChain, Qdrant, SQLite, Valkey, Apache Airflow, Grafana and Vercel — with a score breakdown across ten weighted dimensions and an architecture diagram."
            />
            <p className="mt-3 text-[12px] text-fg-subtle">
              A real result, not a mockup: RAG at medium scale on a $2,000/month budget.
            </p>
          </div>
        </div>
      </Section>

      {/* ── 2 · The problem ──────────────────────────────────────────────── */}
      <Section>
        <SectionHeader
          eyebrow="The problem"
          title="Most AI systems are costed after they are built."
          lede="By then the architecture is decided, the bill is a surprise, and the reasoning behind the choices lives in a Slack thread nobody can find."
        />
        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {[
            {
              title: "The bill arrives late",
              body: "Token spend, embedding ingestion, vector storage, and GPU hours sit in four different dashboards. Nothing adds them up until the invoice does.",
            },
            {
              title: "The landscape moves faster than the decision",
              body: "Models, vector databases, and agent frameworks turn over constantly, and which of them actually work together is not written down anywhere.",
            },
            {
              title: "Planning leaves nothing behind",
              body: "The work happens in documents and whiteboards, so there is no artifact to hand to the person building it — and it gets redone in six months.",
            },
          ].map((item) => (
            <div key={item.title} className="rounded-[var(--radius)] border border-line bg-surface p-5">
              <h3 className="text-[14.5px] font-semibold text-fg">{item.title}</h3>
              <p className="mt-2 text-[13.5px] leading-relaxed text-fg-muted">{item.body}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* ── 3 · How it works ─────────────────────────────────────────────── */}
      <Section>
        <SectionHeader
          eyebrow="How it works"
          title="Constraints in, a defensible plan out."
        />
        <ol className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          {[
            {
              step: "01",
              title: "Describe the system",
              body: "Use case, scale, budget, latency target, data sensitivity, and how much your team has done before.",
            },
            {
              step: "02",
              title: "Constraints eliminate",
              body: `Restricted data and deployment preferences remove options outright rather than ranking them down, so nothing in the answer is a compromise on them.`,
            },
            {
              step: "03",
              title: "Ten dimensions score",
              body: `What is left is scored on cost, scalability, developer experience, production readiness, security, lock-in, compatibility, operational burden, community, and docs.`,
            },
            {
              step: "04",
              title: "Take the artifacts",
              body: "Architecture document, diagram, roadmap, starter Compose file, and .cursorrules — generated from the same result the page renders.",
            },
          ].map((item) => (
            <li key={item.step} className="rounded-[var(--radius)] border border-line bg-surface p-5">
              <span className="font-mono text-[11px] tracking-[0.08em] text-ember">{item.step}</span>
              <h3 className="mt-2 text-[14.5px] font-semibold text-fg">{item.title}</h3>
              <p className="mt-2 text-[13.5px] leading-relaxed text-fg-muted">{item.body}</p>
            </li>
          ))}
        </ol>
      </Section>

      {/* ── 4 · Features, each with the real surface ─────────────────────── */}
      <Section id="features">
        <SectionHeader
          eyebrow="What is inside"
          title="Seven surfaces, one workbench."
          lede="Every screenshot below is the actual product answering an actual question. Nothing here is a redrawn illustration."
        />
        <div className="mt-12 flex flex-col gap-16">
          {FEATURES.map((feature, index) => (
            <div
              key={feature.title}
              className="grid items-center gap-8 lg:grid-cols-2 lg:gap-12"
            >
              <div className={index % 2 === 1 ? "lg:order-2" : undefined}>
                <span className="inline-flex size-8 items-center justify-center rounded-[var(--radius-sm)] border border-line bg-surface-2 text-ember">
                  <feature.icon className="size-4" aria-hidden />
                </span>
                <h3 className="mt-4 font-serif text-[1.6rem] leading-tight tracking-[-0.015em] text-fg">
                  {feature.title}
                </h3>
                <p className="mt-3 text-[14.5px] leading-relaxed text-pretty text-fg-muted">
                  {feature.body}
                </p>
                <Link
                  href={`/features#${feature.shot}`}
                  className="mt-5 inline-flex items-center gap-1 text-[13px] text-ember hover:underline"
                >
                  Read more
                  <ArrowRightIcon className="size-3.5" />
                </Link>
              </div>
              <ProductShot
                src={feature.shot}
                alt={feature.alt}
                className={index % 2 === 1 ? "lg:order-1" : undefined}
              />
            </div>
          ))}
        </div>
      </Section>

      {/* ── 5 · Why it is built this way ─────────────────────────────────── */}
      <Section>
        <SectionHeader
          eyebrow="Why it is built this way"
          title="Every number is checkable."
          lede="The point of this product is that you can defend its output in a review. That constrains how it is built."
        />
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {[
            {
              title: "Deterministic first",
              body: "Rule engines compute every figure before any model is called. Where a model writes the prose, the result says so — and when it is unavailable, the computed answer ships anyway.",
            },
            {
              title: "Provenance on every price",
              body: `Each catalog row carries the source it came from and the date it was last verified. The oldest row in the catalog right now was verified on ${verified}.`,
            },
            {
              title: "Compatibility is data, not vibes",
              body: `${catalog.compatibility_pairs.toLocaleString()} pairwise entries decide whether two tools belong in the same stack, and a stack is scored on its worst pairing rather than its average.`,
            },
            {
              title: "Constraints eliminate",
              body: "A regulated-data requirement removes managed-only options instead of docking them a few points. A recommendation missing the tool you expected tells you why it was excluded.",
            },
            {
              title: "Artifacts, not advice",
              body: "The architecture document, diagram, roadmap, Compose file, and .cursorrules are generated from the same result you are looking at, so they cannot drift from it.",
            },
            {
              title: "Generated files are starters",
              body: "The Compose and Kubernetes output is a starting template you will edit — described that way here because it is described that way in the product.",
            },
          ].map((item) => (
            <div key={item.title} className="rounded-[var(--radius)] border border-line bg-surface p-5">
              <h3 className="text-[14.5px] font-semibold text-fg">{item.title}</h3>
              <p className="mt-2 text-[13.5px] leading-relaxed text-fg-muted">{item.body}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* ── 6 · A worked example, with the real figures ──────────────────── */}
      <Section>
        <SectionHeader
          eyebrow="A worked example"
          title="“RAG over internal documentation, medium scale, $2,000 a month.”"
          lede="Run against the live engine. These are the figures it returns, not an illustration of what it might return."
        />

        <div className="mt-8 flex items-center justify-between gap-3">
          <span className="font-mono text-[10.5px] tracking-[0.12em] text-fg-subtle uppercase">
            Stack Architect · rule-based result
          </span>
          <ProvenanceChip variant="computed" />
        </div>

        <div className="mt-3">
          <MetricStrip columns={4}>
            <MetricTile label="Stack score" value="85.0" emphasis footnote="of 100" />
            <MetricTile label="Components" value="8" emphasis footnote="one per role" />
            <MetricTile label="Compatibility" value="72" emphasis footnote="scored on the worst pairing" />
            <MetricTile label="Options eliminated" value="7" emphasis footnote="by hard constraints" />
          </MetricStrip>
        </div>

        <div className="mt-8 grid gap-5 lg:grid-cols-2">
          <div className="rounded-[var(--radius)] border border-line bg-surface p-5">
            <h3 className="font-mono text-[10.5px] tracking-[0.12em] text-fg-subtle uppercase">
              The stack it returned
            </h3>
            <ul className="mt-3 flex flex-col gap-2">
              {[
                ["LLM provider", "Anthropic API"],
                ["Framework", "LangChain"],
                ["Vector store", "Qdrant"],
                ["Database", "SQLite"],
                ["Cache", "Valkey"],
                ["Orchestration", "Apache Airflow"],
                ["Observability", "Grafana"],
                ["Deployment", "Vercel"],
              ].map(([role, name]) => (
                <li key={role} className="flex items-baseline justify-between gap-4 text-[13.5px]">
                  <span className="text-fg-subtle">{role}</span>
                  <span className="font-medium text-fg">{name}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-[var(--radius)] border border-line bg-surface p-5">
            <h3 className="font-mono text-[10.5px] tracking-[0.12em] text-fg-subtle uppercase">
              Where the score came from
            </h3>
            <ul className="mt-3 flex flex-col gap-2.5">
              {[
                ["Scalability", 9.8, 12],
                ["Documentation quality", 9.9, 5],
                ["Community maturity", 9.0, 6],
                ["Production readiness", 8.7, 12],
                ["Cost efficiency", 8.6, 15],
                ["Integration compatibility", 7.2, 10],
                ["Deployment complexity", 6.9, 8],
              ].map(([label, score, weight]) => (
                <li key={label as string} className="text-[13px]">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="text-fg-muted">{label}</span>
                    <span className="font-mono text-fg tabular-nums">
                      {(score as number).toFixed(1)}
                      <span className="text-fg-subtle"> · {weight}% weight</span>
                    </span>
                  </div>
                  <div className="mt-1 h-1 overflow-hidden rounded-full bg-surface-3">
                    <div
                      className="h-full rounded-full bg-forge"
                      style={{ width: `${((score as number) / 10) * 100}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
            <p className="mt-4 text-[12px] text-fg-subtle">
              Ten weighted dimensions in total. The contributions sum to the headline, so the number
              is checkable.
            </p>
          </div>
        </div>
      </Section>

      {/* ── 7 · Workflows ────────────────────────────────────────────────── */}
      <Section>
        <SectionHeader eyebrow="Workflows" title="Five workflows, and the layer that ties them together." />
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {WORKFLOWS.map((workflow) => (
            <Link
              key={workflow.href}
              href={workflow.href}
              className="group rounded-[var(--radius)] border border-line bg-surface p-5 transition-colors hover:border-line-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ember"
            >
              <workflow.icon className="size-4 text-ember" aria-hidden />
              <h3 className="mt-3 text-[14px] font-semibold text-fg">{workflow.label}</h3>
              <p className="mt-1.5 text-[13px] leading-relaxed text-fg-muted">{workflow.body}</p>
              <span className="mt-3 inline-flex items-center gap-1 text-[12.5px] text-ember">
                Open
                <ArrowRightIcon className="size-3 transition-transform group-hover:translate-x-0.5" />
              </span>
            </Link>
          ))}
        </div>
      </Section>

      {/* ── 8 · What the numbers rest on ─────────────────────────────────── */}
      <Section>
        <SectionHeader
          eyebrow="What the numbers rest on"
          title="A catalog you can audit."
          lede="StackForge has no customer logos to show you yet, so here is the thing that would actually matter if it did: what the recommendations are computed from."
        />
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { value: catalog.models.toLocaleString(), label: "Models priced", note: "input, output, and context window" },
            { value: catalog.tools.toLocaleString(), label: "Tools catalogued", note: "with maturity and deployment mode" },
            { value: catalog.gpus.toLocaleString(), label: "GPUs priced", note: "across the major hosts" },
            { value: catalog.compatibility_pairs.toLocaleString(), label: "Compatibility pairs", note: "scored, not inferred" },
          ].map((stat) => (
            <div key={stat.label} className="rounded-[var(--radius)] border border-line bg-surface p-5">
              <p className="font-serif text-[2rem] leading-none tracking-[-0.02em] text-fg tabular-nums">
                {stat.value}
              </p>
              <p className="mt-2 text-[13.5px] font-medium text-fg">{stat.label}</p>
              <p className="mt-1 text-[12.5px] text-fg-subtle">{stat.note}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* ── 9 · Pricing teaser ───────────────────────────────────────────── */}
      <Section>
        <SectionHeader
          eyebrow="Pricing"
          title="Free users get real answers."
          lede="The paid tiers are for keeping the work and taking it out of the app — not for gating the tools. Every calculator is open to everyone."
        />
        <div className="mt-8 flex flex-wrap items-center gap-3">
          <Button asChild size="lg" className="h-10 bg-ember text-ember-fg shadow-none hover:bg-ember-hover">
            <Link href="/pricing">
              See the plans
              <ArrowRightIcon className="size-4" />
            </Link>
          </Button>
          <span className="text-[12.5px] text-fg-subtle">
            Prices are rendered from the same configuration the checkout charges from.
          </span>
        </div>
      </Section>

      {/* ── 10 · FAQ preview ─────────────────────────────────────────────── */}
      <Section>
        <SectionHeader eyebrow="Questions" title="The four we get most." />
        <dl className="mt-10 grid gap-5 md:grid-cols-2">
          {FAQ.slice(0, 4).map((item) => (
            <div key={item.q} className="rounded-[var(--radius)] border border-line bg-surface p-5">
              <dt className="text-[14.5px] font-semibold text-fg">{item.q}</dt>
              <dd className="mt-2 text-[13.5px] leading-relaxed text-fg-muted">{item.a}</dd>
            </div>
          ))}
        </dl>
        <Link
          href="/faq"
          className="mt-6 inline-flex items-center gap-1 text-[13px] text-ember hover:underline"
        >
          Read the full FAQ
          <ArrowRightIcon className="size-3.5" />
        </Link>
      </Section>

      {/* ── 11 · Close ───────────────────────────────────────────────────── */}
      <CtaBand />
    </>
  );
}
