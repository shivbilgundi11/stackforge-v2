import Link from "next/link";
import { CheckIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { Plan } from "@/lib/api/billing";
import { localeFor } from "@/lib/currency/display-currency";
import { cn } from "@/lib/utils";

/**
 * The three plans, on the home page.
 *
 * ## Why this renders from the API and not from three constants
 *
 * Because the design it is built from shows "$0 / $29 / $99", and typing
 * those into a component is exactly the failure `lib/marketing/data.ts` calls
 * out: a hand-maintained price drifts from the billing configuration, and the
 * drift is invisible until a customer is quoted one number and charged
 * another. The plan catalog is the same one the checkout charges from, so
 * rendering from it means this card cannot advertise an amount that will not
 * be taken.
 *
 * `plans` being `null` — the API unreachable at build — is a real state, not
 * an error path to ignore. The section keeps its shape and its features, drops
 * the amounts, and says so. A remembered price would be worse than no price.
 *
 * Feature lists come from each plan's own `highlights`, for the same reason:
 * one hand-written list here and another on `/pricing` is two descriptions of
 * one product, and they diverge.
 */

const TEASER_KEYS = ["free", "pro", "team"] as const;
const FEATURED = "pro";

function priceLabel(plan: Plan) {
  const minor = plan.monthly_minor;
  if (minor === null) return null;
  if (minor === 0) return { amount: formatMoney(0, plan.currency), unit: "forever" };
  return {
    amount: formatMoney(minor, plan.currency),
    unit: plan.per_seat ? "/ month" : "/ month",
  };
}

function formatMoney(minor: number, currency: string) {
  return new Intl.NumberFormat(localeFor(currency), {
    style: "currency",
    currency: currency.toUpperCase(),
    maximumFractionDigits: 0,
  }).format(minor / 100);
}

export function PricingTeaser({ plans }: { plans: Plan[] | null }) {
  const byKey = new Map((plans ?? []).map((plan) => [plan.key, plan]));
  const cards = TEASER_KEYS.map((key) => byKey.get(key)).filter(Boolean) as Plan[];

  // Nothing to show rather than something invented. The section's copy and its
  // link to /pricing still carry the point; only the amounts are missing.
  if (cards.length === 0) {
    return (
      <div className="rounded-lg border border-line bg-surface-2 px-6 py-10 text-center">
        <p className="text-[14px] font-medium text-fg">Plan prices are loading from the catalog.</p>
        <p className="mx-auto mt-2 max-w-[46ch] text-[13px] leading-relaxed text-fg-muted">
          They are rendered from the same configuration the checkout charges from, so they are never
          written down here. The pricing page has the current figures.
        </p>
        <Button asChild size="lg" className="mt-6 h-10 bg-ember text-ember-fg hover:bg-ember-hover">
          <Link href="/pricing">See the plans</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {cards.map((plan) => {
        const featured = plan.key === FEATURED;
        const price = priceLabel(plan);

        return (
          <div
            key={plan.key}
            data-tone={featured ? "ember" : "neutral"}
            className={cn(
              "relative flex flex-col rounded-lg border p-6",
              featured
                ? "tone-wash border-ember-line shadow-[var(--shadow-panel)] lg:-my-2 lg:py-8"
                : "border-line bg-surface",
            )}
          >
            {featured ? (
              <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 rounded-full bg-ember px-2.5 py-1 text-[10.5px] font-semibold text-ember-fg">
                Most popular
              </span>
            ) : null}

            <h3 className="text-[19px] font-semibold tracking-[-0.01em] text-fg">{plan.label}</h3>
            <p className="mt-1 text-[13px] text-fg-muted">{plan.tagline}</p>

            <div className="mt-5 flex items-baseline gap-2">
              {price ? (
                <>
                  <span className="font-serif text-[2.4rem] leading-none tracking-[-0.02em] text-fg tabular-nums">
                    {price.amount}
                  </span>
                  <span className="text-[13px] text-fg-muted">{price.unit}</span>
                </>
              ) : (
                <span className="text-[15px] font-medium text-fg">Talk to us</span>
              )}
            </div>
            {plan.per_seat && price ? (
              <p className="mt-1 text-[12px] text-fg-subtle">per seat</p>
            ) : null}

            {/* `flex-1` rather than a fixed height: the three plans have
                different numbers of highlights, and the buttons still have to
                land on one line across the row. */}
            <ul className="mt-6 flex flex-1 flex-col gap-2.5 border-t border-line pt-6">
              {plan.highlights.slice(0, 6).map((item) => (
                <li key={item} className="flex items-start gap-2.5 text-[13px] leading-snug">
                  <CheckIcon
                    className={cn(
                      "mt-0.5 size-3.5 shrink-0",
                      featured ? "text-ember" : "text-fg-subtle",
                    )}
                    strokeWidth={3}
                    aria-hidden
                  />
                  <span className="text-fg-muted">{item}</span>
                </li>
              ))}
            </ul>

            <Button
              asChild
              size="lg"
              variant={featured ? "default" : "outline"}
              className={cn(
                "mt-7 h-10 w-full",
                featured && "bg-ember text-ember-fg shadow-none hover:bg-ember-hover",
              )}
            >
              <Link href={plan.self_serve ? "/signup" : "/contact"}>{plan.cta}</Link>
            </Button>
          </div>
        );
      })}
    </div>
  );
}
