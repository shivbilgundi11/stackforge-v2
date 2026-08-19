import type { Metadata } from "next";

import { Markdown } from "@/components/forge/markdown";
import { LegalDraftNotice } from "@/components/marketing/legal-draft-notice";
import { Section, SectionHeader } from "@/components/marketing/section";
import { readDates, readLegalDocument } from "@/lib/marketing/legal";

/**
 * Privacy (M22, pending counsel review).
 *
 * The text is `content/legal/privacy.md`, rendered rather than transcribed —
 * see `lib/marketing/legal.ts` for why the document stays a document.
 *
 * A server component with no client boundary, so the policy is in the HTML a
 * crawler and a regulator receive rather than assembled after hydration, and
 * `/legal/privacy` stays in the statically prerendered set.
 */

export const metadata: Metadata = {
  title: "Privacy",
  description: "What StackForge collects, why, how long it is kept, and who else sees it.",
  alternates: { canonical: "/legal/privacy" },
  // Still noindex while the document is a draft. A policy a search engine has
  // cached is one people rely on, and this one is not in force yet.
  robots: { index: false, follow: true },
};

export default async function Page() {
  const { effective, updated, body } = readDates(await readLegalDocument("privacy"));

  return (
    <Section bleed>
      <SectionHeader eyebrow="Legal" title="Privacy Policy" />

      {effective || updated ? (
        <dl className="mt-5 flex flex-wrap gap-x-8 gap-y-1 text-[12.5px] text-fg-muted">
          {effective ? (
            <div className="flex gap-1.5">
              <dt className="font-medium text-fg">Effective</dt>
              <dd>{effective}</dd>
            </div>
          ) : null}
          {updated ? (
            <div className="flex gap-1.5">
              <dt className="font-medium text-fg">Last updated</dt>
              <dd>{updated}</dd>
            </div>
          ) : null}
        </dl>
      ) : null}

      <div className="mt-8 max-w-[72ch]">
        <LegalDraftNotice />
      </div>

      <Markdown content={body} className="mt-10 max-w-[72ch] text-[14px] text-fg-muted" />
    </Section>
  );
}
