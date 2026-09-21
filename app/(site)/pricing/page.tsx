import { Fragment } from "react";
import type { Metadata } from "next";

import { Stagger, StaggerItem } from "@/components/home/fx/type";
import { CtaBand } from "@/components/home/sections/cta-band";
import { Section, SectionHead } from "@/components/home/sections/head";
import { PageHead } from "@/components/home/sections/page-head";
import { PlanCards } from "@/components/home/sections/plan-cards";
import { getPlansStatic } from "@/lib/marketing/data";

/**
 * Pricing.
 *
 * ## The thing this page must never lose
 *
 * It renders from `GET /billing/plans`, which is generated from the same plan
 * catalog the checkout charges from — so the page cannot advertise a number
 * the checkout will not take. Every hand-maintained pricing page drifts from
 * its billing configuration eventually, and the failure is invisible until a
 * customer is quoted one price and charged another.
 *
 * The cards are `PlanCards`, shared with the home page's price chapter. That
 * is the same argument one level up: two components rendering prices is two
 * places for a price to live.
 *
 * ## Why the read moved to the server
 *
 * This page used `PricingTable`, a client component fetching on mount. The
 * read is now `getPlansStatic()` in the server component, which puts the
 * amounts in the HTML rather than after hydration and keeps the page in the
 * prerendered set. It also fails soft, which is what the group's "must render
 * with the API down" rule requires — and the soft failure is narrow: `PlanCards`
 * falls back to the checked-in plan structure, so an unreachable catalog costs
 * the two charged amounts and nothing else. The tiers, the taglines and the
 * feature lists are all still on the page. See `lib/marketing/plans.ts`.
 */

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Pricing",
  description:
    "Every tool is free to use. Paying is for keeping the work, exporting it, and being told when the numbers move.",
  alternates: { canonical: "/pricing" },
};

const ANSWERS = [
  {
    n: "01",
    q: "What does the free tier actually run?",
    a: "Every calculator and every engine, twenty-five times a day, with complete results rather than truncated ones. The tools are not the paid part.",
  },
  {
    n: "02",
    q: "So what am I paying for?",
    a: "Keeping the work and taking it out of the app: saved projects, the full export set (architecture document, diagram, roadmap, Compose and Kubernetes starters), and being told when a price your plan depends on moves.",
  },
  {
    n: "03",
    q: "What happens to my work if I stop paying?",
    a: "It stays readable. Downgrading does not delete projects; it stops new saves beyond the free tier's allowance and closes the export set. Nothing you already exported is affected.",
  },
  {
    n: "04",
    q: "How do seats work on Team?",
    a: "Per seat, per month, billed together. Seat changes take effect at the end of the billing cycle rather than immediately, so a mid-month change never produces a surprise proration.",
  },
];

export default async function Page() {
  const plans = await getPlansStatic();

  return (
    <>
      <PageHead
        eyebrow="Pricing"
        // Matched by `e2e/marketing.spec.ts` against /Every tool is open/, and
        // the lines join with spaces into the accessible name — so they have to
        // read as a sentence in order.
        title={[
          "Every tool is open.",
          "You pay to keep",
          <Fragment key="last">
            the answer<span className="text-(--h-acc)">.</span>
          </Fragment>,
        ]}
        lede="The calculators are not the paid part. Free accounts get real, complete results, and what Pro buys is taking the work out of the app and keeping it."
        // Crossfade-looped like /about, and stripped of the audio track the
        // source carried — a background must be silent, and a muted track is
        // still bytes. 2.57 MB at 1080p from md up, 1.18 MB at 720p below.
        backdrop={{
          video: "/marketing/pricing-hero.mp4",
          mobileVideo: "/marketing/pricing-hero-720.mp4",
          poster: "/marketing/pricing-hero-poster.webp",
        }}
      />

      {/* ── The plans ─────────────────────────────────────────────────────── */}
      <Section chapter="ink">
        <PlanCards plans={plans} className="border-t-0" />
      </Section>

      {/* ── What you keep ─────────────────────────────────────────────────── */}
      <Section>
        <SectionHead
          index="02"
          label="What you keep"
          title={["The questions", "a price list", "does not answer."]}
        />

        {/* Deliberately not a `<dl>`. A description list wants `dt`/`dd` as
            children, optionally through one wrapping `div` — and the reveal
            wrapper plus the two-column grid is two levels, which is invalid.
            These are short headed sections, so they are set as such. */}
        <Stagger step={0.06} className="mt-14 border-t border-(--h-line)">
          {ANSWERS.map((item) => (
            <StaggerItem key={item.n} className="group border-b border-(--h-line) py-7">
              <div className="flex gap-6 lg:gap-10">
                <span className="t-mono shrink-0 pt-1 text-(--h-fg-45) transition-colors duration-300 group-hover:text-(--h-acc)">
                  {item.n}
                </span>
                <div>
                  <h3 className="t-head text-[clamp(1.15rem,2vw,1.6rem)]">{item.q}</h3>
                  <p className="t-body mt-3.5 max-w-[62ch]">{item.a}</p>
                </div>
              </div>
            </StaggerItem>
          ))}
        </Stagger>
      </Section>

      <CtaBand
        title={["Start on the", "free tier."]}
        lede="Twenty-five runs a day, Markdown export on every result, and no card."
        primary={{ href: "/signup", label: "Create an account" }}
        secondary={{ href: "/faq", label: "Read the FAQ" }}
      />
    </>
  );
}
