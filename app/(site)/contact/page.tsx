import { Fragment } from "react";
import type { Metadata } from "next";
import Link from "next/link";

import { Reveal, Stagger, StaggerItem } from "@/components/home/fx/type";
import { Magnetic } from "@/components/home/fx/ui";
import { Section, SectionHead } from "@/components/home/sections/head";
import { PageHead } from "@/components/home/sections/page-head";

/**
 * Contact.
 *
 * ## Why there is still no form here
 *
 * A contact form needs somewhere to deliver. There is no contact endpoint on
 * the API, and `EMAIL_FROM` is still the `noreply@localhost` placeholder — so
 * a form on this page would collect messages and drop them. That is the same
 * failure as a nav item pointing at a redirect, in a costume: it looks like
 * the product does something it does not.
 *
 * Shipping one needs two things this build cannot invent — a real support
 * address, and `POST /api/v1/contact` to deliver to it. Until both exist, the
 * page routes people to the things that genuinely work, and says so rather
 * than leaving the absence to be discovered.
 *
 * ## The placeholder details are the reason this page is thin
 *
 * `hello@buildtact.ai` and the phone number below came from the previous build
 * and neither has been confirmed as monitored. They are rendered because
 * removing them would leave a contact page with no way to make contact, but
 * they are the first thing to check before launch — a published address that
 * nobody reads is worse than the form this page refuses to ship.
 */

export const metadata: Metadata = {
  title: "Contact",
  description: "How to reach the Buildtact team, and the fastest routes to an answer.",
  alternates: { canonical: "/contact" },
};

const ROUTES = [
  {
    n: "01",
    title: "Something in the catalog is wrong or missing",
    body: "Every catalog page in the product has a flag control on the row itself. It carries the row and the value you are disputing, which is faster than describing it to us and much easier for us to act on.",
    href: "/signup",
    cta: "Open Buildtact",
  },
  {
    n: "02",
    title: "You want to know what a plan includes",
    body: "The pricing page renders from the same configuration the checkout charges from, and the FAQ covers what happens to your work on each tier.",
    href: "/pricing",
    cta: "See pricing",
  },
  {
    n: "03",
    title: "You are evaluating it for a team",
    body: "The Team plan adds a shared workspace with roles, comments, and approvals. Start on Pro and move up — seats change at the end of the billing cycle.",
    href: "/pricing",
    cta: "Compare the plans",
  },
];

export default function Page() {
  return (
    <>
      <PageHead
        eyebrow="Contact"
        // Matched by `e2e/marketing.spec.ts` against /Get in touch/.
        title={[
          <Fragment key="last">
            Get in touch<span className="text-[var(--h-acc)]">.</span>
          </Fragment>,
        ]}
        lede="A contact form is not live yet. Rather than put one here that quietly goes nowhere, these are the routes that reach us — or answer the question directly."
      />

      {/* ── Direct ────────────────────────────────────────────────────────── */}
      <Section chapter="ink">
        <div className="grid gap-10 md:grid-cols-2 lg:gap-16">
          <Reveal>
            <p className="t-mono text-[var(--h-fg-45)]">Email</p>
            <a
              href="mailto:hello@buildtact.ai"
              data-cursor="Write"
              className="t-head u-link mt-5 block text-[clamp(1.5rem,3.4vw,2.6rem)]"
            >
              hello@buildtact.ai
            </a>
          </Reveal>

          <Reveal delay={0.08}>
            <p className="t-mono text-[var(--h-fg-45)]">Phone</p>
            <a
              href="tel:+910000000000"
              data-cursor="Call"
              className="t-head u-link mt-5 block text-[clamp(1.5rem,3.4vw,2.6rem)]"
            >
              +91 00000 00000
            </a>
          </Reveal>
        </div>
      </Section>

      {/* ── Faster routes ─────────────────────────────────────────────────── */}
      <Section>
        <SectionHead
          index="02"
          label="Faster routes"
          title={["Some of these", "answer it without", "waiting on us."]}
        />

        <Stagger step={0.07} className="mt-14 border-t border-[var(--h-line)]">
          {ROUTES.map((route) => (
            <StaggerItem key={route.n} className="group border-b border-[var(--h-line)] py-8">
              <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)_auto] lg:items-start lg:gap-12">
                <h3 className="t-head flex gap-6 text-[clamp(1.1rem,2vw,1.5rem)]">
                  <span className="t-mono shrink-0 pt-1.5 text-[var(--h-fg-45)] transition-colors duration-300 group-hover:text-[var(--h-acc)]">
                    {route.n}
                  </span>
                  <span className="max-w-[22ch]">{route.title}</span>
                </h3>

                <p className="t-body max-w-[54ch]">{route.body}</p>

                <Magnetic strength={9} className="lg:pt-1">
                  <Link
                    href={route.href}
                    data-cursor="Open"
                    className="u-link t-mono whitespace-nowrap text-[var(--h-acc)]"
                  >
                    {route.cta} →
                  </Link>
                </Magnetic>
              </div>
            </StaggerItem>
          ))}
        </Stagger>
      </Section>

      {/* ── Security ──────────────────────────────────────────────────────── */}
      <Section chapter="ink">
        <SectionHead index="03" label="Security" title={["Reporting", "something urgent."]} />

        <Reveal className="mt-12 lg:pl-[calc(14rem+4rem)]">
          <p className="t-body max-w-[62ch]">
            If you have found a security issue, please do not open it anywhere public. A dedicated
            disclosure address is being set up; until it is published here, hold the details and we
            will provide a channel on request.
          </p>
        </Reveal>
      </Section>
    </>
  );
}
