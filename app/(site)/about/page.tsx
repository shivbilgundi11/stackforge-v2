import { Fragment } from "react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import { ProgressRail } from "@/components/home/fx/scroll";
import { MaskLines, Reveal, Rule, Stagger, StaggerItem } from "@/components/home/fx/type";
import { CtaBand } from "@/components/home/sections/cta-band";
import { Section, SectionHead } from "@/components/home/sections/head";
import { PageHead } from "@/components/home/sections/page-head";
import { getCatalogStats } from "@/lib/marketing/data";

/**
 * About.
 *
 * ## What this page may claim
 *
 * Positioning and the principles the product is built to, with no invented
 * company history, team size, funding or customer count. AIVeda is early and
 * the page says so: a claim we would have to retract later is worth less than
 * the credibility of the ones we can defend today. That is Q-02, and it is the
 * reason the only figures here are catalog counts read live from the API — the
 * one kind of number on this site that cannot quietly become wrong.
 *
 * ## Why it is built in the home page's design system
 *
 * It was previously a column of prose in the product's own type and colour,
 * under `(marketting)`. The argument for that split was that `/about` is read
 * *after* someone is interested, so it should look like the product. In
 * practice a visitor goes from the landing page to this one in a single click,
 * and the two looked like different companies.
 *
 * So this page and `/features` moved into the group that owns the designed
 * surface — see `app/(site)/layout.tsx`, which is also why that group is no
 * longer called `(home)`. `/pricing`, `/faq`, `/contact` and the legal pages
 * stay where they are: they are documents, and the display scale that suits an
 * argument is wrong for a table of plan limits or a privacy policy.
 */

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "About",
  description:
    "Why AIVeda exists, what it refuses to do, and the principles the product is built to.",
  alternates: { canonical: "/about" },
};

const CHAPTERS = ["What it is", "Principles", "Where we are"];

const PRINCIPLES = [
  {
    n: "01",
    title: "The rule engine decides. The model explains.",
    body: "Every figure is computed deterministically before any language model is involved. Where a model writes the prose over that result, the result is badged as model-authored — and when the model is unavailable, the computed answer ships regardless. A planning tool whose numbers change because an API had a bad afternoon is not a planning tool.",
  },
  {
    n: "02",
    title: "Every number carries its provenance.",
    body: "Prices come from vendor documentation with the source and the date they were last verified attached, and that date is shown on the result. Pricing moves constantly; pretending otherwise would make the tool feel more authoritative and be less useful.",
  },
  {
    n: "03",
    title: "Constraints eliminate rather than penalise.",
    body: "If your data cannot leave your infrastructure, a managed-only option is not a slightly-lower-scoring choice — it is not a choice. Recommendations that quietly rank down a disqualifying option produce answers that look reasonable and cannot be acted on.",
  },
  {
    n: "04",
    title: "The output is an artifact, not advice.",
    body: "A recommendation you cannot hand to anyone is a conversation. Every result generates the architecture document, the diagram, the roadmap, and the starter files from the same data the page renders, so what you export and what you read cannot drift apart.",
  },
  {
    n: "05",
    title: "We say when something is generated.",
    body: "Generated infrastructure is a starter template and is described that way everywhere it appears. So is an estimate that fell back to a heuristic instead of a real tokenizer. The product is more useful when you know which parts to check.",
  },
];

