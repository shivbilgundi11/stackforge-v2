"use client";

import { CheckIcon } from "lucide-react";

import {
  amountFor,
  chargedPrice,
  formatPrice,
  priceIn,
  type Interval,
  type Plan,
  type ChoosablePlanKey,
} from "@/lib/api/billing";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useDisplayCurrency } from "@/lib/currency/use-display-currency";
import { cn } from "@/lib/utils";

/**
 * The plan picker, shared by the signup form and the payment wall.
 *
 * One component for both because they are the same question asked at two
 * moments, and two copies of it drift: the wall would keep offering a plan the
 * signup form had stopped listing, at a price only one of them had updated.
 *
 * Every figure comes from `GET /billing/plans`, like the pricing table — this
 * renders the same rows in a narrower shape rather than restating them.
 *
 * Enterprise is absent by construction: the picker lists what `self_serve`
 * marks as buyable, and a plan that has to be negotiated cannot be a radio
 * button on a signup form.
 */
export function PlanChoice({
  plans,
  loading,
  value,
  onChange,
  interval,
  includeFree = true,
}: {
  plans: Plan[];
  loading?: boolean;
  value: ChoosablePlanKey;
  onChange: (next: ChoosablePlanKey) => void;
  interval: Interval;
  /** The wall drops Free from the list — declining is a separate button
   *  there, not a fourth option that reads as a purchase. */
  includeFree?: boolean;
}) {
  if (loading) {
    return (
      <div className="flex flex-col gap-2">
        {[0, 1, 2].map((key) => (
          <Skeleton key={key} className="h-[74px] rounded-md" />
        ))}
      </div>
    );
  }

  const choices = plans.filter((plan) => plan.self_serve || (includeFree && plan.key === "free"));

  return (
    <RadioGroup
      value={value}
      onValueChange={(next) => onChange(next as ChoosablePlanKey)}
      aria-label="Plan"
      className="gap-2"
    >
      {choices.map((plan) => (
        <PlanOption key={plan.key} plan={plan} interval={interval} selected={value === plan.key} />
      ))}
    </RadioGroup>
  );
}

function PlanOption({
  plan,
  interval,
  selected,
}: {
  plan: Plan;
  interval: Interval;
  selected: boolean;
}) {
  const { currency } = useDisplayCurrency();
  const price = priceIn(plan, currency);
  const charged = chargedPrice(plan);
  const cents = amountFor(price, interval);
  const chargedCents = amountFor(charged, interval);
  const free = price.monthly_minor === 0;
  const suffix = free ? "" : interval === "annual" ? "/year" : "/month";

  return (
    <label
      htmlFor={`plan-${plan.key}`}
      className={cn(
        "flex cursor-pointer items-start gap-3 rounded-md border p-3 transition-colors",
        selected
          ? "border-ember/50 bg-ember-quiet/40 ring-1 ring-ember/15"
          : "border-line bg-surface hover:border-line-strong",
      )}
    >
      {/* Named explicitly. Without it the control inherits the whole label —
          price, tagline, and highlights — and Team's first highlight is
          "Everything in Pro, per seat", so a screen reader announces the Team
          option as a sentence containing the name of a different plan. The
          detail is still read: it is the label's text, and the label is still
          the label. */}
      <RadioGroupItem
        value={plan.key}
        id={`plan-${plan.key}`}
        aria-label={plan.label}
        className="mt-0.5"
      />

      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
          <span className="text-[13.5px] font-semibold text-fg">{plan.label}</span>
          <span className="font-mono text-[12.5px] text-fg tabular-nums">
            {free ? "Free" : formatPrice(cents, price.currency)}
          </span>
          {suffix ? <span className="text-[11.5px] text-fg-subtle">{suffix}</span> : null}
          {/* The charge is in rupees whichever currency is being read, and
              this is the form where someone decides to be charged. */}
          {!price.charged && chargedCents ? (
            <span className="text-[11.5px] text-fg-subtle">
              ({formatPrice(chargedCents, charged.currency)} charged)
            </span>
          ) : null}
          {plan.per_seat && !free ? (
            <span className="text-[11.5px] text-fg-subtle">per seat</span>
          ) : null}
          {/* The trial is the reason a paid plan is pickable on a form that
              has not asked for a card yet. Saying so where the choice is made
              is worth more than saying it on the wall afterwards. */}
          {plan.trial_days > 0 ? (
            <Badge variant="secondary">{plan.trial_days}-day free trial</Badge>
          ) : null}
        </span>

        <span className="text-[12px] leading-relaxed text-fg-muted">{plan.tagline}</span>

        {/* Two lines, not the whole list. This is a decision aid on a form,
            not the comparison table — that lives on /pricing and is linked. */}
        <span className="mt-0.5 flex flex-col gap-0.5">
          {plan.highlights.slice(0, 2).map((line) => (
            <span key={line} className="flex items-start gap-1.5 text-[11.5px] text-fg-subtle">
              <CheckIcon className="mt-[3px] size-3 shrink-0 text-ember" aria-hidden />
              {line}
            </span>
          ))}
        </span>
      </span>
    </label>
  );
}

/**
 * Monthly / annual, in the compact form the signup form and the wall use.
 *
 * The pricing page has its own, wider version with the saving as a badge
 * alongside. This one carries the saving in the label instead, because at this
 * width a badge wraps onto its own line and reads as unrelated.
 */
export function IntervalChoice({
  interval,
  onChange,
  savingLabel,
}: {
  interval: Interval;
  onChange: (next: Interval) => void;
  savingLabel?: string;
}) {
  return (
    <div
      role="group"
      aria-label="Billing interval"
      className="flex items-center rounded-md border border-line bg-surface p-0.5"
    >
      {(["monthly", "annual"] as const).map((value) => (
        <button
          key={value}
          type="button"
          aria-pressed={interval === value}
          onClick={() => onChange(value)}
          className={cn(
            "flex-1 rounded-[5px] px-3 py-1 text-[12px] font-medium capitalize transition-colors",
            interval === value ? "bg-surface-3 text-fg" : "text-fg-muted hover:text-fg",
          )}
        >
          {value}
          {value === "annual" && savingLabel ? (
            // Decoration, not the control's name. Left in the accessible name
            // it reads out as "annual save $38 button", which describes an
            // offer rather than the toggle it actually is.
            <span aria-hidden className="ml-1.5 font-normal text-ember">
              {savingLabel}
            </span>
          ) : null}
        </button>
      ))}
    </div>
  );
}
