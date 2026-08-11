import { apiFetch } from "@/lib/api/client";
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
export type PlanFeature = Schemas["PlanFeatureOut"];
export type PlanLimit = Schemas["PlanLimitOut"];
export type Subscription = Schemas["SubscriptionOut"];
export type Usage = Schemas["UsageSummaryOut"];
export type Quota = Schemas["QuotaOut"];
export type Invoice = Schemas["InvoiceOut"];

export type PlanKey = "free" | "pro" | "team" | "enterprise";
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
 * Start checkout and hand the browser to Stripe.
 *
 * Returns the URL rather than navigating, so the caller decides when the
 * redirect happens — a component that navigated from inside the mutation would
 * leave its own loading state hanging on a page that is about to unmount.
 */
export function createCheckoutSession(body: { plan: PlanKey; interval: Interval; seats?: number }) {
  return apiFetch<{ url: string }>("/api/v1/billing/checkout-session", {
    method: "POST",
    body,
  });
}

export function createPortalSession() {
  return apiFetch<{ url: string }>("/api/v1/billing/portal-session", { method: "POST" });
}

export function setCancellation(cancel: boolean) {
  return apiFetch<Subscription>("/api/v1/billing/cancellation", {
    method: "POST",
    body: { cancel },
  });
}

// ── Formatting ──────────────────────────────────────────────────────────────

/**
 * Minor units to a price string.
 *
 * `$19` rather than `$19.00` when the cents are zero: every price this product
 * charges is a whole number of dollars, and trailing zeros on a pricing page
 * read as precision nobody asked for.
 */
export function formatPrice(cents: number | null | undefined, currency = "usd"): string {
  if (cents === null || cents === undefined) return "Custom";
  const amount = cents / 100;
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: currency.toUpperCase(),
    minimumFractionDigits: 0,
    maximumFractionDigits: amount % 1 === 0 ? 0 : 2,
  }).format(amount);
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
