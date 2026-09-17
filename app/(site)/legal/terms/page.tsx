import type { Metadata } from "next";

import { LegalPage } from "@/components/home/sections/legal";

/**
 * Terms, pending counsel review.
 *
 * The text is `content/legal/terms.md`, rendered rather than transcribed —
 * see `lib/marketing/legal.ts` for why the document stays a document, and
 * `components/home/sections/legal.tsx` for how it is set.
 */

export const metadata: Metadata = {
  title: "Terms",
  description: "The terms covering use of AIVeda, its plans, and what its output is and is not.",
  alternates: { canonical: "/legal/terms" },
  // Still noindex while the document is a draft.
  robots: { index: false, follow: true },
};

export default function Page() {
  return <LegalPage name="terms" title="Terms and Conditions" />;
}
