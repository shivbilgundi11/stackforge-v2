"use client";

import Link from "next/link";

import { MaskLines, Reveal, Rule, Stagger, StaggerItem } from "@/components/home/fx/type";
import { Magnetic } from "@/components/home/fx/ui";
import type { Plan } from "@/lib/api/billing";
import { localeFor } from "@/lib/currency/display-currency";
import { cn } from "@/lib/utils";

/**
 * Chapter seven: pricing.
 *
 * ## The one rule this section has
 *
 * **No price is written down in this file.** Every amount is rendered from the
 * plan catalog the checkout charges from. A typed-in price drifts silently
 * into quoting one number and charging another, and the drift is invisible
 * until a customer notices — which makes it a trust problem rather than a
 * content problem. The feature lists come from each plan's own `highlights`
 * for the same reason: one hand-written list here and another on `/pricing` is
 * two descriptions of one product, and they diverge.
 *
 * `plans` being `null` — the API unreachable at build — is a real state, not
 * an error path to ignore. The section keeps its shape and its argument, drops
 * the amounts, and says so. A remembered price would be worse than no price.
 */

const ORDER = ["free", "pro", "team"] as const;
const FEATURED = "pro";

function formatMoney(minor: number, currency: string) {
  return new Intl.NumberFormat(localeFor(currency), {
    style: "currency",
    currency: currency.toUpperCase(),
    maximumFractionDigits: 0,
  }).format(minor / 100);
}

export function Pricing({ plans }: { plans: Plan[] | null }) {
  const byKey = new Map((plans ?? []).map((plan) => [plan.key, plan]));
  const cards = ORDER.map((key) => byKey.get(key)).filter(Boolean) as Plan[];

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

        {cards.length === 0 ? (
          <Reveal className="mt-16 border-t border-[var(--h-line)] pt-10">
            <p className="t-head max-w-[26ch] text-[clamp(1.2rem,2.2vw,1.7rem)]">
              Plan prices are loading from the catalog.
            </p>
            <p className="t-body mt-4 max-w-[52ch]">
              They are rendered from the same configuration the checkout charges from, so they are
              never written down here. The pricing page has the current figures.
            </p>
            <Link href="/pricing" className="btn btn-acc mt-8">
              See the plans
            </Link>
          </Reveal>
        ) : (
          <Stagger
            step={0.09}
            className="mt-16 grid border-t border-[var(--h-line)] lg:grid-cols-3"
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
                    {featured ? (
                      <span className="t-mono text-[var(--h-acc)]">Most popular</span>
                    ) : null}
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
                    {plan.highlights.slice(0, 6).map((item) => (
                      <li key={item} className="flex gap-3 text-[14px] text-[var(--h-fg-70)]">
                        <span
                          aria-hidden
                          className="mt-2 size-1 shrink-0 rounded-full bg-[var(--h-acc)]"
                        />
                        {item}
                      </li>
                    ))}
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
        )}

        <Reveal delay={0.1} className="mt-10">
          <p className="t-mono text-[var(--h-fg-45)]">
            Prices render from the same configuration the checkout charges from
          </p>
        </Reveal>
      </div>
    </section>
  );
}
