"use client";

import { ScrubText } from "@/components/home/fx/scroll";
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
    body: "The work happens in documents and whiteboards, so there is no artifact to hand to the person building it — and it gets redone in six months.",
    tag: "Lost knowledge",
    preview: <ScatteredVisual className="w-64" />,
  },
];

export function Premise() {
  return (
    <Section>
      <Rule />
      <div className="grid gap-8 pt-7 lg:grid-cols-[minmax(0,14rem)_minmax(0,1fr)] lg:gap-16">
        <Reveal from="none" duration={0.6}>
          <p className="t-mono flex items-baseline gap-3 text-[var(--h-fg-45)]">
            <span className="text-[var(--h-acc)]">01</span>
            The premise
          </p>
        </Reveal>

        <ScrubText
          text="Most AI systems are costed after they are built. By then the architecture is decided, the bill is a surprise, and the reasoning behind the choices lives in a thread nobody can find. AIVeda moves all of that to the front — where changing your mind is still free."
          className="t-head max-w-[24ch] text-[clamp(1.7rem,4.4vw,3.4rem)]"
        />
      </div>
    </Section>
  );
}

export function Problem() {
  return (
    <Section>
      <Rule />
      <div className="grid gap-8 pt-7 lg:grid-cols-[minmax(0,14rem)_minmax(0,1fr)] lg:gap-16">
        <Reveal from="none" duration={0.6}>
          <p className="t-mono flex items-baseline gap-3 text-[var(--h-fg-45)]">
            <span className="text-[var(--h-acc)]">02</span>
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
              <li key={row.id} data-row={row.id} className="group border-t border-[var(--h-line)]">
                <Reveal delay={i * 0.06} className="py-9 lg:py-12">
                  <div className="grid gap-5 lg:grid-cols-[auto_minmax(0,1fr)_minmax(0,22rem)] lg:items-start lg:gap-12">
                    <span className="t-mono text-[var(--h-fg-45)]">{row.n}</span>

                    <h3 className="t-head max-w-[16ch] text-[clamp(1.5rem,3.4vw,2.6rem)] transition-transform duration-500 ease-(--h-ease) lg:group-hover:translate-x-3">
                      {row.title}
                    </h3>

                    <div>
                      <p className="t-body">{row.body}</p>
                      <p className="t-mono mt-5 text-[var(--h-acc)]">{row.tag}</p>
                    </div>
                  </div>
                </Reveal>
              </li>
            ))}
          </ul>
          <span className="block border-t border-[var(--h-line)]" />
        </HoverPreview>
      </div>
    </Section>
  );
}
