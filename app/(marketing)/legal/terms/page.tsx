import type { Metadata } from "next";

import { LegalDraftNotice } from "@/components/marketing/legal-draft-notice";
import { Section, SectionHeader } from "@/components/marketing/section";

/**
 * Terms (M22, pending counsel review).
 *
 * The billing clauses describe the behaviour that is actually implemented —
 * cancellation at period end, seat changes at cycle end because the payment
 * provider does not prorate, and no trial on any plan. Terms that promise
 * proration the code does not do would be a commitment nobody could honour.
 */

export const metadata: Metadata = {
  title: "Terms",
  description: "The terms covering use of StackForge, its plans, and what its output is and is not.",
  alternates: { canonical: "/legal/terms" },
  robots: { index: false, follow: true },
};

const SECTIONS = [
  {
    heading: "Using the service",
    body: [
      "StackForge is a planning tool for AI systems. You may use it for your own work and for client work. You may not resell access to it, scrape the catalog, or use it to build a competing catalog.",
      "You are responsible for the accuracy of what you put in, and for what you do with what comes out.",
    ],
  },
  {
    heading: "What the output is",
    body: [
      "Every figure the product returns is a model of the assumptions you gave it, computed against catalog prices carried from vendor documentation. It is not a quote, a forecast, or a guarantee of what any vendor will charge you.",
      "Generated infrastructure — Compose files, Kubernetes manifests, MCP servers, and configuration — is a starter template. It is intended to be reviewed and edited before use, and it is not warranted as production-ready.",
      "Prices change without notice and vendors change their terms. Every catalog row carries the date it was last verified so you can judge how current it is; the responsibility for confirming a price before committing money to it is yours.",
    ],
  },
  {
    heading: "Accounts",
    body: [
      "You are responsible for keeping your credentials secure and for activity under your account. You can end sessions individually or everywhere from settings.",
      "We may suspend an account that is being used to attack the service or to abuse the allowances.",
    ],
  },
  {
    heading: "Plans and payment",
    body: [
      "Paid plans are billed in advance for the period you choose, in Indian rupees, through Razorpay. There is no free trial on any plan.",
      "Cancelling takes effect at the end of the period you have already paid for. You keep access until then, and we do not refund the remainder of a period.",
      "Changes to the number of seats on a Team plan take effect at the end of the current billing cycle. The payment provider does not prorate mid-cycle, and we do not represent that it does.",
      "If a payment fails, the plan continues through a short grace period while we retry. If it has not recovered by the end of that window, the account returns to the free tier and the work on it is retained.",
    ],
  },
  {
    heading: "Availability",
    body: [
      "We do not offer an uptime commitment on the self-serve plans. Where a component the product depends on is unavailable, the product is designed to return a reduced but complete answer rather than an error — for example, a result is still computed and returned when the prose layer over it cannot run.",
    ],
  },
  {
    heading: "Liability",
    body: [
      "To the extent permitted by law, StackForge is provided as is. We are not liable for decisions made on the basis of its output, for infrastructure costs incurred, or for indirect or consequential loss.",
      "Nothing here limits liability that cannot be limited by law.",
    ],
  },
];

export default function Page() {
  return (
    <Section bleed>
      <SectionHeader eyebrow="Legal" title="Terms" />
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
