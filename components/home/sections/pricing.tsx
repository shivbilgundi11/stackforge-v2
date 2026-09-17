"use client";

import { MaskLines, Reveal, Rule } from "@/components/home/fx/type";
import { PlanCards } from "@/components/home/sections/plan-cards";
import type { Plan } from "@/lib/api/billing";

/**
 * Chapter seven: pricing.
 *
 * A summary, not the pricing page. The cards themselves are `PlanCards`, which
 * `/pricing` renders too — see that file for why no price is ever written down
 * in either of them, and why every configured plan is shown rather than a
 * known list. This chapter adds the argument around them and caps each card's
 * feature list, because a reader here is deciding whether to keep reading, not
 * comparing tiers line by line.
 */

export function Pricing({ plans }: { plans: Plan[] | null }) {
  return (
    <section id="pricing" data-chapter="ink" className="grain-layer relative">
      <div className="mx-auto w-full max-w-[110rem] px-5 py-20 sm:px-8 sm:py-26">
        <Rule />
        <div className="grid gap-8 pt-7 lg:grid-cols-[minmax(0,14rem)_minmax(0,1fr)] lg:gap-16">
          <Reveal from="none" duration={0.6}>
            <p className="t-mono flex items-baseline gap-3 text-[var(--h-fg-45)]">
              <span className="text-[var(--h-acc)]">07</span>
              The price
            </p>
          </Reveal>

          <div>
            <MaskLines
              as="h2"
              lines={["Free users get", "real answers."]}
              className="t-head max-w-[16ch] text-[clamp(2rem,5.6vw,4.4rem)]"
            />
            <Reveal delay={0.2}>
              <p className="t-body mt-7 max-w-[54ch]">
                The paid tiers are for keeping the work and taking it out of the app — not for
                gating the tools. Every calculator is open to everyone, on every plan.
              </p>
            </Reveal>
          </div>
        </div>

        <PlanCards plans={plans} maxHighlights={6} className="mt-16" />

        <Reveal delay={0.1} className="mt-10">
          <p className="t-mono text-[var(--h-fg-45)]">
            Prices render from the same configuration the checkout charges from
          </p>
        </Reveal>
      </div>
    </section>
  );
}