export default async function Page() {
  const catalog = await getCatalogStats();
  const pairs = catalog.compatibility_pairs.toLocaleString("en-GB");

  return (
    <>
      <ProgressRail chapters={CHAPTERS} />

      <PageHead
        eyebrow="About"
        // The accessible name of a `MaskLines` heading is these lines joined
        // with spaces — each is its own block element, so the browser inserts
        // one when it computes the name. The words therefore have to read as a
        // sentence in order: `e2e/marketing.spec.ts` matches this h1 against
        // /The planning layer that should already exist/.
        title={[
          "The planning layer",
          "that should",
          <Fragment key="last">
            already exist<span className="text-[var(--h-acc)]">.</span>
          </Fragment>,
        ]}
        lede="Teams decide their AI architecture in documents and Slack threads, then discover the cost in an invoice. AIVeda is the step in between — the one where the numbers get worked out while they can still change the decision."
      />

      {/* ── 01 What it is ─────────────────────────────────────────────────── */}
      <Section>
        <Rule />
        {/* One row for the whole chapter: mark, then heading and prose
            together, then the picture — so the picture starts level with the
            heading and runs down beside everything the chapter says.

            Composed here rather than through `SectionHead`, which sets the
            heading in a row of its own; with the heading there, a third column
            could only begin underneath it. The pieces are the same ones
            `SectionHead` uses, so the chapter still matches the other two. */}
        <div className="grid gap-8 pt-7 lg:grid-cols-[minmax(0,14rem)_minmax(0,1.25fr)_minmax(0,1fr)] lg:gap-16">
          <Reveal from="none" duration={0.6}>
            <p className="t-mono flex items-baseline gap-3 text-[var(--h-fg-45)]">
              <span className="text-[var(--h-acc)]">01</span>
              What it is
            </p>
          </Reveal>

          <div>
            {/* The other chapter heads scale with `5.6vw` across a full-width
                column. This one shares its row with the picture, so it scales
                a little slower to keep "workbench, not a" on one line down to
                laptop widths, and still tops out at the same 4.4rem. */}
            <MaskLines
              as="h2"
              lines={["An engineering", "workbench, not a", "code generator."]}
              className="t-head max-w-[18ch] text-[clamp(2rem,4.2vw,4.4rem)]"
            />

            <div className="mt-14 max-w-[62ch]">
              <Reveal>
                <p className="t-body">
                  You describe what you are building and its constraints; it costs the options,
                  scores them against each other, checks whether they work together, and hands back
                  the artifacts — an architecture document, a diagram, a roadmap, and starter
                  configuration.
                </p>
              </Reveal>

              <Reveal delay={0.08}>
                <p className="t-body mt-6">
                  It is not a code generator and it does not want to be. Writing the application is
                  your job and you will do it better than a generator would. What is missing from
                  most teams is the step before that: the one where somebody works out whether the
                  plan survives contact with a budget.
                </p>
              </Reveal>

              <Reveal delay={0.16}>
                <p className="t-body mt-6">
                  Underneath is a catalog of {catalog.models} priced models, {catalog.tools} tools,{" "}
                  {catalog.gpus} GPUs, and {pairs} scored compatibility pairs. The counts on this
                  site are read from that catalog rather than typed into the page, so they cannot
                  quietly become wrong.
                </p>
              </Reveal>

              <Reveal delay={0.24} className="mt-9">
                <Link
                  href="/features"
                  data-cursor="Read"
                  className="u-link t-mono text-[var(--h-acc)]"
                >
                  What each surface does →
                </Link>
              </Reveal>
            </div>
          </div>

          {/* An opaque photograph, unlike the home page's two cut-outs, so it
              takes the framed treatment `Shot` gives screenshots — a bare
              rectangle on the bone ground reads as pasted on.

              From `lg` it runs the full height of the heading and prose
              beside it. The text decides the row's height and the photo only
              covers it: the image is absolutely positioned inside its frame,
              so it contributes no height of its own and cannot stretch the
              row. A 3:2 scene in a column taller than it is wide has to be
              cropped to do that, and `object-cover` crops the sides. The
              focus sits at 66%, placed so the narrowest crop (about half the
              frame, at laptop widths) still holds the presenter's face at its
              left edge and the whole of the screen's Output list at its
              right. It gives up the handwriting on the wall and most of the
              man at the far right; wider layouts show progressively more.

              No `Parallax` here, unlike the home page's pictures. Those float
              free of the type; this one is matched to it at both edges, and a
              drift of any size shows as a misaligned top or bottom.

              Below `lg` it is uncropped at its natural 3:2 — there is no text
              beside it to match, and cropping a scene with no reason to loses
              people from it.

              Captioned, for the reason stated at the top of this file: this
              page claims no team, headcount or customers, and a staged scene
              of three people at a whiteboard is exactly what a reader takes
              for a photo of the team. Its "$1,920 / mo, ↓38%" is the
              picture's, too — not a figure the catalog produced. */}
          <Reveal from="none" duration={1.1}>
            <figure className="relative overflow-hidden rounded-xl border border-[var(--h-line-2)] lg:h-full">
              <Image
                src="/marketing/about-workbench.webp"
                alt="Illustration: a small team planning an AI system at a wall screen that maps models through plan, compare, optimise and deploy into an architecture, a cost estimate, an implementation plan and starter configuration."
                width={1536}
                height={1024}
                loading="lazy"
                // Cropped by width, so the file has to cover the column's
                // *height* at 3:2 — around 1.5x the column's width, up to
                // ~900px on the widest layout. Sized from the column, as the
                // home page's are, it would be upscaled into the crop.
                sizes="(max-width: 1024px) 100vw, 56rem"
                className="h-auto w-full lg:absolute lg:inset-0 lg:h-full lg:object-cover lg:object-[66%_50%]"
              />
              {/* On the photo rather than under it: a caption below the frame
                    takes its height out of the picture, and the frame then
                    stops short of the text it is meant to match. Set on a dark
                    chip because the photo is dark at that corner and the
                    page's grey would vanish into it. */}
              <figcaption className="t-mono absolute bottom-3 left-3 rounded-full bg-black/55 px-2.5 py-1 text-[9px] text-white/85 backdrop-blur-sm">
                Illustration
              </figcaption>
            </figure>
          </Reveal>
        </div>
      </Section>

      {/* ── 02 Principles ─────────────────────────────────────────────────── */}
      <Section chapter="ink">
        <Rule />
        <div className="grid gap-12 pt-7 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] lg:gap-16">
          {/* The claim is held on screen while its five supports scroll past,
              the same structure as the home page's defence chapter and for the
              same reason: a list this long put below its own heading means the
              heading is gone by the time the evidence starts. */}
          <div className="lg:sticky lg:top-32 lg:self-start">
            <Reveal from="none" duration={0.6}>
              <p className="t-mono flex items-baseline gap-3 text-(--h-fg-45)">
                <span className="text-(--h-acc)">02</span>
                Principles
              </p>
            </Reveal>

            <MaskLines
              as="h2"
              lines={["What the product", "is built to."]}
              className="t-head mt-7 text-[clamp(2rem,5.6vw,4.4rem)]"
            />

            <Reveal delay={0.2}>
              <p className="t-body mt-8 max-w-[44ch]">
                These are constraints on how it is built rather than claims about how it feels to
                use. Each one rules something out, which is the only kind of principle worth writing
                down.
              </p>
            </Reveal>
          </div>

          <Stagger step={0.06} className="border-t border-[var(--h-line)]">
            {PRINCIPLES.map((principle) => (
              <StaggerItem
                key={principle.n}
                className="group border-b border-[var(--h-line)] py-7 lg:py-9"
              >
                <div className="flex gap-6 lg:gap-10">
                  <span className="t-mono shrink-0 pt-1 text-[var(--h-fg-45)] transition-colors duration-300 group-hover:text-[var(--h-acc)]">
                    {principle.n}
                  </span>
                  <div>
                    <h3 className="t-head text-[clamp(1.15rem,2vw,1.6rem)]">{principle.title}</h3>
                    <p className="t-body mt-3.5">{principle.body}</p>
                  </div>
                </div>
              </StaggerItem>
            ))}
          </Stagger>
        </div>
      </Section>

      {/* ── 03 Where we are ───────────────────────────────────────────────── */}
      <Section>
        <SectionHead
          index="03"
          label="Where we are"
          title={["Early, and", "saying so."]}
          lede="AIVeda is in active development. There are no customer logos on this site because there are no customers to name yet, and a wall of invented testimonials would tell you nothing except that we were willing to invent them."
        />

        <div className="mt-14 grid gap-10 lg:grid-cols-[minmax(0,14rem)_minmax(0,1fr)] lg:gap-16">
          <Reveal className="max-w-[62ch] lg:col-start-2">
            <p className="t-body">
              What we can show you is the product doing the work, which is why every screenshot on
              this site is a real result rather than a mockup, and why the catalog figures are read
              from the API on every build rather than written into the page. The honest version of
              social proof, for a product at this stage, is a number you can go and check.
            </p>
          </Reveal>
        </div>
      </Section>

      <CtaBand
        title={["Judge it on", "the output."]}
        lede="Run it against a system you are actually planning, and see whether the numbers hold up."
      />
    </>
  );
}
