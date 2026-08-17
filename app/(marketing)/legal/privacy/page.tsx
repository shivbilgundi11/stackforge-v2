import type { Metadata } from "next";

import { LegalDraftNotice } from "@/components/marketing/legal-draft-notice";
import { Section, SectionHeader } from "@/components/marketing/section";

/**
 * Privacy (M22, pending counsel review).
 *
 * Every retention window and third party named below is taken from the
 * implementation rather than from a template: anonymous sessions and the
 * thirty-day run window from M17, the seven-day export TTL from M18, Razorpay
 * from M20, and the transactional email provider from M03. A privacy page
 * that describes a different product than the one running is the specific
 * failure this build is trying not to repeat.
 */

export const metadata: Metadata = {
  title: "Privacy",
  description: "What StackForge collects, why, how long it is kept, and who else sees it.",
  alternates: { canonical: "/legal/privacy" },
  robots: { index: false, follow: true },
};

const SECTIONS = [
  {
    heading: "What we collect",
    body: [
      "If you use the product without an account, a signed anonymous session identifier is stored in a cookie so your runs and your daily allowance can be attributed to you. It is not linked to a person.",
      "If you create an account, we store your email address, your display name if you provide one, and a hash of your password. We never store the password itself.",
      "We store the inputs and results of the tools you run, so you can reopen them. For the PDF token estimator, the file is read to count its tokens and is not persisted after the request.",
      "We record operational data — request timing, error information, and which features are used — to keep the service working and to understand what to build next.",
    ],
  },
  {
    heading: "How long we keep it",
    body: [
      "Runs made without an account are kept for thirty days and then purged. Signing in from the same browser moves those runs onto your account, where they are kept until you delete them.",
      "Generated exports are cached for seven days and then deleted; the underlying result stays, so the export can be regenerated.",
      "Deleting your account removes your account record and the work attached to it.",
    ],
  },
  {
    heading: "Who else sees it",
    body: [
      "Payments are processed by Razorpay. Card and UPI details go to Razorpay directly and never reach StackForge; we store only the subscription and invoice records they return to us.",
      "Transactional email — verification, password reset, and billing notices — is delivered by an email provider on our behalf.",
      "Where a result is written up in prose by a language model, the computed result and the inputs behind it are sent to that model's provider to produce the text. Results that are purely rule-based involve no third party at all.",
      "We do not sell personal data, and we do not share it for advertising.",
    ],
  },
  {
    heading: "Cookies",
    body: [
      "We set a cookie for your session — anonymous or signed in — and one for interface preferences such as the sidebar state and theme. These are required for the product to work.",
      "Analytics are not loaded before consent. If you decline, the product functions normally and no analytics cookie is set.",
    ],
  },
  {
    heading: "Your choices",
    body: [
      "You can export your work at any time, in Markdown on every plan.",
      "You can revoke any public share link you have created, immediately and permanently.",
      "You can end individual sessions or sign out everywhere from settings, and you can delete your account, which removes the work attached to it.",
    ],
  },
];

export default function Page() {
  return (
    <Section bleed>
      <SectionHeader eyebrow="Legal" title="Privacy" />
      <div className="mt-8 max-w-[72ch]">
        <LegalDraftNotice />
      </div>

      <div className="mt-10 flex max-w-[72ch] flex-col gap-10">
        {SECTIONS.map((section) => (
          <section key={section.heading}>
            <h2 className="text-[16px] font-semibold text-fg">{section.heading}</h2>
            <div className="mt-3 flex flex-col gap-3">
              {section.body.map((paragraph) => (
                <p key={paragraph} className="text-[14px] leading-relaxed text-pretty text-fg-muted">
                  {paragraph}
                </p>
              ))}
            </div>
          </section>
        ))}
      </div>
    </Section>
  );
}
