import type { Metadata } from "next";

import { CtaBand, Section, SectionHeader } from "@/components/marketing/section";
import { FAQ } from "@/lib/marketing/content";

/**
 * The full FAQ (M22).
 *
 * Carries `FAQPage` structured data, which is one of the four schema types the
 * module's definition of done requires. The JSON-LD is generated from the same
 * array the page renders, so the two cannot disagree — hand-maintained
 * structured data that has drifted from the visible answer is worse than none,
 * because search engines surface the stale copy.
 */

export const metadata: Metadata = {
  title: "FAQ",
  description:
    "What StackForge does, where its numbers come from, what you can export, and what happens to your work if you never sign up.",
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

      <Section bleed>
        <SectionHeader
          eyebrow="FAQ"
          title="Questions worth a straight answer."
          lede="Including the ones where the answer is a qualified yes, or no."
        />

        <dl className="mt-12 flex flex-col divide-y divide-line border-y border-line">
          {FAQ.map((item) => (
            <div key={item.q} className="grid gap-2 py-6 md:grid-cols-[minmax(0,22rem)_1fr] md:gap-10">
              <dt className="text-[15px] font-semibold text-balance text-fg">{item.q}</dt>
              <dd className="max-w-[62ch] text-[14px] leading-relaxed text-pretty text-fg-muted">
                {item.a}
              </dd>
            </div>
          ))}
        </dl>
      </Section>

      <CtaBand
        title="Still deciding?"
        lede="Run one calculator against a system you are actually planning. It takes about a minute and needs no account."
        primary={{ href: "/cost/llm-pricing", label: "Cost a model" }}
        secondary={{ href: "/contact", label: "Ask us" }}
      />
    </>
  );
}
