"use client";

import Link from "next/link";

import { Reveal, Stagger, StaggerItem } from "@/components/home/fx/type";
import { Magnetic } from "@/components/home/fx/ui";
import type { Plan } from "@/lib/api/billing";
import { localeFor } from "@/lib/currency/display-currency";
import { cn } from "@/lib/utils";

/**
 * The plan cards, shared by the home page's price chapter and `/pricing`.
 *
 * ## The one rule
 *
 * **No price is written down in this file.** Every amount renders from the
 * plan catalog the checkout charges from. A typed-in price drifts silently
 * into quoting one number and charging another, and the drift is invisible
 * until a customer notices — which makes it a trust problem rather than a
 * content problem. The feature lists come from each plan's own `highlights`
 * for the same reason: one hand-written list here and another on `/pricing`
 * would be two descriptions of one product, and they diverge.
 *
 * That argument is also why this is one component and not two. The home page
 * and `/pricing` used to be a card grid and a separate table; keeping them as
 * one grid rendered twice means there is no second place for a price to live.
 *
 * ## Every configured plan is rendered
 *
 * The order below is a *preference*, not a filter. Anything the API returns
 * that is not named in it still renders, after the ones that are. Filtering to
 * a known list is the obvious version and it is a trap: a plan added to the
 * billing configuration would be charged by the checkout and never shown, and
 * nothing would fail until someone noticed the page was missing a tier.
 * `e2e/marketing.spec.ts` asserts every configured plan appears here.
 *
 * ## A missing catalog is a state, not an error
 *
 * `plans` being `null` — the API unreachable at build — keeps the section's
 * shape and its argument, drops the amounts, and says so. A remembered price
 * would be worse than no price.
 */

const PREFERRED = ["free", "pro", "team"];
const FEATURED = "pro";

function formatMoney(minor: number, currency: string) {
  return new Intl.NumberFormat(localeFor(currency), {
    style: "currency",
    currency: currency.toUpperCase(),
    maximumFractionDigits: 0,
  }).format(minor / 100);
}

/** Preferred tiers first, in order; anything else after, in the API's order. */
export function orderPlans(plans: Plan[] | null): Plan[] {
  const rank = (key: string) => {
    const index = PREFERRED.indexOf(key);
    return index === -1 ? PREFERRED.length : index;
  };
  return [...(plans ?? [])].sort((a, b) => rank(a.key) - rank(b.key));
}

export function PlanCards({
  plans,
  maxHighlights,
  className,
}: {
  plans: Plan[] | null;
  /**
   * Caps the feature list per card. The home page passes one because its price
   * chapter is a summary that links here; `/pricing` passes nothing, because a
   * pricing page that hides what a plan includes is the wrong pricing page.
   */
  maxHighlights?: number;
  className?: string;
}) {
  const cards = orderPlans(plans);

  if (cards.length === 0) {
    return (
      <Reveal className={cn("border-t border-[var(--h-line)] pt-10", className)}>
        <p className="t-head max-w-[26ch] text-[clamp(1.2rem,2.2vw,1.7rem)]">
          Plan prices are loading from the catalog.
        </p>
        <p className="t-body mt-4 max-w-[52ch]">
          They render from the same configuration the checkout charges from, so they are never
          written down here. Try again in a moment.
        </p>
        <Link href="/signup" className="btn btn-acc mt-8">
          Start on the free tier
        </Link>
      </Reveal>
    );
  }

  return (
    <Stagger
      step={0.09}
      className={cn(
        "grid border-t border-[var(--h-line)]",
        cards.length >= 4 ? "lg:grid-cols-4" : "lg:grid-cols-3",
        className,
      )}
    >
      {cards.map((plan) => {
        const featured = plan.key === FEATURED;
        const minor = plan.monthly_minor;
        const amount = minor === null ? null : formatMoney(minor, plan.currency);

        return (
          <StaggerItem
            key={plan.key}
            className={cn(
              "flex flex-col border-b border-[var(--h-line)] px-0 py-9 lg:border-r lg:border-b-0 lg:px-8 lg:last:border-r-0",
              featured && "lg:bg-[var(--h-panel)]",
            )}
          >
            <div className="flex items-baseline justify-between gap-4">
              <h3 className="t-mono">{plan.label}</h3>
              {featured ? <span className="t-mono text-[var(--h-acc)]">Most popular</span> : null}
            </div>

            <p className="t-display mt-7 text-[clamp(2.6rem,6vw,4.2rem)]">
              {amount ?? "Talk to us"}
            </p>
            <p className="t-mono mt-3 text-[9px] text-[var(--h-fg-45)]">
              {minor === 0
                ? "Forever"
                : amount
                  ? plan.per_seat
                    ? "Per seat / month"
                    : "Per month"
                  : "Custom"}
            </p>

            <p className="t-body mt-5 text-[14px]">{plan.tagline}</p>

            <ul className="mt-8 flex flex-1 flex-col gap-3 border-t border-[var(--h-line)] pt-7">
              {(maxHighlights ? plan.highlights.slice(0, maxHighlights) : plan.highlights).map(
                (item) => (
                  <li key={item} className="flex gap-3 text-[14px] text-[var(--h-fg-70)]">
                    <span
                      aria-hidden
                      className="mt-2 size-1 shrink-0 rounded-full bg-[var(--h-acc)]"
                    />
                    {item}
                  </li>
                ),
              )}
            </ul>

            <Magnetic strength={9} className="mt-9 self-start">
              <Link
                href={plan.self_serve ? "/signup" : "/contact"}
                data-cursor={plan.self_serve ? "Start" : "Contact"}
                className={cn("btn", featured && "btn-acc")}
              >
                {plan.cta}
              </Link>
            </Magnetic>
          </StaggerItem>
        );
      })}
    </Stagger>
  );
}
