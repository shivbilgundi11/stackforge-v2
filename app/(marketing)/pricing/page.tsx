import type { Metadata } from "next";

import { PricingTable } from "@/components/features/billing/pricing-table";
import { CtaBand, Section, SectionHeader } from "@/components/marketing/section";

/**
 * Pricing (M20, re-homed by M22).
 *
 * Moved out of the app shell and into the marketing group, which is what M20
 * anticipated when it put this page inside the shell as a placeholder. The
 * data it renders from is unchanged: `PricingTable` reads `GET /billing/plans`,
 * which is generated from the same plan catalog the checkout charges from — so
 * the page cannot advertise a number the checkout will not take.
 *
 * That is the one thing this page must never lose. Every hand-maintained
 * pricing page drifts from its billing configuration eventually, and the
 * failure is invisible until a customer is quoted one price and charged
 * another.
 */
export const metadata: Metadata = {
  title: "Pricing",
  description:
    "Every tool is free to use. Paying is for keeping the work, exporting it, and being told when the numbers move.",
  alternates: { canonical: "/pricing" },
};

export default function Page() {
  return (
    <>
      <Section bleed>
        <SectionHeader
          eyebrow="Pricing"
          title="Every tool is open. You pay to keep the answer."
          lede="The calculators are not the paid part — free accounts get real, complete results. What Pro buys is taking the work out of the app and keeping it."
          align="center"
        />
        <div className="mt-12">
          <PricingTable />
        </div>
      </Section>
      <CtaBand
        title="Start on the free tier."
        lede="Twenty-five runs a day, Markdown export on every result, and no card."
        primary={{ href: "/signup", label: "Create an account" }}
        secondary={{ href: "/faq", label: "Read the FAQ" }}
      />
    </>
  );
}
