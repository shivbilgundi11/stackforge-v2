import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRightIcon } from "lucide-react";

import { Section, SectionHeader } from "@/components/marketing/section";

/**
 * Contact (M22).
 *
 * ## Why there is no form here yet
 *
 * A contact form needs somewhere to deliver. There is no contact endpoint on
 * the API, and `EMAIL_FROM` is still the `noreply@localhost` placeholder — so
 * a form on this page would collect messages and drop them. That is the same
 * failure as a nav item pointing at a redirect, in a costume: it looks like
 * the product does something it does not.
 *
 * Shipping it needs two things this build cannot invent — a real support
 * address, and `POST /api/v1/contact` to deliver to it. Until both exist, the
 * page routes people to the things that genuinely work.
 */

export const metadata: Metadata = {
  title: "Contact",
  description: "How to reach the StackForge team, and the fastest routes to an answer.",
  alternates: { canonical: "/contact" },
};

const ROUTES = [
  {
    title: "Something in the catalog is wrong or missing",
    body: "Every catalog page in the product has a flag control on the row itself. It carries the row and the value you are disputing, which is faster than describing it to us and much easier for us to act on.",
    href: "/signup",
    cta: "Open StackForge",
  },
  {
    title: "You want to know what a plan includes",
    body: "The pricing page renders from the same configuration the checkout charges from, and the FAQ covers what happens to your work on each tier.",
    href: "/pricing",
    cta: "See pricing",
  },
  {
    title: "You are evaluating it for a team",
    body: "The Team plan adds a shared workspace with roles, comments, and approvals. Start on Pro and move up — seats change at the end of the billing cycle.",
    href: "/pricing",
    cta: "Compare the plans",
  },
];

export default function Page() {
  return (
    <>
      <Section bleed>
        <SectionHeader
          eyebrow="Contact"
          title="Get in touch."
          lede="A contact form is not live yet — rather than put one here that quietly goes nowhere, these are the routes that reach us or answer the question directly."
        />
      </Section>

      <Section>
        <div className="grid gap-5 md:grid-cols-3">
          {ROUTES.map((route) => (
            <div
              key={route.title}
              className="flex flex-col rounded-[var(--radius)] border border-line bg-surface p-5"
            >
              <h2 className="text-[14.5px] font-semibold text-balance text-fg">{route.title}</h2>
              <p className="mt-2 flex-1 text-[13.5px] leading-relaxed text-fg-muted">
                {route.body}
              </p>
              <Link
                href={route.href}
                className="mt-4 inline-flex items-center gap-1 text-[13px] text-ember hover:underline"
              >
                {route.cta}
                <ArrowRightIcon className="size-3.5" />
              </Link>
            </div>
          ))}
        </div>

        <div className="mt-10 rounded-[var(--radius)] border border-line bg-surface-2 p-5">
          <h2 className="text-[14px] font-semibold text-fg">Reporting something urgent</h2>
          <p className="mt-2 max-w-[70ch] text-[13.5px] leading-relaxed text-fg-muted">
            If you have found a security issue, please do not open it anywhere public. A dedicated
            disclosure address is being set up; until it is published here, hold the details and we
            will provide a channel on request.
          </p>
        </div>
      </Section>
    </>
  );
}
