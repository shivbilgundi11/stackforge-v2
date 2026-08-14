import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { Subscription } from "@/lib/api/billing";

/**
 * `AuthGuard` — who gets shown what, and who gets sent where.
 *
 * The case worth a test of its own is the wall guarding its own route. React
 * Query's `enabled: false` does not mean "no data": it means "do not fetch",
 * and the hook still serves whatever the key already holds. So on `/checkout`
 * the guard reads a cached `payment_required: true` from the redirect that
 * *sent it there*, and a version of this that trusted that value held a
 * skeleton over the payment wall forever — a loop whose symptom is an empty
 * page with a working sidebar, and which no assertion on a URL can catch.
 */

const replace = vi.hoisted(() => vi.fn());
const state = vi.hoisted(() => ({
  status: "authenticated" as "authenticated" | "anonymous" | "loading",
  pathname: "/dashboard",
  subscription: undefined as Subscription | undefined,
  isError: false,
  enabledCalls: [] as boolean[],
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace }),
  usePathname: () => state.pathname,
}));

vi.mock("@/lib/auth/auth-provider", () => ({
  useAuth: () => ({ status: state.status, user: null }),
}));

vi.mock("@/lib/api/hooks", () => ({
  useSubscription: (enabled = true) => {
    state.enabledCalls.push(enabled);
    // Deliberately returns the cached value regardless of `enabled` — that is
    // exactly what React Query does, and mocking it as `undefined` when
    // disabled would hide the bug this file exists for.
    return { data: state.subscription, isLoading: false, isError: state.isError };
  },
}));

const { AuthGuard } = await import("@/components/shell/auth-guard");

function subscription(overrides: Partial<Subscription> = {}): Subscription {
  return {
    plan: "free",
    status: null,
    checkout_available: true,
    seats: 0,
    cancel_at_period_end: false,
    current_period_end: null,
    trial_ends_at: null,
    past_due_since: null,
    grace_days_left: null,
    pending_plan: "pro",
    pending_interval: "monthly",
    payment_required: true,
    ...overrides,
  };
}

function renderGuard() {
  return render(
    <AuthGuard>
      <h1>Protected content</h1>
    </AuthGuard>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  state.status = "authenticated";
  state.pathname = "/dashboard";
  state.subscription = undefined;
  state.isError = false;
  state.enabledCalls = [];
});

describe("AuthGuard", () => {
  it("renders an ungated route without waiting on a subscription", () => {
    state.pathname = "/cost/llm-pricing";
    state.status = "anonymous";

    renderGuard();

    // The anonymous tier reaches every calculator by design (D-17).
    expect(screen.getByText("Protected content")).toBeInTheDocument();
    expect(state.enabledCalls.every((enabled) => enabled === false)).toBe(true);
  });

  it("sends an anonymous visitor on a gated route to login", async () => {
    state.status = "anonymous";

    renderGuard();

    await waitFor(() => expect(replace).toHaveBeenCalledWith("/login?next=%2Fdashboard"));
    expect(screen.queryByText("Protected content")).not.toBeInTheDocument();
  });

  it("sends an account that owes a checkout to the wall", async () => {
    state.subscription = subscription();

    renderGuard();

    await waitFor(() => expect(replace).toHaveBeenCalledWith("/checkout"));
    // And withholds the page it is leaving, rather than flashing it first.
    expect(screen.queryByText("Protected content")).not.toBeInTheDocument();
  });

  it("renders the wall on its own route despite the cached debt", () => {
    // The regression. Arriving here *means* payment is required, and the
    // cached summary says so.
    state.pathname = "/checkout";
    state.subscription = subscription();

    renderGuard();

    expect(screen.getByText("Protected content")).toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
  });

  it("renders Stripe's return page too, for the same reason", () => {
    state.pathname = "/checkout/done";
    state.subscription = subscription();

    renderGuard();

    expect(screen.getByText("Protected content")).toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
  });

  it("never asks for a subscription on the wall's own routes", () => {
    state.pathname = "/checkout";
    state.subscription = subscription();

    renderGuard();

    expect(state.enabledCalls.every((enabled) => enabled === false)).toBe(true);
  });

  it("waits for the answer rather than flashing the page first", () => {
    state.subscription = undefined;

    renderGuard();

    // Authenticated, gated, and the query has not returned. Showing the
    // dashboard now and yanking it a moment later reads as the app losing a
    // payment.
    expect(screen.queryByText("Protected content")).not.toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
  });

  it("fails open when the billing call cannot be answered", () => {
    // One failed billing request must not lock somebody out of their own
    // work. The wall is a nudge toward a checkout, not a permission — every
    // quota decision is enforced server-side regardless of what renders here.
    state.subscription = undefined;
    state.isError = true;

    renderGuard();

    expect(screen.getByText("Protected content")).toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
  });

  it("renders a gated route once nothing is owed", () => {
    state.subscription = subscription({ pending_plan: null, payment_required: false });

    renderGuard();

    expect(screen.getByText("Protected content")).toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
  });
});
