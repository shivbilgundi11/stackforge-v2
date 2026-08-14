import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type * as BillingModule from "@/lib/api/billing";
import type { Plan, Subscription } from "@/lib/api/billing";

/**
 * The payment wall.
 *
 * The behaviours worth pinning are the ones that would otherwise be discovered
 * by a customer: that declining is reachable, that the wall opens on the plan
 * the signup form recorded rather than on a default, and that a plan with no
 * price configured explains itself instead of offering a button that 402s.
 */

const createCheckoutSession = vi.hoisted(() => vi.fn());
const selectPlan = vi.hoisted(() => vi.fn());
const replace = vi.hoisted(() => vi.fn());
const data = vi.hoisted(() => ({
  plans: [] as Plan[],
  subscription: null as Subscription | null,
}));

vi.mock("@/lib/api/hooks", () => ({
  usePlans: () => ({ data: data.plans, isLoading: false }),
  useSubscription: () => ({ data: data.subscription ?? undefined, isLoading: false }),
}));

vi.mock("next/navigation", () => ({ useRouter: () => ({ replace }) }));

vi.mock("react-hot-toast", () => ({ default: { success: vi.fn(), error: vi.fn() } }));

vi.mock("@/lib/api/billing", async () => {
  const actual = await vi.importActual<typeof BillingModule>("@/lib/api/billing");
  return { ...actual, createCheckoutSession, selectPlan };
});

const { PaymentWall } = await import("@/components/features/billing/payment-wall");

function plan(overrides: Partial<Plan> = {}): Plan {
  return {
    key: "pro",
    label: "Pro",
    tagline: "For the person who has to defend the number.",
    monthly_cents: 1900,
    annual_cents: 19000,
    annual_saving_cents: 3800,
    currency: "usd",
    per_seat: false,
    trial_days: 7,
    highlights: ["Unlimited tool runs", "PDF export"],
    cta: "Start 7-day trial",
    self_serve: true,
    checkout: true,
    current: false,
    features: [],
    limits: [],
    ...overrides,
  };
}

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

function renderWall() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <PaymentWall />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  data.plans = [plan(), plan({ key: "team", label: "Team", monthly_cents: 4900, per_seat: true })];
  data.subscription = subscription();
});

describe("PaymentWall", () => {
  it("opens on the plan the signup form recorded", () => {
    data.subscription = subscription({ pending_plan: "team", pending_interval: "annual" });

    renderWall();

    expect(screen.getByRole("radio", { name: /Team/ })).toBeChecked();
    expect(screen.getByRole("button", { name: "annual" })).toHaveAttribute("aria-pressed", "true");
  });

  it("never offers the free plan as a purchase", () => {
    data.plans = [
      plan({ key: "free", label: "Free", monthly_cents: 0, self_serve: false }),
      plan(),
    ];

    renderWall();

    // Declining is a button, not a fourth radio that reads as something to buy.
    expect(screen.queryByRole("radio", { name: /Free/ })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Continue on the free plan/ })).toBeInTheDocument();
  });

  it("lets the account decline and stay free", async () => {
    selectPlan.mockResolvedValue(subscription({ pending_plan: null, payment_required: false }));

    renderWall();
    await userEvent.click(screen.getByRole("button", { name: /Continue on the free plan/ }));

    await waitFor(() => expect(selectPlan).toHaveBeenCalledWith({ plan: null }));
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/dashboard"));
  });

  it("starts checkout on the plan and interval on screen", async () => {
    createCheckoutSession.mockResolvedValue({ url: "https://checkout.test/1" });

    renderWall();
    await userEvent.click(screen.getByRole("button", { name: "annual" }));
    await userEvent.click(screen.getByRole("button", { name: /Start 7-day trial/ }));

    await waitFor(() =>
      expect(createCheckoutSession).toHaveBeenCalledWith({ plan: "pro", interval: "annual" }),
    );
  });

  it("records a change of mind, so another device resumes on the new plan", async () => {
    selectPlan.mockResolvedValue(subscription({ pending_plan: "team" }));

    renderWall();
    await userEvent.click(screen.getByRole("radio", { name: /Team/ }));

    await waitFor(() =>
      expect(selectPlan).toHaveBeenCalledWith({ plan: "team", interval: "monthly" }),
    );
  });

  it("explains an unbuyable plan rather than offering a button that fails", () => {
    data.plans = [plan({ checkout: false })];

    renderWall();

    expect(screen.queryByRole("button", { name: /Start 7-day trial/ })).not.toBeInTheDocument();
    expect(screen.getByText(/not available in this environment/i)).toBeInTheDocument();
    // The way out is still there — that is the whole point of it being there.
    expect(screen.getByRole("button", { name: /Continue on the free plan/ })).toBeInTheDocument();
  });

  it("says a failed payment kept the data", () => {
    data.subscription = subscription({
      plan: "free",
      status: "past_due",
      pending_plan: null,
      pending_interval: null,
      payment_required: true,
    });

    renderWall();

    expect(
      screen.getByRole("heading", { name: /payment did not go through/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/still there and still exportable/i)).toBeInTheDocument();
  });

  it("sends an account that owes nothing back to the dashboard", async () => {
    data.subscription = subscription({ pending_plan: null, payment_required: false });

    renderWall();

    await waitFor(() => expect(replace).toHaveBeenCalledWith("/dashboard"));
  });
});
