import type { Metadata } from "next";

import { LegalPage } from "@/components/home/sections/legal";

/**
 * Privacy, pending counsel review.
 *
 * The text is `content/legal/privacy.md`, rendered rather than transcribed —
 * see `lib/marketing/legal.ts` for why the document stays a document, and
 * `components/home/sections/legal.tsx` for how it is set.
 */

export const metadata: Metadata = {
  title: "Privacy",
  description: "What Buildtact collects, why, how long it is kept, and who else sees it.",
  alternates: { canonical: "/legal/privacy" },
  // Still noindex while the document is a draft. A policy a search engine has
  // cached is one people rely on, and this one is not in force yet.
  robots: { index: false, follow: true },
};

export default function Page() {
  return <LegalPage name="privacy" title="Privacy Policy" />;
}
