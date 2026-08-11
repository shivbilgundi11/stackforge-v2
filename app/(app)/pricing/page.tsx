import type { Metadata } from "next";

import { PricingTable } from "@/components/features/billing/pricing-table";

/**
 * Public pricing (M20).
 *
 * Inside the app shell rather than a marketing layout: the shell is open to
 * anonymous visitors by design (D-17), and every upgrade dialog in the product
 * links here. M22 may re-home it alongside the rest of the marketing site; the
 * data it renders from does not change if it does.
 */
export const metadata: Metadata = {
  title: "Pricing",
  description:
    "Every tool is free to use. Paying is for keeping the work, exporting it, and being told when the numbers move.",
};

export default function Page() {
  return <PricingTable />;
}
