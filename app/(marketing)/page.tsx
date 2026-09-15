import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRightIcon,
  BarChart3Icon,
  BoxIcon,
  BrainIcon,
  CalculatorIcon,
  CheckCircle2Icon,
  CircleSlash2Icon,
  CpuIcon,
  DatabaseIcon,
  FileTextIcon,
  FilterIcon,
  LayersIcon,
  LinkIcon,
  MessageCircleIcon,
  PlayIcon,
  RefreshCwIcon,
  ShieldCheckIcon,
  SlidersHorizontalIcon,
  SparklesIcon,
  UserIcon,
  WalletIcon,
  WrenchIcon,
  ZapIcon,
  type LucideIcon,
} from "lucide-react";

import { Annotation, FloatPill } from "@/components/marketing/annotation";
import {
  AgentVisual,
  ArtifactsVisual,
  CompatibilityVisual,
  ComposeVisual,
  ConstraintsVisual,
  CostVisual,
  DeploymentVisual,
  DescribeVisual,
  EliminationVisual,
  InvoiceVisual,
  LandscapeVisual,
  LayerStack,
  PipelineVisual,
  PriceSourceVisual,
  RoiVisual,
  RuleEngineVisual,
  ScatteredVisual,
  ScoreDial,
  StackChecklistVisual,
  TopOptionsVisual,
} from "@/components/marketing/home-visuals";
import { PricingTeaser } from "@/components/marketing/pricing-teaser";
import { ProductShot } from "@/components/marketing/product-shot";
import { Section, SectionHeader } from "@/components/marketing/section";
import {
  CardCue,
  IconTile,
  TintedCard,
  TintedCardLink,
  type Tone,
} from "@/components/marketing/tinted-card";
import { Button } from "@/components/ui/button";
import { FAQ, WORKFLOWS } from "@/lib/marketing/content";
import { getCatalogStats, getPlansStatic } from "@/lib/marketing/data";

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
 * same claim — this is what the numbers rest on. Those counts now sit in the
 * hero rather than in a section of their own, which is where a visitor is
 * actually deciding whether to keep reading.
 *
 * ## What the visual rebuild changed, and what it did not
 *
 * The page is laid out from a set of designed comps: tinted section cards,
 * a figure beside almost every block of copy, and handwritten margin notes.
 * The copy underneath is the same copy, and the constraint above still holds
 * over the new furniture. Two specific temptations were refused:
 *
 *   - The comps show three hard-coded prices. `PricingTeaser` renders from
 *     the plan catalog the checkout charges from instead, because a typed-in
 *     price drifts silently into quoting one number and charging another.
 *   - The comps show vendor logos. The figures in `home-visuals.tsx` use
 *     named chips rather than redrawn marks — nobody catalogued here has
 *     endorsed the product, and a wall of logos on a home page reads as
 *     exactly that claim.
 *
 * The worked example is the one place that shows real product output. It goes
 * through `ProductShot`, which is a capture of the running app, and it is the
 * section that argues the numbers, so that is where the claim belongs.
 *
 * The hero is a rendered mockup — a laptop on a desk, supplied with the comps,
 * with its callouts painted in. It is not a capture and does not claim to be
 * one: the "a real result, not a mockup" caption that sat under the screenshot
 * it replaced came off with it, because leaving that line under artwork would
 * have been the exact kind of unearned claim the section above is about. The
 * figures rendered on its screen are close to but not identical with the
 * worked example's ($2,142 against $2,042, 24/35 components against 8), which
 * is tolerable for a hero at the size it renders and would not be if the page
 * cited it as a result.
 *
 * Everything else that looks like a screenshot is drawn in DOM and is
 * deliberately flatter, so the difference between "here is the product" and
 * "here is the idea" is visible rather than asserted.
 */

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "AIVeda — plan, cost, and compare your AI stack before you build",
  description:
    "An engineering workbench for AI systems. Cost a stack, compare the options, size the infrastructure, and leave with the architecture document — before writing code.",
  alternates: { canonical: "/" },
};

/** The four trust lines under the hero. Short enough to be scanned, not read. */
const HERO_ASSURANCES = [
  "Verified pricing",
  "Compatibility insights",
  "Real architecture outputs",
  "No credit card required",
];

/** The tone rotation. Order is what makes adjacent sections tell apart. */
const WORKFLOW_TONES: Tone[] = ["ember", "info", "success", "forge", "rose"];

const WORKFLOW_VISUALS = [CostVisual, PipelineVisual, AgentVisual, DeploymentVisual, RoiVisual];

/**
 * Seven of the ten dimensions, as the worked example returns them.
 *
 * Seven and not ten because the list is illustrating that the score is
 * decomposed, and the copy under it says so explicitly rather than letting
 * the reader count. The scores and weights are the ones the engine returns
 * for this run — they are a quoted result, so they are not rounded, reordered
 * for looks, or topped up to a full ten.
 */
const SCORE_DIMENSIONS = [
  ["Scalability", 9.8, 12, "bg-forge", BarChart3Icon],
  ["Documentation quality", 9.9, 5, "bg-info", FileTextIcon],
  ["Community maturity", 9.0, 6, "bg-forge", UserIcon],
  ["Production readiness", 8.7, 12, "bg-success", ShieldCheckIcon],
  ["Cost efficiency", 8.6, 15, "bg-ember", DatabaseIcon],
  ["Integration compatibility", 7.2, 10, "bg-info", LinkIcon],
  ["Deployment complexity", 6.9, 8, "bg-rose", SlidersHorizontalIcon],
] satisfies [string, number, number, string, LucideIcon][];

