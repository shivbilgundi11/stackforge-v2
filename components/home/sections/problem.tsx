"use client";

import Image from "next/image";

import { Parallax, ScrubText } from "@/components/home/fx/scroll";
import { Reveal, Rule } from "@/components/home/fx/type";
import { HoverPreview } from "@/components/home/fx/ui";
import { Section } from "@/components/home/sections/head";
import {
  InvoiceVisual,
  LandscapeVisual,
  ScatteredVisual,
} from "@/components/marketing/home-visuals";

/**
 * Chapters one and two: the premise, and the three failure modes.
 *
 * ## The premise is scroll-paced on purpose
 *
 * The opening claim is the page's argument in three sentences, and a reader
 * who skims it has skipped the reason the rest exists. `ScrubText` ties its
 * legibility to scroll position, which sets a reading pace without taking
 * control of the scroll — the reader can go as fast or as slow as they like,
 * including backwards, and nothing is hidden at any point.
 *
 * ## The list, and why it is a list
 *
 * Three cards in a row is the default and it is the wrong shape here: these
 * are not three parallel features, they are three symptoms of one thing, and a
 * numbered list reads as a sequence where a grid reads as a menu. At full size
 * each row is a headline, which gives the section three moments instead of one.
 *
 * Hovering a row floats its figure beside the pointer. That is decoration over
 * a list that already works — the rows carry their meaning in text, the panel
 * is `aria-hidden`, and it never mounts without a fine pointer.
 */

const ROWS = [
  {
    id: "cost",
    n: "01",
    title: "The bill arrives late",
    body: "Token spend, embedding ingestion, vector storage, and GPU hours sit in four different dashboards. Nothing adds them up until the invoice does.",
    tag: "Unexpected cost",
    preview: <InvoiceVisual className="w-64" />,
  },
  {
    id: "landscape",
    n: "02",
    title: "The landscape outruns the decision",
    body: "Models, vector databases, and agent frameworks turn over constantly, and which of them actually work together is not written down anywhere.",
    tag: "Moving target",
    preview: <LandscapeVisual className="w-64" />,
  },
  {
    id: "artifacts",
    n: "03",
    title: "Planning leaves nothing behind",
    body: "The work happens in documents and whiteboards, so there is no artifact to hand to the person building it, and it gets redone in six months.",
    tag: "Lost knowledge",
    preview: <ScatteredVisual className="w-64" />,
  },
];

export function Premise() {
  return (
    // `overflow-x-clip`: the illustration waits 96px to the right of its slot
    // before it slides in, which is past the page edge on any viewport narrower
    // than the container — and would add a horizontal scrollbar until it did.
    // `clip`, not `hidden`: it opens no scroll container, so nothing sticky
    // further up the tree stops sticking.
    <Section className="overflow-x-clip">
      <Rule />
      {/* Three columns from `lg`: the chapter mark, the claim, and the picture
          of it. The last two are fractional rather than a fixed image width,
          because the illustration is the claim drawn — sized against the type
          it argues with, it holds its share of the row at every width instead
          of shrinking into a thumbnail beside a headline that keeps growing. */}
      <div className="grid gap-8 pt-7 lg:grid-cols-[minmax(0,14rem)_minmax(0,1.25fr)_minmax(0,1fr)] lg:gap-16">
        <Reveal from="none" duration={0.6}>
          <p className="t-mono flex items-baseline gap-3 text-(--h-fg-45)">
            <span className="text-(--h-acc)">01</span>
            The premise
          </p>
        </Reveal>

        <ScrubText
          text="Most AI systems are costed after they are built. By then the architecture is decided, the bill is a surprise, and the reasoning behind the choices lives in a thread nobody can find. Buildtact moves all of that to the front, where changing your mind is still free."
          className="t-head max-w-[24ch] text-[clamp(1.7rem,4.4vw,3.4rem)]"
        />

        <PremiseVisual />
      </div>
    </Section>
  );
}

