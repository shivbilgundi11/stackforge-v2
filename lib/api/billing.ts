import { apiFetch } from "@/lib/api/client";
import { localeFor, type DisplayCurrency } from "@/lib/currency/display-currency";
import type { components } from "@/types/api";

/**
 * Plans, subscription, usage, and checkout (M20).
 *
 * `listPlans` is the only call here that works signed out — it is what the
 * public pricing page renders from, and the limits inside it come from the
 * backend's own table rather than a copy kept here. A pricing page with its own
 * numbers drifts from the enforcement, and the drift is invisible until someone
 * hits a wall the page said was not there.
 */

type Schemas = components["schemas"];

export type Plan = Schemas["PricingPlanOut"];
export type PlanPrice = Schemas["PlanPriceOut"];
export type PlanFeature = Schemas["PlanFeatureOut"];
export type PlanLimit = Schemas["PlanLimitOut"];
export type Subscription = Schemas["SubscriptionOut"];
export type Usage = Schemas["UsageSummaryOut"];
export type Quota = Schemas["QuotaOut"];
export type Invoice = Schemas["InvoiceOut"];

export type PlanKey = "free" | "pro" | "team" | "enterprise";
/**
 * The plans a form can actually submit.
 *
 * Enterprise is a conversation, not a radio button — it has no self-serve
 * price, so a signup form or a payment wall offering it would be offering a
 * step that cannot be completed. Narrowing it out in the type means that is
 * caught at the call site rather than by the server's 422.
 */
export type ChoosablePlanKey = "free" | "pro" | "team";
export type Interval = "monthly" | "annual";

export function listPlans() {
  return apiFetch<Plan[]>("/api/v1/billing/plans");
}

export function getSubscription() {
  return apiFetch<Subscription>("/api/v1/billing/subscription");
}

export function getUsage() {
  return apiFetch<Usage>("/api/v1/billing/usage");
}

export function listInvoices() {
  return apiFetch<Invoice[]>("/api/v1/billing/invoices");
}

/**
 * Create the subscription the browser will authorize against.
 *
 * There is no checkout session on this provider, and no URL to redirect to:
 * the subscription already exists in `created` state by the time this
 * resolves, and the customer authorizes a mandate in a Razorpay Checkout modal
 * opened with its id (D-52). Pass the result to `openCheckout`.
 *
 * Returns rather than opening, so the caller decides when the modal appears —
 * a component that opened it from inside the mutation would leave its own
 * loading state hanging under a modal it cannot see past.
 */
export function createCheckoutSession(body: { plan: PlanKey; interval: Interval; seats?: number }) {
  return apiFetch<{ subscription_id: string; key_id: string }>("/api/v1/billing/checkout-session", {
    method: "POST",
    body,
  });
}

/**
 * Record — or clear — the plan this account intends to buy.
 *
 * Separate from checkout because choosing and paying are separated in time:
 * the choice is made on the signup form, and the card arrives at the wall,
 * possibly on another device days later. `plan: null` is the decline, and it is
 * a real value here rather than an omission — a wall that can only be left by
 * paying converts worse than one that can be turned down.
 */
export function selectPlan(body: { plan: PlanKey | null; interval?: Interval }) {
  return apiFetch<Subscription>("/api/v1/billing/plan-selection", {
    method: "POST",
    body,
  });
}

/**
 * Ask the server to re-read this account's subscription from Razorpay.
 *
 * The repair path for a webhook that never arrived. Razorpay creates a
 * subscription before it is paid for, so `subscription.activated` is the only
 * thing that says the money moved — and one lost delivery used to mean a
 * customer who had paid and a plan that never changed, with nothing in the
 * product able to correct it.
 *
 * Safe to call more than once: the server keys the reconciliation on what the
 * subscription actually says, so repeating it over unchanged state does
 * nothing.
 */
export function reconcileSubscription() {
  return apiFetch<Subscription>("/api/v1/billing/reconcile", { method: "POST" });
}

