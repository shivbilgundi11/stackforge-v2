"use client";

import Link from "next/link";

import { Reveal, Stagger, StaggerItem } from "@/components/home/fx/type";
import { Magnetic } from "@/components/home/fx/ui";
import type { Plan } from "@/lib/api/billing";
import { localeFor } from "@/lib/currency/display-currency";
import { PLAN_OUTLINES, type PlanOutline } from "@/lib/marketing/plans";
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
 * ## A missing catalog withholds the amounts, not the plans
 *
 * `plans` being `null` — the API unreachable at build — used to replace the
 * entire grid with a line saying prices were loading. That read as an outage
 * on the page whose job is to name the tiers, and it threw away four feature
 * lists to protect two numbers.
 *
 * It now falls back to `PLAN_OUTLINES`: the same tiers, taglines, highlights
 * and calls to action, with every charged amount replaced by an explicit
 * "price unavailable" rather than a remembered figure. The rule is unchanged —
 * a price is never guessed at — but it is enforced on the price instead of on
 * the page. See `lib/marketing/plans.ts` for why the structure is safe to
 * mirror when an amount is not.
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

/**
 * One card's worth of content, from either source.
 *
 * The two sources agree on everything except the amount, so normalising to
 * this up front is what keeps a single card renderer below — and it is why
 * `amount` is a formatted string or nothing. A card never sees minor units,
 * so it cannot format a price a second way.
 */
type Card = {
  key: string;
  label: string;
  tagline: string;
  highlights: string[];
  cta: string;
  href: string;
  /** Formatted, or `null` when there is no figure to show. */
  amount: string | null;
  /** The line under the amount: "Forever", "Per seat / month", "Custom"… */
  cadence: string;
  /** True when an amount exists but could not be read. Styles the card. */
  withheld: boolean;
};

function fromPlan(plan: Plan): Card {
  const minor = plan.monthly_minor;
  const amount = minor === null ? null : formatMoney(minor, plan.currency);

  return {
    key: plan.key,
    label: plan.label,
    tagline: plan.tagline,
    highlights: plan.highlights,
    cta: plan.cta,
    // Not `plan.self_serve`: that mirrors the backend's `checkout` flag, which
    // is false for Free because there is nothing to charge — so keying the
    // link on it sent someone clicking "Get started" on the free tier to the
    // contact page. A plan with no price is a conversation; a plan with one,
    // including zero, is a sign-up.
    href: minor === null ? "/contact" : "/signup",
    amount,
    cadence:
      minor === 0
        ? "Forever"
        : amount
          ? plan.per_seat
            ? "Per seat / month"
            : "Per month"
          : "Custom",
    withheld: false,
  };
}

function fromOutline(outline: PlanOutline): Card {
  const custom = outline.price === "custom";

  return {
    key: outline.key,
    label: outline.label,
    tagline: outline.tagline,
    highlights: outline.highlights,
    cta: outline.cta,
    href: custom ? "/contact" : "/signup",
    // "Free" is a word, not a quote — nothing is charged, so there is no
    // figure the checkout could contradict. Every other tier gets nothing.
    amount: outline.price === "free" ? "Free" : null,
    cadence: outline.price === "free" ? "Forever" : custom ? "Custom" : "Price unavailable",
    withheld: outline.price === "charged",
  };
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
  const configured = orderPlans(plans);
  const cards: Card[] =
    configured.length > 0 ? configured.map(fromPlan) : PLAN_OUTLINES.map(fromOutline);
  const withheld = cards.some((card) => card.withheld);

  return (
    <>
      <Stagger
        step={0.09}
        className={cn(
          "grid border-t border-[var(--h-line)]",
          cards.length >= 4 ? "lg:grid-cols-4" : "lg:grid-cols-3",
          className,
        )}
      >
        {cards.map((card) => {
          const featured = card.key === FEATURED;

          return (
            <StaggerItem
              key={card.key}
              className={cn(
                "flex flex-col border-b border-[var(--h-line)] px-0 py-9 lg:border-r lg:border-b-0 lg:px-8 lg:last:border-r-0",
                featured && "lg:bg-[var(--h-panel)]",
              )}
            >
              <div className="flex items-baseline justify-between gap-4">
                <h3 className="t-mono">{card.label}</h3>
                {featured ? <span className="t-mono text-[var(--h-acc)]">Most popular</span> : null}
              </div>

              {/* The amount sits in a fixed block, bottom-aligned, so the four
                  cards keep one baseline whatever is in it. Without it a
                  withheld card — whose mark is deliberately smaller than a
                  price — pulls its own tagline and feature list up, and the
                  row stops reading as a comparison. */}
              <div className="mt-7 flex min-h-[clamp(3.1rem,6.8vw,5rem)] items-end">
                <p
                  className={cn(
                    "t-display text-[clamp(2.6rem,6vw,4.2rem)]",
                    // An em dash at display size would read as a price of
                    // nothing. Dropping it to the body scale says "not a
                    // number" before the line underneath has to explain it.
                    card.withheld && "text-[clamp(1.6rem,3vw,2.2rem)] text-[var(--h-fg-45)]",
                  )}
                >
                  {card.amount ?? (card.withheld ? "—" : "Talk to us")}
                </p>
              </div>
              <p className="t-mono mt-3 text-[9px] text-[var(--h-fg-45)]">{card.cadence}</p>

              <p className="t-body mt-5 text-[14px]">{card.tagline}</p>

              <ul className="mt-8 flex flex-1 flex-col gap-3 border-t border-[var(--h-line)] pt-7">
                {(maxHighlights ? card.highlights.slice(0, maxHighlights) : card.highlights).map(
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
                  href={card.href}
                  data-cursor={card.href === "/signup" ? "Start" : "Contact"}
                  className={cn("btn", featured && "btn-acc")}
                >
                  {card.cta}
                </Link>
              </Magnetic>
            </StaggerItem>
          );
        })}
      </Stagger>

      {/* The footnote lives here rather than at each call site, because it is
          a claim about what the grid just rendered — and during an outage the
          usual line ("prices render from the configuration the checkout
          charges from") would be printed under a grid showing no prices. */}
      <Reveal delay={0.1} className="mt-10">
        <p className="t-mono text-[var(--h-fg-45)]">
          {withheld
            ? "Prices are temporarily unavailable — the current amount is always shown at checkout"
            : "Prices render from the same configuration the checkout charges from"}
        </p>
      </Reveal>
    </>
  );
}