/**
 * The premise, drawn: the same system planned up front beside the same system
 * costed after the fact.
 *
 * ## It is not a `Shot`
 *
 * `Shot` frames product screenshots — a rounded border, a light and a dark
 * capture chosen from the ground it sits on. This is neither. It is a
 * transparent illustration with a deliberately torn edge, so a frame would cut
 * that edge off and a second capture does not exist. It also carries no
 * product UI, so nothing about it goes stale when a screen is redesigned.
 *
 * ## The alt text is the argument, not the inventory
 *
 * Listing the panels ("a diagram showing Use Case, Model Selection…") would
 * describe the picture and withhold the point. What a sighted reader takes
 * from it is the pair of numbers and the gap between them, so that is what is
 * written down — the same rule `Shot` states for screenshots.
 *
 * `Parallax` gives it the short travel every other figure on this page has.
 * The type beside it stays put, which is what makes the drift read as depth
 * rather than as the row coming apart.
 */
function PremiseVisual() {
  return (
    <Parallax distance={36} className="lg:pt-6">
      {/* Slides left into place as it arrives. Inside the parallax rather than
          around it, so the two transforms stay on separate elements: one moves
          it in, the other drifts it with the scroll. */}
      <Reveal from="right" distance={96} duration={1.1}>
        <Image
          src="/marketing/premise-plan-vs-built.webp"
          alt="The same build planned in advance, covering use case, model, data layer, infrastructure, and a $1,920 a month estimate, beside the version costed only after it shipped, at $4,870 a month and 143% over, with the reasoning for each choice scattered across old Slack, Notion and Gmail messages."
          width={1371}
          height={1148}
          loading="lazy"
          // Measured, not guessed. The column is `1fr` of a `1.25fr 1fr` split
          // after the 14rem chapter mark and two 4rem gaps, which works out at
          // roughly `0.44vw - 185px` until the 110rem container stops growing
          // and the slot settles at ~600px. A first pass said 34rem and Next
          // served a 544px file into a 597px box — under-resolution on any
          // display, and visibly soft on a retina one.
          sizes="(max-width: 1024px) 100vw, (max-width: 1824px) 35vw, 38rem"
          className="h-auto w-full"
        />
      </Reveal>
    </Parallax>
  );
}

export function Problem() {
  return (
    <Section>
      <Rule />
      <div className="grid gap-8 pt-7 lg:grid-cols-[minmax(0,14rem)_minmax(0,1fr)] lg:gap-16">
        <Reveal from="none" duration={0.6}>
          <p className="t-mono flex items-baseline gap-3 text-(--h-fg-45)">
            <span className="text-(--h-acc)">02</span>
            What goes wrong
          </p>
        </Reveal>

        <HoverPreview
          rows={ROWS.map((row) => ({
            id: row.id,
            preview: row.preview,
          }))}
        >
          <ul>
            {ROWS.map((row, i) => (
              <li key={row.id} data-row={row.id} className="group border-t border-(--h-line)">
                <Reveal delay={i * 0.06} className="py-9 lg:py-12">
                  <div className="grid gap-5 lg:grid-cols-[auto_minmax(0,1fr)_minmax(0,22rem)] lg:items-start lg:gap-12">
                    <span className="t-mono text-(--h-fg-45)">{row.n}</span>

                    <h3 className="t-head max-w-[16ch] text-[clamp(1.5rem,3.4vw,2.6rem)] transition-transform duration-500 ease-(--h-ease) lg:group-hover:translate-x-3">
                      {row.title}
                    </h3>

                    <div>
                      <p className="t-body">{row.body}</p>
                      <p className="t-mono mt-5 text-(--h-acc)">{row.tag}</p>
                    </div>
                  </div>
                </Reveal>
              </li>
            ))}
          </ul>
          <span className="block border-t border-(--h-line)" />
        </HoverPreview>
      </div>
    </Section>
  );
}