export default async function Page() {
  // Both reads fail soft — the catalog to a checked-in snapshot, the plans to
  // null. The marketing site must render with the API down.
  const [catalog, plans] = await Promise.all([getCatalogStats(), getPlansStatic()]);

  const verified = new Date(catalog.oldest_verification ?? "2026-06-24").toLocaleDateString(
    "en-GB",
    { day: "numeric", month: "long", year: "numeric" },
  );
  const pairs = catalog.compatibility_pairs.toLocaleString();

  const heroStats: { value: string; label: string; icon: LucideIcon; tone: Tone }[] = [
    { value: catalog.models.toLocaleString(), label: "Models", icon: BoxIcon, tone: "ember" },
    { value: catalog.tools.toLocaleString(), label: "Tools", icon: WrenchIcon, tone: "forge" },
    { value: catalog.gpus.toLocaleString(), label: "GPUs", icon: CpuIcon, tone: "success" },
    { value: pairs, label: "Verified pairs", icon: LinkIcon, tone: "rose" },
  ];

  return (
    <>
      {/* ── 1 · Hero ─────────────────────────────────────────────────────── */}
      <Section bleed wide className="relative overflow-hidden">
        <div
          className="bg-dots pointer-events-none absolute inset-0 mask-[radial-gradient(ellipse_70%_60%_at_70%_0%,black,transparent)] opacity-40"
          aria-hidden
        />
        {/* Not a two-column grid. In the comps the photograph is a layer the
            copy sits on, not a panel beside it — it runs off the top and right
            of the frame and dissolves into the page on its left, with no edge
            anywhere. A grid track cannot do that: a track has a boundary, and
            the boundary is the thing the design does not have. So the copy is
            one column with a reading measure, and the image is positioned
            against the full-bleed `<section>` behind it.

            This wrapper is deliberately *not* positioned. The image below is
            `absolute`, and it has to resolve against the `<section>` — which
            is full width — rather than against this container, which is held
            to 80rem. Adding `relative` here would silently pull the photograph
            back inside the measure and put the gutter it is meant to cross
            right back. */}
        <div>
          <div className="relative z-10 lg:max-w-[34rem]">
            <span className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1.5 text-[12px] text-fg-muted shadow-panel">
              <span className="size-1.5 rounded-full bg-ember" aria-hidden />
              {catalog.models} models · {catalog.tools} tools · {pairs} verified pairs
            </span>

            <h1 className="mt-6 font-serif text-[clamp(2.6rem,5.6vw,4.1rem)] leading-[1.03] tracking-[-0.03em] text-balance text-fg">
              Plan your AI stack{" "}
              <span className="bg-linear-to-r from-ember to-rose bg-clip-text text-transparent">
                before you build it.
              </span>
            </h1>

            <p className="mt-6 max-w-[46ch] text-[15.5px] leading-relaxed text-pretty text-fg-muted">
              AIVeda is an engineering workbench for costing, comparing, and designing AI systems.
              Work out what it will actually spend, decide between the tools with the tradeoffs in
              front of you, and leave with the architecture document and the numbers to justify it.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Button
                asChild
                size="lg"
                className="h-11 bg-ember px-5 text-[14px] text-ember-fg shadow-none hover:bg-ember-hover"
              >
                <Link href="/signup">
                  Get started free
                  <ArrowRightIcon className="size-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="h-11 gap-2.5 px-5 text-[14px]">
                <Link href="/features">
                  <span
                    className="flex size-6 items-center justify-center rounded-full bg-fg text-bg"
                    aria-hidden
                  >
                    <PlayIcon className="size-2.5 fill-current" />
                  </span>
                  See what it does
                </Link>
              </Button>
            </div>

            <p className="mt-4 text-[12.5px] text-fg-subtle">
              Free tier, no card. Twenty-five runs a day.
            </p>

            {/* The catalog counts, at the point where a visitor is deciding
                whether the rest of the page is worth reading. */}
            {/* Narrower than the copy above it. The row is the lowest, widest
                thing in the column, so it is the one element that reaches the
                point where the photograph starts taking opacity — and these
                are 12.5px labels, which is the worst possible text to set over
                a picture of a plant. The labels are short enough that the lost
                inches cost nothing. */}
            <dl className="mt-10 grid grid-cols-2 gap-y-6 sm:grid-cols-4 sm:gap-y-0 sm:divide-x sm:divide-line lg:max-w-[30rem]">
              {heroStats.map((stat, i) => (
                <div
                  key={stat.label}
                  data-tone={stat.tone}
                  className={
                    i === 0 ? "flex items-center gap-3 sm:pr-4" : "flex items-center gap-3 sm:px-4"
                  }
                >
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-tone-quiet text-tone">
                    <stat.icon className="size-4.5" aria-hidden />
                  </span>
                  <div className="min-w-0">
                    <dd className="font-sans text-[21px] leading-none font-semibold text-fg tabular-nums">
                      {stat.value}
                    </dd>
                    <dt className="mt-1 text-[12.5px] leading-tight text-fg-muted">{stat.label}</dt>
                  </div>
                </div>
              ))}
            </dl>
          </div>

          {/* The hero image from the comps: the workbench on a laptop on a
              desk, with its three callouts already part of the artwork.

              No `FloatPill`s here any more — the pills are painted into the
              image, and a DOM pill beside them would be a second one in a
              slightly different typeface. The component is still used over the
              worked example, where the shot underneath is a flat capture.

              This is a rendered mockup, not a capture, so it does not carry
              the "real result" caption the screenshot it replaced did. The
              page's claim to show real output now rests entirely on the
              worked example, which is the section that argues the numbers
              anyway. See the note at the top of this file. */}
          {/* Two layouts, one element.

              Below `lg` it is an ordinary block under the copy, rounded like
              any other figure — there is no room to set text over a photograph
              at phone width, and the alternative of dropping it loses the only
              picture of the product above the fold.

              At `lg` it goes `absolute`, which resolves against the nearest
              positioned ancestor — the `<section>`, not this container — so it
              escapes the 80rem measure and bleeds to the viewport edge with no
              margin arithmetic. `inset-y-0` takes it off the top and bottom of
              the section too, and `object-cover` crops rather than letterboxes
              into a box that is no longer 3:2.

              The mask is what removes the seam: transparent at the left, fully
              opaque by 32% in, so the bright blurred half of the photograph
              dissolves into the page instead of ending at an edge. The copy's
              34rem measure keeps every line clear of the point where the image
              reaches even a third of its opacity. */}
          <Image
            src="/marketing/hero-laptop.webp"
            width={1536}
            height={1024}
            priority
            sizes="(max-width: 1024px) 100vw, 58vw"
            alt="AIVeda open on a laptop, showing a RAG system designed in Stack Architect: the model, framework and vector database wired together, a stack score of 85 out of 100 with its cost, scalability and compatibility breakdown, and the estimated monthly cost."
            className="mt-12 h-auto w-full rounded-xl lg:absolute lg:inset-y-0 lg:right-0 lg:mt-0 lg:h-full lg:w-[62%] lg:rounded-none lg:mask-[linear-gradient(to_right,transparent,black_32%)] lg:object-cover lg:object-right"
          />

          {/* The scrim. A photograph lit for a white page is a hole in a matte
              black one, and the mask alone does not fix that — it fades the
              left edge, which is exactly the part that was already quiet. This
              carries the rest: a wash back to the page colour in dark, and
              nothing at all in light, where the artwork already belongs. */}
          <div
            aria-hidden
            className="pointer-events-none hidden lg:absolute lg:inset-y-0 lg:right-0 lg:block lg:w-[62%] dark:bg-linear-to-r dark:from-bg dark:via-bg/45 dark:to-bg/20"
          />
        </div>

        {/* Held to the same measure as the copy, which costs it a second line
            at this width. That is the right trade now the photograph is a
            layer rather than a column: a run of 13px muted text crossing into
            the opaque half of a photograph is unreadable, and two tidy lines
            clear of it are merely two lines. */}
        <ul className="relative mt-10 flex flex-wrap gap-x-7 gap-y-2.5 lg:max-w-[34rem]">
          {HERO_ASSURANCES.map((item) => (
            <li key={item} className="flex items-center gap-2 text-[13px] text-fg-muted">
              <CheckCircle2Icon className="size-4 shrink-0 text-success" aria-hidden />
              {item}
            </li>
          ))}
        </ul>
      </Section>

      {/* ── 2 · The problem ──────────────────────────────────────────────── */}
      <Section wide>
        <div className="flex items-start justify-between gap-8">
          <SectionHeader
            eyebrow="The problem"
            title="Most AI systems are costed after they are built."
            lede="By then the architecture is decided, the bill is a surprise, and the reasoning behind the choices lives in a Slack thread nobody can find."
          />
          <Annotation direction="down-left" className="shrink-0 pt-2 text-right">
            Good ideas deserve
            <br />
            better planning.
          </Annotation>
        </div>

        <div className="mt-12 grid gap-5 md:grid-cols-3">
          {[
            {
              tone: "ember" as Tone,
              icon: WalletIcon,
              title: "The bill arrives late",
              body: "Token spend, embedding ingestion, vector storage, and GPU hours sit in four different dashboards. Nothing adds them up until the invoice does.",
              cue: "Unexpected costs",
              visual: <InvoiceVisual className="mx-auto w-full max-w-[16rem]" />,
            },
            {
              tone: "info" as Tone,
              icon: BarChart3Icon,
              title: "The landscape moves faster than the decision",
              body: "Models, vector databases, and agent frameworks turn over constantly, and which of them actually work together is not written down anywhere.",
              cue: "Hard to keep up",
              visual: <LandscapeVisual />,
            },
            {
              tone: "forge" as Tone,
              icon: FileTextIcon,
              title: "Planning leaves nothing behind",
              body: "The work happens in documents and whiteboards, so there is no artifact to hand to the person building it — and it gets redone in six months.",
              cue: "Knowledge gets lost",
              visual: <ScatteredVisual className="mx-auto w-full max-w-[16rem]" />,
            },
          ].map((item) => (
            <TintedCard key={item.title} tone={item.tone} className="flex flex-col">
              <IconTile icon={item.icon} />
              <h3 className="mt-5 text-[16.5px] leading-snug font-semibold text-balance text-fg">
                {item.title}
              </h3>
              <p className="mt-2.5 text-[13.5px] leading-relaxed text-fg-muted">{item.body}</p>
              <div className="mt-7 mb-1">{item.visual}</div>
              <CardCue>{item.cue}</CardCue>
            </TintedCard>
          ))}
        </div>
      </Section>

      {/* ── 3 · How it works ─────────────────────────────────────────────── */}
      <Section wide>
        <div className="flex items-start justify-between gap-8">
          <SectionHeader
            eyebrow="How it works"
            title="Constraints in, a defensible plan out."
            lede="Go from an idea to a complete, defensible AI architecture in four steps."
          />
          <Annotation direction="down-left" className="shrink-0 pt-2 text-right">
            From idea to implementation,
            <br />
            with clarity.
          </Annotation>
        </div>

        <ol className="mt-12 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {[
            {
              step: "01",
              tone: "ember" as Tone,
              title: "Describe the system",
              body: "Use case, scale, budget, latency target, data sensitivity, and how much your team has done before.",
              visual: <DescribeVisual />,
            },
            {
              step: "02",
              tone: "info" as Tone,
              title: "Constraints eliminate",
              body: "Restricted data and deployment preferences remove options outright rather than ranking them down, so nothing in the answer is a compromise on them.",
              visual: <ConstraintsVisual pairs={pairs} />,
            },
            {
              step: "03",
              tone: "success" as Tone,
              title: "Ten dimensions score",
              body: "What is left is scored on cost, scalability, developer experience, production readiness, security, lock-in, compatibility, operational burden, community, and docs.",
              visual: <TopOptionsVisual />,
            },
            {
              step: "04",
              tone: "forge" as Tone,
              title: "Take the artifacts",
              body: "Architecture document, diagram, roadmap, starter Compose file, and .cursorrules — generated from the same result the page renders.",
              visual: <ArtifactsVisual />,
            },
          ].map((item, i, all) => (
            <li key={item.step} className="relative">
              <TintedCard tone={item.tone} className="flex h-full flex-col">
                <span className="inline-flex size-9 items-center justify-center rounded-full bg-tone-quiet font-mono text-[12.5px] font-semibold text-tone">
                  {item.step}
                </span>
                <h3 className="mt-5 text-[16.5px] font-semibold text-fg">{item.title}</h3>
                <p className="mt-2.5 text-[13.5px] leading-relaxed text-fg-muted">{item.body}</p>
                <div className="mt-6">{item.visual}</div>
              </TintedCard>
              {/* The step connector. Decorative — the list is already ordered,
                  and `<ol>` is what tells assistive tech so. */}
              {i < all.length - 1 ? (
                <ArrowRightIcon
                  aria-hidden
                  className="absolute top-1/2 -right-4.5 hidden size-4 -translate-y-1/2 text-fg-subtle xl:block"
                />
              ) : null}
            </li>
          ))}
        </ol>
      </Section>

      {/* ── 4 · Why it is built this way ─────────────────────────────────── */}
      <Section wide>
        <div className="grid items-start gap-10 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
          <div>
            <SectionHeader
              eyebrow="Why it is built this way"
              title="Every number is checkable."
              lede="The point of this product is that you can defend its output in a review. That constrains how it is built."
            />
            <ul className="mt-8 flex flex-wrap gap-x-7 gap-y-3">
              {[
                { icon: ShieldCheckIcon, label: "Transparent methodology" },
                { icon: DatabaseIcon, label: "Verified data sources" },
                { icon: FileTextIcon, label: "Reproducible results" },
                { icon: UserIcon, label: "Built for real engineering teams" },
              ].map((item) => (
                <li key={item.label} className="flex items-center gap-2 text-[13px] text-fg-muted">
                  <item.icon className="size-4 shrink-0 text-fg-subtle" aria-hidden />
                  {item.label}
                </li>
              ))}
            </ul>
          </div>

          {/* The claim of the section, drawn: a checked list and the score it
              produces. Decorative — every item restates the copy beside it. */}
          <div aria-hidden className="relative hidden min-h-56 lg:block">
            <Annotation
              direction="down-right"
              className="absolute top-0 left-0 w-44"
              arrowClassName="ml-6"
            >
              From inputs to
              <br />
              defensible outputs.
            </Annotation>

            <div className="absolute top-12 left-24 w-56 rounded-xl border border-line bg-surface/90 p-4 shadow-overlay backdrop-blur-sm">
              <ul className="flex flex-col gap-2.5">
                {[
                  "Verified pricing",
                  "Compatibility data",
                  "Deterministic calculations",
                  "Generated artifacts",
                ].map((label) => (
                  <li key={label} className="flex items-center gap-2 text-[12px] text-fg">
                    <CheckCircle2Icon className="size-4 shrink-0 text-success" />
                    {label}
                  </li>
                ))}
              </ul>
            </div>

            <div className="absolute top-0 right-0 w-60 rounded-xl border border-line bg-surface p-4 shadow-overlay">
              <div className="flex items-center justify-between gap-3">
                <span className="text-[12.5px] font-semibold text-fg">Stack score</span>
                <ScoreDial value={85} />
              </div>
              <ul className="mt-3 flex flex-col gap-2">
                {[
                  ["Cost efficiency", 8.6, "bg-success"],
                  ["Scalability", 9.2, "bg-info"],
                  ["Security", 8.1, "bg-forge"],
                  ["Compatibility", 8.9, "bg-ember"],
                ].map(([label, score, bar]) => (
                  <li key={label as string} className="flex items-center gap-2 text-[10.5px]">
                    <span className="w-20 truncate text-fg-muted">{label}</span>
                    <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-3">
                      <span
                        className={cnBar(bar as string)}
                        style={{ width: `${((score as number) / 10) * 100}%` }}
                      />
                    </span>
                    <span className="w-6 text-right font-mono text-fg tabular-nums">
                      {(score as number).toFixed(1)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {[
            {
              tone: "info" as Tone,
              icon: SlidersHorizontalIcon,
              title: "Deterministic first",
              body: "Rule engines compute every figure before any model is called. Where a model writes the prose, the result says so — and when it is unavailable, the computed answer ships anyway.",
              cue: "See methodology",
              href: "/features",
              visual: <RuleEngineVisual />,
            },
            {
              tone: "success" as Tone,
              icon: DatabaseIcon,
              title: "Provenance on every price",
              body: `Each catalog row carries the source it came from and the date it was last verified. The oldest row in the catalog right now was verified on ${verified}.`,
              cue: "View data sources",
              href: "/about",
              visual: (
                <PriceSourceVisual
                  rows={[
                    ["AWS", "12 Aug 2026"],
                    ["Azure", "10 Aug 2026"],
                    ["Anthropic", "08 Aug 2026"],
                    ["OpenAI", "01 Aug 2026"],
                  ]}
                />
              ),
            },
            {
              tone: "ember" as Tone,
              icon: LinkIcon,
              title: "Compatibility is data, not vibes",
              body: `${pairs} pairwise entries decide whether two tools belong in the same stack, and a stack is scored on its worst pairing rather than its average.`,
              cue: "Explore compatibility",
              href: "/features",
              visual: <CompatibilityVisual />,
            },
            {
              tone: "forge" as Tone,
              icon: FilterIcon,
              title: "Constraints eliminate",
              body: "A regulated-data requirement removes managed-only options instead of docking them a few points. A recommendation missing the tool you expected tells you why it was excluded.",
              cue: "See how filtering works",
              href: "/features",
              visual: <EliminationVisual />,
            },
            {
              tone: "success" as Tone,
              icon: FileTextIcon,
              title: "Artifacts, not advice",
              body: "The architecture document, diagram, roadmap, Compose file, and .cursorrules are generated from the same result you are looking at, so they cannot drift from it.",
              cue: "View sample outputs",
              href: "/features",
              visual: <ArtifactsVisual />,
            },
            {
              tone: "rose" as Tone,
              icon: BoxIcon,
              title: "Generated files are starters",
              body: "The Compose and Kubernetes output is a starting template you will edit — described that way here because it is described that way in the product.",
              cue: "See an example",
              href: "/features",
              visual: <ComposeVisual />,
            },
          ].map((item) => (
            <TintedCardLink
              key={item.title}
              tone={item.tone}
              href={item.href}
              className="h-full p-5 sm:p-6"
            >
              <IconTile icon={item.icon} />
              <h3 className="mt-5 text-[16.5px] leading-snug font-semibold text-fg">
                {item.title}
              </h3>
              <p className="mt-2.5 text-[13.5px] leading-relaxed text-fg-muted">{item.body}</p>
              <div className="mt-6">{item.visual}</div>
              <CardCue>{item.cue}</CardCue>
            </TintedCardLink>
          ))}
        </div>
      </Section>

      {/* ── 5 · A worked example, with the real figures ──────────────────── */}
      <Section wide>
        <div className="grid items-center gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
          <div>
            <p className="font-mono text-[10.5px] tracking-[0.12em] text-ember uppercase">
              A worked example
            </p>
            <h2 className="mt-3 font-serif text-[clamp(1.85rem,3.4vw,2.6rem)] leading-[1.1] tracking-tight text-balance text-fg">
              “RAG over internal documentation, medium scale,{" "}
              <span className="text-ember">$2,000 a month.</span>”
            </h2>
            <p className="mt-5 max-w-[52ch] text-[15px] leading-relaxed text-pretty text-fg-muted">
              Run against the live engine. These are the figures it returns, not an illustration of
              what it might return.
            </p>

            <ul className="mt-7 flex flex-wrap gap-2.5">
              {[
                { icon: DatabaseIcon, label: "Real model pricing", tone: "forge" as Tone },
                { icon: LinkIcon, label: "Live compatibility data", tone: "info" as Tone },
                { icon: FileTextIcon, label: "Actual product output", tone: "success" as Tone },
              ].map((chip) => (
                <li
                  key={chip.label}
                  data-tone={chip.tone}
                  className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3.5 py-2 text-[13px] text-fg"
                >
                  <chip.icon className="size-4 text-tone" aria-hidden />
                  {chip.label}
                </li>
              ))}
            </ul>

            {/* The headline figures, as the product reports them. */}
            <div className="mt-8 overflow-hidden rounded-lg border border-line bg-surface">
              <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-3">
                <span className="font-mono text-[10.5px] tracking-[0.12em] text-fg-subtle uppercase">
                  Stack Architect · rule-based result
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface-2 px-2 py-0.5 text-[11px] font-medium text-fg-muted">
                  Σ rule-based
                </span>
              </div>
              <dl className="grid divide-y divide-line sm:grid-cols-2 sm:divide-y-0 lg:grid-cols-4 lg:divide-x">
                {[
                  { label: "Stack score", value: "85.0", note: "/ 100", icon: null },
                  { label: "Components", value: "8", note: "one per role", icon: LayersIcon },
                  {
                    label: "Compatibility",
                    value: "72",
                    note: "scored on the worst pairing",
                    icon: LinkIcon,
                  },
                  {
                    label: "Options eliminated",
                    value: "7",
                    note: "by hard constraints",
                    icon: CircleSlash2Icon,
                  },
                ].map((tile) => (
                  <div key={tile.label} className="px-5 py-4">
                    {/* The four labels are different lengths and two of them
                        wrap, so the row is held open to two lines rather than
                        left to stagger the figures underneath it. */}
                    <dt className="flex min-h-7 items-start text-[10.5px] font-medium tracking-[0.06em] text-fg-muted uppercase">
                      {tile.label}
                    </dt>
                    <dd className="font-mono text-[28px] leading-none font-semibold text-fg tabular-nums">
                      {tile.value}
                    </dd>
                    <div className="mt-2 flex min-h-8 items-start gap-1.5">
                      <span className="text-[11px] leading-snug text-fg-subtle">{tile.note}</span>
                      {tile.icon ? (
                        <tile.icon
                          className="mt-0.5 ml-auto size-3.5 shrink-0 text-fg-subtle"
                          aria-hidden
                        />
                      ) : null}
                    </div>
                  </div>
                ))}
              </dl>
            </div>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Button
                asChild
                size="lg"
                className="h-11 bg-ember px-5 text-[14px] text-ember-fg shadow-none hover:bg-ember-hover"
              >
                <Link href="/signup">
                  Try this example
                  <ArrowRightIcon className="size-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="h-11 gap-2.5 px-5 text-[14px]">
                <Link href="/features">
                  <span
                    className="flex size-6 items-center justify-center rounded-full bg-fg text-bg"
                    aria-hidden
                  >
                    <PlayIcon className="size-2.5 fill-current" />
                  </span>
                  See full walkthrough
                </Link>
              </Button>
            </div>
          </div>

          {/* 1.25rem, not 1.5rem, and only from 1280px up. Below the container's
              max width the gutter *is* the container's 1.25rem padding, so
              anything wider than that pulls the shot past the viewport and
              gives the whole page a horizontal scrollbar. */}
          <div className="relative min-[1280px]:-mr-5">
            <FloatPill
              icon={CheckCircle2Icon}
              tone="success"
              className="-top-6 right-4 z-10 max-w-48"
            >
              Actual product output from the live engine
            </FloatPill>
            <FloatPill icon={FileTextIcon} tone="forge" className="right-0 bottom-12 z-10 max-w-44">
              Not an illustration. These are real figures.
            </FloatPill>
            <ProductShot
              src="rag-architecture"
              alt="The RAG architecture planner showing the pipeline it returned for internal documentation at medium scale on a $2,000 monthly budget, with the estimated cost, component count, and the options its constraints eliminated."
            />
          </div>
        </div>
      </Section>

      {/* ── 6 · The stack it returned ────────────────────────────────────── */}
      <Section wide>
        <SectionHeader
          eyebrow="The stack it returned"
          title="A complete stack for your use case."
          lede="These are the actual components returned by the engine, not a hand-picked example."
        />

        <div className="mt-10 grid gap-5 lg:grid-cols-2">
          <TintedCard tone="info" className="flex flex-col p-0 sm:p-0">
            <div className="flex flex-wrap items-center gap-3 border-b border-line/70 px-5 py-4">
              <IconTile icon={LayersIcon} size="sm" />
              <div className="min-w-0">
                <p className="font-mono text-[10.5px] tracking-[0.12em] text-fg-subtle uppercase">
                  The stack it returned
                </p>
                <p className="mt-1 text-[13px] text-fg-muted">
                  Components selected for your requirements
                </p>
              </div>
              <span className="ml-auto inline-flex items-center gap-1.5 rounded-full bg-success-quiet px-2.5 py-1 text-[11.5px] font-medium text-success">
                <CheckCircle2Icon className="size-3.5" aria-hidden />
                Optimized for your constraints
              </span>
            </div>

            <ul className="divide-y divide-line/60 px-5">
              {[
                ["LLM provider", "Anthropic API", "Claude 3.5"],
                ["Framework", "LangChain", "Agent framework"],
                ["Vector store", "Qdrant", "Vector database"],
                ["Database", "SQLite", "Metadata storage"],
                ["Cache", "Valkey", "Caching layer"],
                ["Orchestration", "Apache Airflow", "Workflow orchestration"],
                ["Observability", "Grafana", "Monitoring & logs"],
                ["Deployment", "Vercel", "Hosting platform"],
              ].map(([role, name, note]) => (
                <li key={role} className="flex flex-wrap items-center gap-x-4 gap-y-1 py-3">
                  <span className="w-32 shrink-0 text-[13.5px] text-fg-muted">{role}</span>
                  <span className="text-[14px] font-medium text-fg">{name}</span>
                  <span className="ml-auto text-[13px] text-fg-subtle">{note}</span>
                </li>
              ))}
            </ul>

            <div className="m-4 mt-auto flex flex-wrap items-center gap-4 rounded-lg border border-forge-line/60 bg-forge-quiet/60 px-4 py-3.5">
              <DatabaseIcon className="size-4 shrink-0 text-forge" aria-hidden />
              <div className="min-w-56 flex-1">
                <p className="text-[13.5px] font-semibold text-fg">8 components working together</p>
                <p className="mt-0.5 text-[12.5px] text-fg-muted">
                  Selected from {catalog.models} models and {catalog.tools} tools based on your
                  constraints.
                </p>
              </div>
              <Link
                href="/features"
                className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-line bg-surface px-3 py-2 text-[13px] font-medium whitespace-nowrap text-forge"
              >
                View architecture diagram
                <ArrowRightIcon className="size-3.5" />
              </Link>
            </div>
          </TintedCard>

          <TintedCard tone="ember" className="relative flex flex-col p-0 sm:p-0">
            <div className="flex items-center gap-3 border-b border-line/70 px-5 py-4 pr-5 lg:pr-48">
              <IconTile icon={BarChart3Icon} size="sm" />
              <div className="min-w-0">
                <p className="font-mono text-[10.5px] tracking-[0.12em] text-fg-subtle uppercase">
                  Where the score came from
                </p>
                <p className="mt-1 text-[13px] text-fg-muted">
                  Ten dimensions, weighted and transparent
                </p>
              </div>
            </div>

            {/* The headline, pulled out of the list it is computed from. */}
            <div className="absolute top-3 right-4 hidden items-center gap-3 rounded-xl border border-line bg-surface px-4 py-3 shadow-overlay lg:flex">
              <div>
                <p className="text-[12px] text-fg-muted">Stack score</p>
                <p className="mt-0.5 font-mono text-[22px] leading-none font-semibold text-fg tabular-nums">
                  85.0
                  <span className="ml-1 text-[12px] font-normal text-fg-subtle">/ 100</span>
                </p>
              </div>
              <ScoreDial value={85} />
            </div>

            <ul className="flex flex-col gap-3.5 px-5 py-5">
              {SCORE_DIMENSIONS.map(([label, score, weight, bar, Icon]) => (
                <li key={label} className="flex items-center gap-3">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-line bg-surface text-fg-muted">
                    <Icon className="size-3.5" aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1 truncate text-[13.5px] text-fg sm:w-40 sm:flex-none">
                    {label}
                  </span>
                  {/* The bar is the first thing to go when the row runs out of
                      width — it is the redundant half of the pair, since the
                      figure beside it says the same thing exactly. */}
                  <span className="hidden h-1.5 min-w-8 flex-1 overflow-hidden rounded-full bg-surface-3 sm:block">
                    <span className={cnBar(bar)} style={{ width: `${(score / 10) * 100}%` }} />
                  </span>
                  <span className="shrink-0 font-mono text-[13px] text-fg tabular-nums">
                    {score.toFixed(1)}
                    <span className="ml-1.5 hidden font-normal text-fg-subtle sm:inline">
                      · {weight}% weight
                    </span>
                  </span>
                </li>
              ))}
            </ul>

            <div className="m-4 mt-auto flex items-start gap-3 rounded-lg border border-warning-line/60 bg-warning-quiet/60 px-4 py-3.5">
              <ZapIcon className="mt-0.5 size-4 shrink-0 text-warning-strong" aria-hidden />
              <p className="text-[13px] leading-relaxed text-fg-muted">
                Ten weighted dimensions in total. The contributions sum to the headline, so the
                number is checkable.
              </p>
            </div>
          </TintedCard>
        </div>
      </Section>

      {/* ── 7 · Workflows ────────────────────────────────────────────────── */}
      {/* Clipped because the layer diagram is skewed and translated, and a
          transform paints outside its box without widening its parent — so it
          reached 7px past the viewport at `lg` and nothing in the layout knew
          it had. Nothing else in the section comes near the edge. */}
      <Section wide className="overflow-hidden">
        <div className="grid items-start gap-10 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
          <SectionHeader
            eyebrow="Workflows"
            title="Five workflows, and the layer that ties them together."
            lede="Go from idea to a complete, defensible AI architecture with focused workflows."
          />
          <div className="relative hidden items-start justify-end gap-6 lg:flex">
            <Annotation direction="down-right" className="mt-2 w-40 text-right">
              Different problems.
              <br />
              One connected workflow.
            </Annotation>
            <LayerStack
              className="mt-2 w-56 shrink-0"
              layers={[
                { label: "Applications", tone: "forge" },
                { label: "Workflows", tone: "ember" },
                { label: "AI stack", tone: "info" },
              ]}
            />
          </div>
        </div>

        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {WORKFLOWS.map((workflow, i) => {
            const Visual = WORKFLOW_VISUALS[i] ?? CostVisual;
            return (
              <TintedCardLink
                key={workflow.href}
                href={workflow.href}
                tone={WORKFLOW_TONES[i] ?? "neutral"}
                className="sm:p-5"
              >
                <IconTile icon={workflow.icon} />
                <h3 className="mt-5 text-[16px] font-semibold text-fg">{workflow.label}</h3>
                <p className="mt-2 text-[13px] leading-relaxed text-fg-muted">{workflow.body}</p>
                <div className="mt-5">
                  <Visual />
                </div>
                <CardCue>Open</CardCue>
              </TintedCardLink>
            );
          })}
        </div>
      </Section>

      {/* ── 8 · Pricing ──────────────────────────────────────────────────── */}
      <Section wide id="pricing">
        <div className="grid items-start gap-12 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.55fr)]">
          <div>
            <SectionHeader
              eyebrow="Pricing"
              title="Free users get real answers."
              lede="The paid tiers are for keeping the work and taking it out of the app — not for gating the tools. Every calculator is open to everyone."
            />

            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Button
                asChild
                size="lg"
                className="h-11 bg-ember px-5 text-[14px] text-ember-fg shadow-none hover:bg-ember-hover"
              >
                <Link href="/pricing">
                  See the plans
                  <ArrowRightIcon className="size-4" />
                </Link>
              </Button>
              <p className="max-w-[30ch] text-[12.5px] leading-relaxed text-fg-subtle">
                Prices are rendered from the same configuration the checkout charges from.
              </p>
            </div>

            <ul className="mt-10 grid gap-6 border-t border-line pt-8 sm:grid-cols-3">
              {[
                {
                  icon: CalculatorIcon,
                  tone: "success" as Tone,
                  title: "All calculators free",
                  note: "No paywall for core tools",
                },
                {
                  icon: FileTextIcon,
                  tone: "forge" as Tone,
                  title: "Real pricing data",
                  note: "Same as checkout",
                },
                {
                  icon: ShieldCheckIcon,
                  tone: "info" as Tone,
                  title: "Built for builders",
                  note: "Transparent and fair",
                },
              ].map((item) => (
                <li key={item.title} data-tone={item.tone}>
                  <span className="inline-flex size-10 items-center justify-center rounded-lg bg-tone-quiet text-tone">
                    <item.icon className="size-4.5" aria-hidden />
                  </span>
                  <p className="mt-3 text-[14px] font-semibold text-fg">{item.title}</p>
                  <p className="mt-1 text-[12.5px] text-fg-muted">{item.note}</p>
                </li>
              ))}
            </ul>
          </div>

          <div className="relative">
            <Annotation
              direction="down-right"
              className="absolute -top-20 left-0 w-44"
              arrowClassName="ml-auto h-9"
            >
              Start free, upgrade
              <br />
              when you need more.
            </Annotation>
            <PricingTeaser plans={plans} />
          </div>
        </div>
      </Section>

      {/* ── 9 · FAQ preview ──────────────────────────────────────────────── */}
      <Section wide>
        <div className="grid items-start gap-10 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
          <SectionHeader
            eyebrow="Questions"
            title="The four we get most."
            lede="Straight answers, no marketing language."
          />
          <div className="hidden items-start justify-end gap-6 lg:flex">
            <Annotation direction="down-right" className="mt-2 w-44 text-right">
              Common questions from
              <br />
              builders and teams.
            </Annotation>
            <div
              data-tone="info"
              className="tone-wash mt-2 w-52 shrink-0 rounded-xl border border-tone-line/60 p-4 text-center"
            >
              <span className="mx-auto flex size-10 items-center justify-center rounded-full bg-surface text-tone shadow-panel">
                <MessageCircleIcon className="size-5" aria-hidden />
              </span>
              <p className="mt-3 text-[13px] font-medium text-fg">Still have a question?</p>
              <Link
                href="/contact"
                className="mt-1.5 inline-flex items-center gap-1 text-[13px] font-medium text-tone hover:underline"
              >
                Get in touch
                <ArrowRightIcon className="size-3.5" />
              </Link>
            </div>
          </div>
        </div>

        <dl className="mt-12 grid gap-5 md:grid-cols-2">
          {FAQ.slice(0, 4).map((item, i) => {
            const tones: Tone[] = ["info", "ember", "success", "forge"];
            const icons: LucideIcon[] = [UserIcon, DatabaseIcon, BrainIcon, FileTextIcon];
            const Icon = icons[i] ?? FileTextIcon;
            return (
              <TintedCard key={item.q} tone={tones[i] ?? "neutral"} className="flex gap-4">
                <IconTile icon={Icon} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <dt className="text-[16.5px] leading-snug font-semibold text-balance text-fg">
                      {item.q}
                    </dt>
                    <span className="shrink-0 rounded-md bg-tone-quiet px-2 py-1 font-mono text-[11px] font-medium text-tone">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                  </div>
                  <dd className="mt-3 text-[13.5px] leading-relaxed text-fg-muted">{item.a}</dd>
                </div>
              </TintedCard>
            );
          })}
        </dl>

        <Link
          href="/faq"
          className="mt-8 inline-flex items-center gap-1.5 text-[13.5px] font-medium text-ember hover:underline"
        >
          Read the full FAQ
          <ArrowRightIcon className="size-3.5" />
        </Link>
      </Section>

      {/* ── 10 · Close ───────────────────────────────────────────────────── */}
      <Section wide>
        <div className="relative overflow-hidden rounded-xl border border-line bg-surface px-6 py-14 sm:px-10">
          <div
            className="bg-dots pointer-events-none absolute inset-0 mask-[radial-gradient(ellipse_60%_80%_at_50%_50%,black,transparent)] opacity-30"
            aria-hidden
          />

          <div className="relative grid items-center gap-10 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.5fr)_minmax(0,0.8fr)]">
            <div aria-hidden className="hidden lg:block">
              <LayerStack
                className="w-full max-w-56"
                layers={[
                  { label: "AI models", tone: "forge", icon: BrainIcon },
                  { label: "Data", tone: "ember", icon: DatabaseIcon },
                  { label: "Tools", tone: "success", icon: BoxIcon },
                  { label: "Infrastructure", tone: "info", icon: SparklesIcon },
                ]}
              />
              <Annotation direction="up-right" className="mt-4 w-40">
                Plan smarter.
                <br />
                Build with confidence.
              </Annotation>
            </div>

            <div className="text-center">
              <h2 className="mx-auto max-w-[20ch] font-serif text-[clamp(1.9rem,4vw,3rem)] leading-[1.08] tracking-[-0.03em] text-balance text-fg">
                Plan the stack before you <span className="text-ember">build it.</span>
              </h2>
              <p className="mx-auto mt-4 max-w-[46ch] text-[15px] leading-relaxed text-pretty text-fg-muted">
                Free to start, no card. Twenty-five runs a day, every tool included.
              </p>

              <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
                <Button
                  asChild
                  size="lg"
                  className="h-11 bg-ember px-6 text-[14px] text-ember-fg shadow-none hover:bg-ember-hover"
                >
                  <Link href="/signup">
                    Get started free
                    <ArrowRightIcon className="size-4" />
                  </Link>
                </Button>
                <Button asChild variant="outline" size="lg" className="h-11 px-6 text-[14px]">
                  <Link href="/pricing">See pricing</Link>
                </Button>
              </div>

              <ul className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2.5 text-[13px] text-fg-muted">
                {[
                  { icon: ZapIcon, label: "No credit card" },
                  { icon: RefreshCwIcon, label: "25 runs a day" },
                  { icon: BoxIcon, label: "All tools included" },
                ].map((item) => (
                  <li key={item.label} className="flex items-center gap-2">
                    <item.icon className="size-4 shrink-0 text-ember" aria-hidden />
                    {item.label}
                  </li>
                ))}
              </ul>
            </div>

            <div aria-hidden className="hidden lg:block">
              <StackChecklistVisual />
              <Annotation direction="up-left" className="mt-4 w-40 text-right">
                From idea
                <br />
                to architecture.
              </Annotation>
            </div>
          </div>
        </div>
      </Section>
    </>
  );
}

/**
 * The fill on a score bar.
 *
 * A local helper rather than an inline template string because the class it
 * builds is the *only* thing that varies between seven otherwise identical
 * rows, and the colour has to survive Tailwind's scanner — which reads source
 * text, not runtime values. Every class it can produce is written out
 * literally in the table above, so they are all in the build.
 */
function cnBar(bar: string) {
  return `block h-full rounded-full ${bar}`;
}
