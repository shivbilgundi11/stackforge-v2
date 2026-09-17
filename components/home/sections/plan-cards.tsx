"use client";

import Link from "next/link";

import { Reveal, Stagger, StaggerItem } from "@/components/home/fx/type";
import { Magnetic } from "@/components/home/fx/ui";
import type { Plan } from "@/lib/api/billing";
import { localeFor } from "@/lib/currency/display-currency";
import { PLAN_CURRENCY, PLAN_OUTLINES } from "@/lib/marketing/plans";
import { cn } from "@/lib/utils";

/**
 * The plan cards, shared by the home page's price chapter and `/pricing`.
 *
 * ## The one rule
 *
 * **No amount this component renders may disagree with what the checkout
 * charges.** A price that drifts from the billing configuration quotes one
 * number and charges another, the drift is invisible until a customer
 * notices, and it is a trust problem rather than a content problem.
 *
 * Every figure therefore comes from the plan catalog: live from
 * `GET /billing/plans`, or from the snapshot in `lib/marketing/plans.ts` that
 * `npm run plans:check` diffs against `backend/app/data/plans.py` on every
 * run. Nothing is typed into this file, and nothing anywhere can drift
 * without failing the build. The feature lists ride along for the same
 * reason: one hand-written list here and another on `/pricing` would be two
 * descriptions of one product, and they diverge.
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
 * ## A missing catalog falls back to the snapshot, not to an empty page
 *
 * `plans` being `null` — the API unreachable at build — used to replace the
 * entire grid with a line saying prices were loading. That read as an outage
 * on the page whose job is to name the tiers and what they cost.
 *
 * It now falls back to `PLAN_OUTLINES`, which is the same plan configuration
 * the API would have served, snapshotted and checked against the backend on
 * every `npm run check`. That keeps the rule at the top of this file intact:
 * the amount still cannot disagree with the checkout, because CI fails if the
 * two ever differ. See `lib/marketing/plans.ts`.
 *
 * Both sources carry identical fields, so they normalise to one `Card` and
 * render through one path — a fallback that rendered differently from the
 * live page would be a second layout to keep correct, and the difference
 * would show up exactly when nobody was looking.
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
 * `amount` is a formatted string or nothing: a card never sees minor units, so
 * it cannot format a price a second way than `toCard` did.
 */
type Card = {
  key: string;
  label: string;
  tagline: string;
  highlights: string[];
  cta: string;
  href: string;
  /** Formatted, or `null` for a tier with no list price. */
  amount: string | null;
  /** The line under the amount: "Forever", "Per seat / month", "Custom". */
  cadence: string;
};

/**
 * The fields the API's plan and the snapshot both carry, which is all of the
 * ones a card renders. Typing the argument structurally rather than as
 * `Plan | PlanOutline` is what makes the snapshot fail to compile if it drops
 * a field the live plan has.
 */
type Priced = Pick<Plan, "key" | "label" | "tagline" | "monthly_minor" | "per_seat" | "cta"> & {
  highlights: readonly string[];
};

function toCard(source: Priced, currency: string): Card {
  const minor = source.monthly_minor;
  const amount = minor === null ? null : formatMoney(minor, currency);

  return {
    key: source.key,
    label: source.label,
    tagline: source.tagline,
    highlights: [...source.highlights],
    cta: source.cta,
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
          ? source.per_seat
            ? "Per seat / month"
            : "Per month"
          : "Custom",
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
  //: True when the catalog could not be read and these amounts came from the
  //: snapshot. It changes one line of copy under the grid and nothing else —
  //: the cards are identical either way, because the two sources are.
  const snapshot = configured.length === 0;
  const cards: Card[] = snapshot
    ? PLAN_OUTLINES.map((outline) => toCard(outline, PLAN_CURRENCY))
    : configured.map((plan) => toCard(plan, plan.currency));

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

              {/* Bottom-aligned in a fixed block so the four cards keep one
                  baseline, and a tier with no amount is set smaller so that it
                  keeps it. "Talk to us" is ten characters where the others are
                  four, and at the price scale it wraps to a second line in a
                  quarter-width column — which pushed the Enterprise card's
                  cadence, tagline and features below everyone else's and broke
                  the row as a comparison. It is not a number, so it does not
                  need a number's weight. */}
              <div className="mt-7 flex min-h-[clamp(3.1rem,6.8vw,5rem)] items-end">
                <p
                  className={cn(
                    "t-display",
                    card.amount
                      ? "text-[clamp(2.6rem,6vw,4.2rem)]"
                      : "text-[clamp(1.7rem,3.2vw,2.6rem)]",
                  )}
                >
                  {card.amount ?? "Talk to us"}
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
          a claim about where the amounts above came from — and only this
          component knows. Both sentences are true of the snapshot, but the
          first is the stronger claim and it is only earned when the figure was
          read live, so the fallback makes the weaker one. */}
      <Reveal delay={0.1} className="mt-10">
        <p className="t-mono text-[var(--h-fg-45)]">
          {snapshot
            ? "Prices are checked against the configuration the checkout charges from on every build"
            : "Prices render from the same configuration the checkout charges from"}
        </p>
      </Reveal>
    </>
  );
}
