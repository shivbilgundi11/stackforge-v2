"use client";

import Link from "next/link";

import { MaskLines, Reveal, Rule, Stagger, StaggerItem } from "@/components/home/fx/type";
import { Section } from "@/components/home/sections/head";

/**
 * Chapter six: why the output can be checked.
 *
 * ## Shape
 *
 * A sticky left column against a scrolling list, which is the right structure
 * for a claim with six supports: the claim stays on screen the whole time the
 * evidence for it goes past. Six cards in a grid would put the claim above the
 * fold and the evidence below it, where the two never meet.
 *
 * ## Why this chapter exists at all
 *
 * Because it is the product's actual differentiator and the one a visitor is
 * most likely to disbelieve. The previous build of this site promised LLM
 * synthesis over a rule engine that never called a model, and every sentence
 * below is written against that: each one describes something a reader can go
 * and verify in the product, and the two figures in it — the verification date
 * and the pairwise entry count — are read live from the catalog rather than
 * typed in here.
 */

export function Principles({ pairs, verified }: { pairs: string; verified: string }) {
  const items = [
    {
      n: "01",
      title: "Deterministic first",
      body: "Rule engines compute every figure before any model is called. Where a model writes the prose, the result says so — and when it is unavailable, the computed answer ships anyway.",
    },
    {
      n: "02",
      title: "Provenance on every price",
      body: `Each catalog row carries the source it came from and the date it was last verified. The oldest row in the catalog right now was verified on ${verified}.`,
    },
    {
      n: "03",
      title: "Compatibility is data, not vibes",
      body: `${pairs} pairwise entries decide whether two tools belong in the same stack, and a stack is scored on its worst pairing rather than its average.`,
    },
    {
      n: "04",
      title: "Constraints eliminate",
      body: "A regulated-data requirement removes managed-only options instead of docking them a few points. A recommendation missing the tool you expected tells you why it was excluded.",
    },
    {
      n: "05",
      title: "Artifacts, not advice",
      body: "The architecture document, diagram, roadmap, Compose file, and .cursorrules are generated from the same result you are looking at, so they cannot drift from it.",
    },
    {
      n: "06",
      title: "Generated files are starters",
      body: "The Compose and Kubernetes output is a starting template you will edit — described that way here because it is described that way in the product.",
    },
  ];

  return (
    <Section>
      <Rule />
      <div className="grid gap-12 pt-7 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] lg:gap-16">
        {/* The claim, held on screen while its evidence scrolls past. */}
        <div className="lg:sticky lg:top-32 lg:self-start">
          <Reveal from="none" duration={0.6}>
            <p className="t-mono flex items-baseline gap-3 text-(--h-fg-45)">
              <span className="text-(--h-acc)">06</span>
              The method, defended
            </p>
          </Reveal>

          <MaskLines
            as="h2"
            lines={["Every number", "is checkable."]}
            className="t-head mt-7 text-[clamp(2rem,5.6vw,4.4rem)]"
          />

          <Reveal delay={0.2}>
            <p className="t-body mt-8 max-w-[44ch]">
              The point of this product is that you can defend its output in a review. That is a
              constraint on how it is built, not a claim about how it feels to use.
            </p>
          </Reveal>

          <Reveal delay={0.28} className="mt-9">
            <Link href="/about" data-cursor="Read" className="u-link t-mono text-(--h-acc)">
              How the catalog is maintained →
            </Link>
          </Reveal>
        </div>

        <Stagger step={0.06} className="border-t border-(--h-line)">
          {items.map((item) => (
            <StaggerItem key={item.n} className="group border-b border-(--h-line) py-7 lg:py-9">
              <div className="flex gap-6 lg:gap-10">
                <span className="t-mono shrink-0 pt-1 text-(--h-fg-45) transition-colors duration-300 group-hover:text-(--h-acc)">
                  {item.n}
                </span>
                <div>
                  <h3 className="t-head text-[clamp(1.15rem,2vw,1.6rem)]">{item.title}</h3>
                  <p className="t-body mt-3.5">{item.body}</p>
                </div>
              </div>
            </StaggerItem>
          ))}
        </Stagger>
      </div>
    </Section>
  );
}