export function setCancellation(cancel: boolean) {
  return apiFetch<Subscription>("/api/v1/billing/cancellation", {
    method: "POST",
    body: { cancel },
  });
}

// ── Formatting ──────────────────────────────────────────────────────────────

/**
 * Minor units (paise) to a price string.
 *
 * `₹499` rather than `₹499.00`: every price this product *charges* is a whole
 * number of rupees, and trailing zeros on a pricing page read as precision
 * nobody asked for.
 *
 * The locale comes from the currency, not the browser — see `localeFor`. A
 * rupee price grouped the Western way, or a dollar price written `59,99 $`,
 * reads as a foreign price on a page selling to the person looking at it.
 *
 * Dollar amounts do keep their cents: `$5.99` is the price, and rounding it to
 * `$6` on the page would be a different number from the one in the catalog.
 * That is what the `amount % 1` test is for — whole amounts lose the `.00`,
 * fractional ones keep both digits.
 */
export function formatPrice(minor: number | null | undefined, currency = "inr"): string {
  if (minor === null || minor === undefined) return "Custom";
  const amount = minor / 100;
  return new Intl.NumberFormat(localeFor(currency), {
    style: "currency",
    currency: currency.toUpperCase(),
    minimumFractionDigits: 0,
    maximumFractionDigits: amount % 1 === 0 ? 0 : 2,
  }).format(amount);
}

/**
 * The plan's row for one display currency.
 *
 * Falls back to the charged price rather than to nothing: a currency the
 * server does not price this plan in is a catalog gap, and quoting the real
 * rupee amount is the only wrong-looking-but-true answer available. The
 * charged row is always first in `prices`, which is what makes the fallback
 * safe.
 */
export function priceIn(plan: Plan, currency: DisplayCurrency | string): PlanPrice {
  const wanted = plan.prices.find((price) => price.currency === currency);
  return wanted ?? chargedPrice(plan);
}

/** What a card is actually debited. The only price a pay button may show. */
export function chargedPrice(plan: Plan): PlanPrice {
  return (
    plan.prices.find((price) => price.charged) ?? {
      currency: plan.currency,
      monthly_minor: plan.monthly_minor,
      annual_minor: plan.annual_minor,
      annual_saving_minor: plan.annual_saving_minor,
      charged: true,
    }
  );
}

/** The amount for one interval, so callers stop repeating the ternary. */
export function amountFor(price: PlanPrice, interval: Interval): number | null {
  return interval === "annual" ? price.annual_minor : price.monthly_minor;
}

/** `null` is unlimited, and says so. A meter reading "3 of 999999" is a meter
 *  nobody believes. */
export function formatLimit(limit: number | null | undefined): string {
  if (limit === null || limit === undefined) return "Unlimited";
  return new Intl.NumberFormat().format(limit);
}

/** How full a meter is, 0–100. An unlimited quota is never full. */
export function usagePercent(quota: Pick<Quota, "used" | "limit">): number {
  if (quota.limit === null || quota.limit === undefined || quota.limit === 0) return 0;
  return Math.min(100, Math.round((quota.used / quota.limit) * 100));
}

/** Meter colour. Amber before the wall, not at it — a meter that only changes
 *  once the limit is reached has told the user nothing they could act on. */
export function usageTone(quota: Pick<Quota, "used" | "limit">): "ember" | "warning" | "danger" {
  const percent = usagePercent(quota);
  if (percent >= 100) return "danger";
  if (percent >= 70) return "warning";
  return "ember";
}

export const METRIC_LABELS: Record<string, string> = {
  tool_runs_per_day: "Tool runs today",
  ai_calls_per_day: "AI-assisted runs today",
  projects: "Projects",
  saved_stacks: "Saved stacks",
  exports_per_month: "Exports this month",
  seats: "Seats",
};

export function metricLabel(metric: string): string {
  return METRIC_LABELS[metric] ?? metric.replaceAll("_", " ");
}
