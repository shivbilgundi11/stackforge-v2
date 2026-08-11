"use client";

import { useMutation } from "@tanstack/react-query";
import { ArrowRightIcon, CheckIcon, MinusIcon } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import toast from "react-hot-toast";

import { PageHeader } from "@/components/forge/page-header";
import { Panel, PanelBody } from "@/components/forge/panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  createCheckoutSession,
  formatLimit,
  formatPrice,
  type Interval,
  type Plan,
  type PlanKey,
} from "@/lib/api/billing";
import { usePlans } from "@/lib/api/hooks";
import { useAuth } from "@/lib/auth/auth-provider";
import { cn } from "@/lib/utils";

/**
 * The pricing page (M20).
 *
 * Every number on it comes from `GET /billing/plans`, including the limits —
 * which are read from the backend's `plan_quotas` table rather than from copy
 * kept alongside the layout. A marketing page with its own numbers drifts from
 * the enforcement, and the drift is invisible until a user hits a wall the page
 * said was not there.
 *
 * Locked features are listed, not hidden. Consistent with M18: a gate has to be
 * seen to convert, and a comparison table that omits what you do not get is not
 * a comparison.
 */
export function PricingTable() {
  const { status } = useAuth();
  const plans = usePlans();
  const [interval, setInterval] = useState<Interval>("monthly");

  const checkout = useMutation({
    mutationFn: (plan: PlanKey) => createCheckoutSession({ plan, interval }),
    onSuccess: ({ url }) => {
      window.location.href = url;
    },
    onError: () => toast.error("Could not start checkout. Try again in a moment."),
  });

  const rows = plans.data ?? [];
  const saving = rows.find((plan) => plan.annual_saving_cents > 0);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col">
      <PageHeader
        title="Pricing"
        description="Every tool is free to use. Paying is for keeping the work, exporting it in a format you can send someone, and being told when the numbers move."
        actions={
          <IntervalToggle
            interval={interval}
            onChange={setInterval}
            savingLabel={
              saving
                ? `Save ${formatPrice(saving.annual_saving_cents, saving.currency)}`
                : undefined
            }
          />
        }
      />

      {plans.isLoading ? (
        <div className="grid gap-4 lg:grid-cols-4">
          {[0, 1, 2, 3].map((key) => (
            <Skeleton key={key} className="h-96 rounded-md" />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-4">
          {rows.map((plan) => (
            <PlanColumn
              key={plan.key}
              plan={plan}
              interval={interval}
              authenticated={status === "authenticated"}
              pending={checkout.isPending}
              onBuy={() => checkout.mutate(plan.key as PlanKey)}
            />
          ))}
        </div>
      )}

      {rows.length > 0 ? <ComparisonTable plans={rows} /> : null}

      <p className="mt-6 text-center text-[12.5px] text-fg-subtle">
        Nothing is ever deleted when a plan ends. Your projects, stacks, and runs stay where they
        are — you can read and export them, and creating a new one is what waits for an upgrade.
      </p>
    </div>
  );
}

function IntervalToggle({
  interval,
  onChange,
  savingLabel,
}: {
  interval: Interval;
  onChange: (next: Interval) => void;
  savingLabel?: string;
}) {
  return (
    <div className="flex items-center gap-2">
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
              "rounded-[5px] px-3 py-1 text-[12.5px] font-medium capitalize transition-colors",
              interval === value ? "bg-surface-3 text-fg" : "text-fg-muted hover:text-fg",
            )}
          >
            {value}
          </button>
        ))}
      </div>
      {savingLabel && interval === "annual" ? (
        <Badge variant="secondary">{savingLabel} a year</Badge>
      ) : null}
    </div>
  );
}

