import { Fragment } from "react";
import type { Metadata } from "next";

import { Reveal } from "@/components/home/fx/type";
import { CtaBand } from "@/components/home/sections/cta-band";
import { Section } from "@/components/home/sections/head";
import { PageHead } from "@/components/home/sections/page-head";
import { FAQ } from "@/lib/marketing/content";

/**
 * The full FAQ.
 *
 * ## Every answer is open, and that is the difference from the home page
 *
 * The home page's question chapter is an accordion, for a good reason stated
 * there: five three-sentence answers, expanded, are a wall of body copy at the
 * point where the reader has decided and is looking for the button.
 *
 * This page is the opposite case and gets the opposite treatment. A reader
 * here came *for* the answers, so collapsing them puts a click between them
 * and the thing they navigated for. It also matters for what this page
 * carries: an accordion removes the closed panels from the DOM, which would
 * leave a page of questions with no answers in the HTML — while publishing
 * `FAQPage` structured data claiming those answers exist. Search engines would
 * be told one thing and shown another.
 *
 * ## The structured data
 *
 * Generated from the same array the page renders, so the two cannot disagree.
 * Hand-maintained structured data that has drifted from the visible answer is
 * worse than none, because search engines surface the stale copy.
 */

export const metadata: Metadata = {
  title: "FAQ",
  description:
    "What Buildtact does, where its numbers come from, what you can export, and what happens to your work if you never sign up.",
  alternates: { canonical: "/faq" },
};

export default function Page() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: { "@type": "Answer", text: item.a },
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        // The content is our own constant, not user input.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <PageHead
        eyebrow="FAQ"
        // Matched by `e2e/marketing.spec.ts` against /Questions worth a
        // straight answer/, and the lines join with spaces into the accessible
        // name — so they have to read as a sentence in order.
        title={[
          "Questions worth",
          <Fragment key="last">
            a straight answer<span className="text-(--h-acc)">.</span>
          </Fragment>,
        ]}
        lede="Including the ones where the answer is a qualified yes, or no."
      />

      <Section>
        {/* One `div` between the `dl` and each `dt`/`dd` pair, which is the
            single level of wrapping a description list permits. The reveal is
            therefore on that div rather than around it. */}
        <dl className="border-t border-(--h-line)">
          {FAQ.map((item, i) => (
            <Reveal
              key={item.q}
              delay={Math.min(i, 4) * 0.04}
              className="grid gap-4 border-b border-(--h-line) py-9 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] lg:gap-16"
            >
              <dt className="t-head flex gap-6 text-[clamp(1.15rem,2.2vw,1.75rem)]">
                <span className="t-mono shrink-0 pt-2 text-(--h-fg-45)">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="max-w-[24ch]">{item.q}</span>
              </dt>
              <dd className="t-body max-w-[64ch]">{item.a}</dd>
            </Reveal>
          ))}
        </dl>
      </Section>

      <CtaBand
        title={["Still", "deciding?"]}
        lede="The free tier runs every tool, twenty-five times a day, and takes no card."
        primary={{ href: "/signup", label: "Get started free" }}
        secondary={{ href: "/contact", label: "Ask us" }}
      />
    </>
  );
}
