import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, expect, it, vi } from "vitest";

import type * as BillingModule from "@/lib/api/billing";
import type { Subscription } from "@/lib/api/billing";
import { qk } from "@/lib/api/query-keys";

/**
 * The page Razorpay returns the browser to.
 *
 * One behaviour matters more than the rest: it must not declare success for a
 * purchase that did not land. It used to wait for `payment_required` to go
 * false, which asks "does this account owe money" — already false for someone
 * upgrading from Pro to Team — so an upgrade that silently failed forwarded to
 * the dashboard exactly like one that worked. A real customer paid and was
 * left on Pro with the app showing no sign anything was wrong.
 *
 * The second is what happens *after* it forwards. The plan the user just
 * bought is an input to nearly every read in the app, and one of the places it
 * is read from is not the query cache at all — so a purchase that landed
 * correctly still showed the old plan until the page was reloaded.
 */

const getSubscription = vi.hoisted(() => vi.fn());
const reconcileSubscription = vi.hoisted(() => vi.fn());
const replace = vi.hoisted(() => vi.fn());
const refreshUser = vi.hoisted(() => vi.fn());
const search = vi.hoisted(() => ({ value: "" }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace }),
  useSearchParams: () => new URLSearchParams(search.value),
}));

vi.mock("@/lib/auth/auth-provider", () => ({
  useAuth: () => ({ status: "authenticated", user: null, refreshUser }),
}));

vi.mock("@/lib/api/billing", async () => {
  const actual = await vi.importActual<typeof BillingModule>("@/lib/api/billing");
  return { ...actual, getSubscription, reconcileSubscription };
});

const { CheckoutReturn } = await import("@/components/features/billing/checkout-return");

function subscription(overrides: Partial<Subscription> = {}): Subscription {
  return {
    plan: "pro",
    status: "active",
    checkout_available: true,
    seats: 1,
    cancel_at_period_end: false,
    current_period_end: null,
    trial_ends_at: null,
    past_due_since: null,
    grace_days_left: null,
    pending_plan: null,
    pending_interval: null,
    payment_required: false,
    ...overrides,
  } as Subscription;
}

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const view = render(
    <QueryClientProvider client={queryClient}>
      <CheckoutReturn />
    </QueryClientProvider>,
  );
  return { ...view, queryClient };
}

beforeEach(() => {
  vi.clearAllMocks();
  search.value = "";
  refreshUser.mockResolvedValue(undefined);
});

it("does not report success when the upgrade has not landed", async () => {
  // The exact production failure: buying Team from a live Pro account. The
  // account owes nothing either way, so "payment_required" cannot tell these
  // apart — only the plan can.
  search.value = "plan=team";
  reconcileSubscription.mockResolvedValue(subscription({ plan: "pro" }));
  getSubscription.mockResolvedValue(subscription({ plan: "pro" }));

  renderPage();

  await waitFor(() => expect(reconcileSubscription).toHaveBeenCalled());
  expect(replace).not.toHaveBeenCalled();
  expect(screen.getByText(/confirming your payment/i)).toBeInTheDocument();
});

it("forwards once the plan that was bought arrives", async () => {
  search.value = "plan=team";
  reconcileSubscription.mockResolvedValue(subscription({ plan: "team", seats: 5 }));

  renderPage();

  await waitFor(() => expect(replace).toHaveBeenCalledWith("/dashboard"));
});

it("accepts a plan above the one that was bought", async () => {
  // Being granted Team by an organization satisfies an intent to buy Pro.
  // Holding someone at a confirmation screen for a plan they already outrank
  // is a loop with no exit.
  search.value = "plan=pro";
  reconcileSubscription.mockResolvedValue(subscription({ plan: "team" }));

  renderPage();

  await waitFor(() => expect(replace).toHaveBeenCalledWith("/dashboard"));
});

it("asks Razorpay directly on the first attempt", async () => {
  // In any environment without a webhook tunnel this is the only call that
  // will ever move the plan, so it cannot wait for a later tick.
  search.value = "plan=pro";
  reconcileSubscription.mockResolvedValue(subscription({ plan: "pro" }));

  renderPage();

  await waitFor(() => expect(replace).toHaveBeenCalled());
  expect(reconcileSubscription).toHaveBeenCalledTimes(1);
  expect(getSubscription).not.toHaveBeenCalled();
});

it("offers a way to check again when nothing arrives", async () => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  search.value = "plan=pro";
  reconcileSubscription.mockResolvedValue(subscription({ plan: "free", payment_required: true }));
  getSubscription.mockResolvedValue(subscription({ plan: "free", payment_required: true }));

  renderPage();
  await vi.advanceTimersByTimeAsync(30_000);

  const button = await screen.findByRole("button", { name: /check again/i });
  expect(replace).not.toHaveBeenCalled();

  // The payment lands between the giving up and the pressing.
  reconcileSubscription.mockResolvedValue(subscription({ plan: "pro" }));
  vi.useRealTimers();
  await userEvent.click(button);

  await waitFor(() => expect(replace).toHaveBeenCalledWith("/dashboard"));
});

it("refreshes the signed-in user before forwarding", async () => {
  // `user.plan` lives in the auth provider's state, not in the query cache,
  // and the account menu reads it from there. Invalidating queries does not
  // touch it, so without this the plan was right everywhere the cache reached
  // and wrong in the one place it did not — until a full reload.
  search.value = "plan=pro";
  reconcileSubscription.mockResolvedValue(subscription({ plan: "pro" }));

  renderPage();

  await waitFor(() => expect(replace).toHaveBeenCalledWith("/dashboard"));
  expect(refreshUser).toHaveBeenCalled();
});

it("retires every cached answer, not only the billing ones", async () => {
  // The plan is an input to quota, feature gates, the dashboard aggregate,
  // which export formats are offered and whether a premium template body comes
  // back. The default `staleTime` is thirty seconds and a checkout takes less
  // than that, so a curated list that misses one serves the pre-upgrade answer
  // on the page the user lands on.
  search.value = "plan=pro";
  reconcileSubscription.mockResolvedValue(subscription({ plan: "pro" }));

  const { queryClient } = renderPage();
  queryClient.setQueryData(qk.workspace.dashboard(), { plan: { plan: "free" } });
  queryClient.setQueryData(qk.templates.library(), { total: 0 });

  await waitFor(() => expect(replace).toHaveBeenCalledWith("/dashboard"));

  expect(queryClient.getQueryState(qk.workspace.dashboard())?.isInvalidated).toBe(true);
  expect(queryClient.getQueryState(qk.templates.library())?.isInvalidated).toBe(true);
});