function PlanColumn({
  plan,
  interval,
  authenticated,
  pending,
  onBuy,
}: {
  plan: Plan;
  interval: Interval;
  authenticated: boolean;
  pending: boolean;
  onBuy: () => void;
}) {
  const cents = interval === "annual" ? plan.annual_cents : plan.monthly_cents;
  const suffix = plan.monthly_cents === null ? "" : interval === "annual" ? "/year" : "/month";
  const featured = plan.key === "pro";

  return (
    <Panel
      className={cn(
        "flex flex-col",
        featured && "border-ember/40 ring-1 ring-ember/15",
        plan.current && "border-line",
      )}
    >
      <PanelBody className="flex flex-1 flex-col gap-4">
        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-[15px] font-semibold text-fg">{plan.label}</h2>
            {plan.current ? (
              <Badge variant="secondary">Current</Badge>
            ) : featured ? (
              <Badge>Most picked</Badge>
            ) : null}
          </div>
          <p className="text-[12.5px] leading-relaxed text-fg-muted">{plan.tagline}</p>
        </div>

        <div className="flex items-baseline gap-1">
          <span className="font-serif text-[28px] leading-none text-fg">
            {formatPrice(cents, plan.currency)}
          </span>
          {suffix ? <span className="text-[12.5px] text-fg-subtle">{suffix}</span> : null}
          {plan.per_seat && plan.monthly_cents !== null ? (
            <span className="text-[12.5px] text-fg-subtle">per seat</span>
          ) : null}
        </div>

        <PlanAction plan={plan} authenticated={authenticated} pending={pending} onBuy={onBuy} />

        <ul className="flex flex-col gap-1.5">
          {plan.highlights.map((line) => (
            <li key={line} className="flex items-start gap-2 text-[12.5px] text-fg-muted">
              <CheckIcon className="mt-0.5 size-3.5 shrink-0 text-ember" aria-hidden />
              <span>{line}</span>
            </li>
          ))}
        </ul>
      </PanelBody>
    </Panel>
  );
}

function PlanAction({
  plan,
  authenticated,
  pending,
  onBuy,
}: {
  plan: Plan;
  authenticated: boolean;
  pending: boolean;
  onBuy: () => void;
}) {
  if (plan.current) {
    return (
      <Button size="sm" variant="outline" disabled>
        Your plan
      </Button>
    );
  }

  // Enterprise has no self-serve price, and any plan is unbuyable in an
  // environment with no Stripe key. Both send the reader somewhere they can
  // actually act rather than at a button that returns a 402.
  if (!plan.checkout) {
    return (
      <Button asChild size="sm" variant={plan.key === "free" ? "outline" : "default"}>
        <Link href={plan.key === "free" ? "/signup" : "/resources"}>
          {plan.cta} <ArrowRightIcon className="size-3.5" aria-hidden />
        </Link>
      </Button>
    );
  }

  if (!authenticated) {
    return (
      <Button asChild size="sm">
        <Link href={`/signup?next=/pricing`}>
          {plan.trial_days > 0 ? `Start ${plan.trial_days}-day trial` : plan.cta}
          <ArrowRightIcon className="size-3.5" aria-hidden />
        </Link>
      </Button>
    );
  }

  return (
    <Button size="sm" disabled={pending} onClick={onBuy}>
      {plan.cta} <ArrowRightIcon className="size-3.5" aria-hidden />
    </Button>
  );
}

/**
 * The full grid.
 *
 * Limits and features in one table because they answer the same question from
 * two directions — "how much of it do I get" and "do I get it at all" — and
 * splitting them across two tables makes the reader hold one while scrolling
 * to the other.
 */
function ComparisonTable({ plans }: { plans: Plan[] }) {
  const limits = plans[0]?.limits ?? [];
  const features = plans[0]?.features ?? [];

  return (
    <Panel className="mt-6 overflow-x-auto">
      <table className="w-full min-w-[640px] border-collapse text-left">
        <thead>
          <tr className="border-b border-line">
            <th scope="col" className="px-4 py-2.5 text-[12px] font-medium text-fg-muted">
              Compare
            </th>
            {plans.map((plan) => (
              <th
                key={plan.key}
                scope="col"
                className="px-4 py-2.5 text-[12.5px] font-semibold text-fg"
              >
                {plan.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {limits.map((limit, index) => (
            <tr key={limit.metric} className="border-b border-line/70">
              <th scope="row" className="px-4 py-2 text-[12.5px] font-normal text-fg-muted">
                {limit.label}
              </th>
              {plans.map((plan) => (
                <td key={plan.key} className="px-4 py-2 font-mono text-[12px] text-fg tabular-nums">
                  {formatLimit(plan.limits[index]?.limit)}
                </td>
              ))}
            </tr>
          ))}

          {features.map((feature, index) => (
            <tr key={feature.key} className="border-b border-line/70 last:border-b-0">
              <th scope="row" className="px-4 py-2 text-[12.5px] font-normal text-fg-muted">
                {feature.label}
              </th>
              {plans.map((plan) => (
                <td key={plan.key} className="px-4 py-2">
                  {plan.features[index]?.included ? (
                    <CheckIcon className="size-4 text-ember" aria-label="Included" />
                  ) : (
                    <MinusIcon className="size-4 text-fg-subtle" aria-label="Not included" />
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </Panel>
  );
}
