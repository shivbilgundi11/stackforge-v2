"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowRightIcon,
  CreditCardIcon,
  ExternalLinkIcon,
  GaugeIcon,
  ReceiptIcon,
} from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";

import { UsageMeter } from "@/components/features/billing/usage-meter";
import { EmptyState, Panel, PanelBody, PanelFooter, PanelHeader } from "@/components/forge/panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatPrice, setCancellation, type Subscription } from "@/lib/api/billing";
import { useInvoices, useSubscription, useUsage } from "@/lib/api/hooks";
import { qk } from "@/lib/api/query-keys";

/**
 * Settings → Billing (M20).
 *
 * Three panels: what you are on, what you have used, and what you have paid.
 *
 * Everything is in-app since D-50. Razorpay has no hosted billing portal, so
 * the two things a portal was for are here instead: invoices are read live
 * from the API, and cancel-at-period-end is a button — which is also the
 * moment to say what cancelling does *not* do, since nothing is deleted and
 * the period already paid for is kept.
 *
 * Card details are still never handled here. Changing a saved card means
 * authorizing a new mandate on Razorpay's own page, which is what
 * re-subscribing does, so the past-due banner links to checkout rather than
 * collecting anything.
 */
export function BillingSection() {
  const subscription = useSubscription();
  const usage = useUsage();
  const invoices = useInvoices();

  if (subscription.isLoading) {
    return (
      <div className="flex flex-col gap-5">
        <Skeleton className="h-44 rounded-md" />
        <Skeleton className="h-56 rounded-md" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {subscription.data ? <StateBanner subscription={subscription.data} /> : null}

      <PlanPanel subscription={subscription.data} />

      <Panel id="usage">
        <PanelHeader
          title="Usage"
          description="What you have used against your plan. Counters reset on the period shown."
          icon={<GaugeIcon className="size-3.5" aria-hidden />}
        />
        <PanelBody className="grid gap-5 sm:grid-cols-2">
          {usage.isLoading
            ? [0, 1, 2, 3].map((key) => <Skeleton key={key} className="h-12 rounded-md" />)
            : (usage.data?.quotas ?? []).map((quota) => (
                <UsageMeter key={quota.metric} quota={quota} />
              ))}
        </PanelBody>
      </Panel>

      <Panel id="invoices">
        <PanelHeader
          title="Invoices"
          description="Read live from Razorpay, so this is the same record your finance team sees."
          icon={<ReceiptIcon className="size-3.5" aria-hidden />}
        />
        {invoices.isLoading ? (
          <PanelBody className="flex flex-col gap-2">
            <Skeleton className="h-10 rounded-md" />
            <Skeleton className="h-10 rounded-md" />
          </PanelBody>
        ) : (invoices.data?.length ?? 0) === 0 ? (
          <EmptyState
            icon={<ReceiptIcon className="size-4" aria-hidden />}
            title="No invoices yet"
            description="Invoices appear here after your first payment."
          />
        ) : (
          <ul className="flex flex-col">
            {(invoices.data ?? []).map((invoice) => (
              <li
                key={invoice.id}
                className="flex items-center justify-between gap-3 border-b border-line px-4 py-2.5 last:border-b-0"
              >
                <div className="flex min-w-0 flex-col">
                  <span className="truncate text-[13px] font-medium text-fg">
                    {invoice.number ?? invoice.id}
                  </span>
                  <span className="text-[11.5px] text-fg-subtle">
                    {new Date(invoice.created).toLocaleDateString(undefined, {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <span className="font-mono text-[12.5px] text-fg tabular-nums">
                    {formatPrice(invoice.amount_paid || invoice.amount_due, invoice.currency)}
                  </span>
                  <Badge variant={invoice.status === "paid" ? "secondary" : "outline"}>
                    {invoice.status ?? "unknown"}
                  </Badge>
                  {invoice.hosted_invoice_url ? (
                    <Button asChild size="sm" variant="ghost">
                      <a
                        href={invoice.hosted_invoice_url}
                        target="_blank"
                        rel="noreferrer noopener"
                      >
                        View <ExternalLinkIcon className="size-3.5" aria-hidden />
                      </a>
                    </Button>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}

// ── Plan ────────────────────────────────────────────────────────────────────

function PlanPanel({ subscription }: { subscription: Subscription | undefined }) {
  const client = useQueryClient();

  const cancel = useMutation({
    mutationFn: (value: boolean) => setCancellation(value),
    onSuccess: (updated) => {
      void client.invalidateQueries({ queryKey: qk.billing.subscription() });
      toast.success(
        updated.cancel_at_period_end
          ? "Cancelled. You keep everything until the period ends."
          : "Cancellation undone. Your plan continues.",
      );
    },
    onError: () => toast.error("Could not change your cancellation."),
  });

  const plan = subscription?.plan ?? "free";
  const isPaid = plan !== "free";

  return (
    <Panel id="plan">
      <PanelHeader
        title="Plan"
        description="What your account is on, and what it allows."
        icon={<CreditCardIcon className="size-3.5" aria-hidden />}
        actions={<PlanBadge subscription={subscription} />}
      />

      <PanelBody className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 flex-col gap-1">
          <p className="text-lg font-medium text-fg capitalize">{plan}</p>
          {subscription?.current_period_end ? (
            <p className="text-[13px] text-fg-muted">
              {subscription.cancel_at_period_end ? "Access ends" : "Renews"} on{" "}
              {new Date(subscription.current_period_end).toLocaleDateString(undefined, {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
              {subscription.seats > 1 ? ` · ${subscription.seats} seats` : ""}
            </p>
          ) : (
            <p className="text-[13px] text-fg-muted">
              Every tool, the whole catalog, and Markdown export — no card.
            </p>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {/* No "manage payment" button. Razorpay has no portal to send them
              to, and the things it would have offered are already on this
              page: the invoice list below, and the cancel control beside it. */}
          <Button asChild size="sm" variant={isPaid ? "ghost" : "default"}>
            <Link href="/pricing">
              {isPaid ? "Compare plans" : "Upgrade"}
              <ArrowRightIcon className="size-3.5" aria-hidden />
            </Link>
          </Button>
        </div>
      </PanelBody>

      {isPaid ? (
        <PanelFooter>
          <p className="text-[11.5px] text-fg-subtle">
            {subscription?.cancel_at_period_end
              ? "Your plan ends at the period boundary. Nothing is deleted — your work stays and becomes read-only above the free limits."
              : "Cancelling keeps the period you have paid for. Nothing is deleted either way."}
          </p>
          <Button
            size="sm"
            variant="ghost"
            className={
              subscription?.cancel_at_period_end ? undefined : "text-danger hover:text-danger"
            }
            disabled={cancel.isPending}
            onClick={() => cancel.mutate(!subscription?.cancel_at_period_end)}
          >
            {subscription?.cancel_at_period_end ? "Resume plan" : "Cancel plan"}
          </Button>
        </PanelFooter>
      ) : null}
    </Panel>
  );
}

function PlanBadge({ subscription }: { subscription: Subscription | undefined }) {
  if (!subscription?.status) return null;

  switch (subscription.status) {
    case "trialing":
      return <Badge variant="outline">Trial</Badge>;
    case "past_due":
      return <Badge variant="destructive">Payment failed</Badge>;
    case "canceled":
      return <Badge variant="outline">Cancelled</Badge>;
    case "incomplete":
      return <Badge variant="outline">Incomplete</Badge>;
    default:
      return <Badge variant="secondary">Active</Badge>;
  }
}

// ── Banners ─────────────────────────────────────────────────────────────────

/**
 * Trial and dunning, above everything else.
 *
 * Both say what happens if the reader does nothing, because that is the
 * decision being made. A banner that only announces a state leaves them to
 * guess whether their work is at risk — and the answer, that nothing is
 * deleted, is the half worth leading with.
 */
function StateBanner({ subscription }: { subscription: Subscription }) {
  if (subscription.status === "past_due") {
    const days = subscription.grace_days_left;
    return (
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-danger/40 bg-danger/5 px-4 py-3">
        <div className="flex min-w-0 flex-col gap-0.5">
          <p className="text-[13.5px] font-medium text-fg">We could not charge your card</p>
          <p className="text-[12.5px] text-fg-muted">
            Your plan is unchanged for now
            {typeof days === "number"
              ? ` and we will keep retrying for ${days} more ${days === 1 ? "day" : "days"}`
              : ""}
            . Re-authorizing a payment method keeps it.
          </p>
        </div>
        <Button asChild size="sm">
          <Link href="/checkout">
            Re-authorize <ArrowRightIcon className="size-3.5" aria-hidden />
          </Link>
        </Button>
      </div>
    );
  }

  if (subscription.status === "trialing" && subscription.trial_ends_at) {
    const endsAt = new Date(subscription.trial_ends_at);
    const days = Math.max(0, Math.ceil((endsAt.getTime() - Date.now()) / 86_400_000));
    return (
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-line bg-surface-2/60 px-4 py-3">
        <div className="flex min-w-0 flex-col gap-0.5">
          <p className="text-[13.5px] font-medium text-fg">
            {days === 0
              ? "Your trial ends today"
              : `${days} ${days === 1 ? "day" : "days"} left in your trial`}
          </p>
          {/* The card was authorized when the trial started (D-50), so this
              converts on its own. Saying "add a card to keep your plan" would
              be telling the user nothing will be charged when something
              will. */}
          <p className="text-[12.5px] text-fg-muted">
            Your payment method is already authorized, so your plan continues automatically. Cancel
            before it ends and you are not charged — nothing is deleted either way.
          </p>
        </div>
        <Button asChild size="sm" variant="outline">
          <Link href="/settings/billing#plan">Review plan</Link>
        </Button>
      </div>
    );
  }

  return null;
}
