"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangleIcon,
  ArrowRightIcon,
  LockIcon,
  Loader2Icon,
  ShieldCheckIcon,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";

import { IntervalChoice, PlanChoice } from "@/components/features/billing/plan-choice";
import { PageHeader } from "@/components/forge/page-header";
import { Panel, PanelBody } from "@/components/forge/panel";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  createCheckoutSession,
  formatPrice,
  selectPlan,
  type Interval,
  type ChoosablePlanKey,
} from "@/lib/api/billing";
import { usePlans, useSubscription } from "@/lib/api/hooks";
import { qk } from "@/lib/api/query-keys";

/**
 * The payment wall.
 *
 * Stands in front of the account-only surfaces for two reasons and only two: a
 * paid plan was chosen at signup and never paid for, or a subscription went
 * past due and its grace period ran out. `AuthGuard` sends both here.
 *
 * It is a redirect, not an authorization. Every quota and feature check reads
 * `user.plan`, which stays Free until a webhook says a card was charged — so
 * an account that never gets past this screen has the free tier rather than
 * the plan it picked. The wall exists to *collect*, not to enforce.
 *
 * Which is why declining is always on it. A screen someone can only leave by
 * paying converts worse than one they can turn down, and the alternative is a
 * support queue asking for the column to be cleared by hand.
 */
export function PaymentWall() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const subscription = useSubscription();
  const plans = usePlans();

  const pending = subscription.data?.pending_plan;
  const pastDue = !pending && subscription.data?.payment_required === true;

  // The picker holds an *override*, not a value: null means "whatever the
  // server last recorded". Copying the server's answer into state on arrival
  // would need an effect, and that effect would overwrite the user's choice
  // every time the query refetched — including the refetch this component's
  // own `remember` mutation triggers.
  const [chosen, setChosen] = useState<ChoosablePlanKey | null>(null);
  const [chosenInterval, setChosenInterval] = useState<Interval | null>(null);

  const plan: ChoosablePlanKey = chosen ?? (pending as ChoosablePlanKey | undefined) ?? "pro";
  const interval: Interval =
    chosenInterval ?? (subscription.data?.pending_interval === "annual" ? "annual" : "monthly");

  // Nothing owed — arrived here by typing the URL, or paid in another tab.
  // Send them on rather than showing a bill for nothing.
  useEffect(() => {
    if (subscription.isLoading) return;
    if (subscription.data && !subscription.data.payment_required) {
      router.replace("/dashboard");
    }
  }, [subscription.isLoading, subscription.data, router]);

  const checkout = useMutation({
    mutationFn: () => createCheckoutSession({ plan, interval }),
    onSuccess: ({ url }) => {
      window.location.href = url;
    },
    onError: () => toast.error("Could not start checkout. Try again in a moment."),
  });

  const decline = useMutation({
    mutationFn: () => selectPlan({ plan: null }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: qk.billing.subscription() });
      router.replace("/dashboard");
    },
    onError: () => toast.error("Could not update your plan. Try again in a moment."),
  });

  // Keep the server's record of the choice in step with the picker, so
  // closing the tab and coming back on another device resumes where this one
  // left off rather than at whatever was chosen on the signup form.
  const remember = useMutation({
    mutationFn: (next: { plan: ChoosablePlanKey; interval: Interval }) => selectPlan(next),
  });

  const row = (plans.data ?? []).find((entry) => entry.key === plan);
  const saving = (plans.data ?? []).find((entry) => entry.annual_saving_cents > 0);
  const buyable = row?.checkout === true;

  if (subscription.isLoading) {
    return (
      <div className="mx-auto flex w-full max-w-[560px] flex-col gap-4">
        <Skeleton className="h-20 rounded-md" />
        <Skeleton className="h-80 rounded-md" />
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-[560px] flex-col">
      <PageHeader
        title={pastDue ? "Your payment did not go through" : "Complete your subscription"}
        description={
          pastDue
            ? "We could not charge your card, and the retry window has closed. Your account is on the free plan until a payment succeeds — nothing has been deleted."
            : "You chose a paid plan when you signed up. Pay for it here and the rest of the product opens up."
        }
      />

      {pastDue ? (
        <div className="mb-4 flex items-start gap-2.5 rounded-md border border-warning/40 bg-warning/10 px-3.5 py-3">
          <AlertTriangleIcon className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden />
          <p className="text-[12.5px] leading-relaxed text-fg-muted">
            Every project, stack, and run you have made is still there and still exportable. Paying
            restores the limits, not the data — the data never left.
          </p>
        </div>
      ) : null}

      <Panel>
        <PanelBody className="flex flex-col gap-4">
          <IntervalChoice
            interval={interval}
            onChange={(next) => {
              setChosenInterval(next);
              remember.mutate({ plan, interval: next });
            }}
            savingLabel={
              saving
                ? `save ${formatPrice(saving.annual_saving_cents, saving.currency)}`
                : undefined
            }
          />

          <PlanChoice
            plans={plans.data ?? []}
            loading={plans.isLoading}
            value={plan}
            onChange={(next) => {
              setChosen(next);
              remember.mutate({ plan: next, interval });
            }}
            interval={interval}
            includeFree={false}
          />

          {buyable ? (
            <Button
              onClick={() => checkout.mutate()}
              disabled={checkout.isPending}
              className="h-9 w-full bg-ember text-ember-fg shadow-none hover:bg-ember-hover"
            >
              {checkout.isPending ? (
                <Loader2Icon className="size-4 animate-spin" aria-hidden />
              ) : (
                <LockIcon className="size-3.5" aria-hidden />
              )}
              {row && row.trial_days > 0 && !pastDue
                ? `Start ${row.trial_days}-day trial`
                : `Pay ${formatPrice(
                    interval === "annual" ? row?.annual_cents : row?.monthly_cents,
                    row?.currency,
                  )}`}
              <ArrowRightIcon className="size-3.5" aria-hidden />
            </Button>
          ) : (
            // No Stripe key in this environment. Saying so beats a button that
            // returns a 402 and a toast that blames the network.
            <div className="rounded-md border border-line bg-surface-2 px-3.5 py-3">
              <p className="text-[12.5px] leading-relaxed text-fg-muted">
                Card payments are not available in this environment yet. Continue on the free plan
                for now — everything you make is kept, and upgrading later changes nothing but the
                limits.
              </p>
            </div>
          )}

          <div className="flex items-center gap-1.5 text-[11.5px] text-fg-subtle">
            <ShieldCheckIcon className="size-3.5 shrink-0" aria-hidden />
            <span>
              Card details go to Stripe, never to StackForge.
              {row && row.trial_days > 0 && !pastDue
                ? ` You are not charged until the ${row.trial_days}-day trial ends.`
                : null}
            </span>
          </div>
        </PanelBody>
      </Panel>

      <div className="mt-4 flex flex-col items-center gap-1.5">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => decline.mutate()}
          disabled={decline.isPending}
        >
          {decline.isPending ? <Loader2Icon className="size-3.5 animate-spin" /> : null}
          Continue on the free plan
        </Button>
        <p className="text-center text-[11.5px] text-fg-subtle">
          You can upgrade whenever you like from{" "}
          <Link href="/settings/billing" className="underline hover:text-fg-muted">
            billing settings
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
