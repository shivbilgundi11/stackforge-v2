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
const openCheckout = vi.hoisted(() => vi.fn());
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

// Razorpay's script cannot load in jsdom, and the point of the assertion is
// what we hand it rather than what it draws.
vi.mock("@/lib/api/razorpay-checkout", () => ({ openCheckout }));

vi.mock("react-hot-toast", () => ({ default: { success: vi.fn(), error: vi.fn() } }));

vi.mock("@/lib/api/billing", async () => {
  const actual = await vi.importActual<typeof BillingModule>("@/lib/api/billing");
  return { ...actual, createCheckoutSession, selectPlan };
});

const { PaymentWall } = await import("@/components/features/billing/payment-wall");

/** INR is charged, USD is displayed — the dollar row at a made-up ₹100 = $1
 *  so a failed assertion names which currency rendered. */
function plan(overrides: Partial<Plan> = {}): Plan {
  const base: Plan = {
    key: "pro",
    label: "Pro",
    tagline: "For the person who has to defend the number.",
    monthly_minor: 49_900,
    annual_minor: 499_900,
    annual_saving_minor: 98_900,
    currency: "inr",
    prices: [],
    per_seat: false,
    trial_days: 7,
    highlights: ["Unlimited tool runs", "PDF export"],
    cta: "Start 7-day trial",
    self_serve: true,
    checkout: true,
    current: false,
    included: false,
    features: [],
    limits: [],
    ...overrides,
  };

  const cents = (minor: number | null) => (minor === null ? null : Math.round(minor / 100));
  return {
    ...base,
    prices: overrides.prices ?? [
      {
        currency: "inr",
        monthly_minor: base.monthly_minor,
        annual_minor: base.annual_minor,
        annual_saving_minor: base.annual_saving_minor,
        charged: true,
      },
      {
        currency: "usd",
        monthly_minor: cents(base.monthly_minor),
        annual_minor: cents(base.annual_minor),
        annual_saving_minor: Math.round(base.annual_saving_minor / 100),
        charged: false,
      },
    ],
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
  localStorage.clear();
  data.plans = [
    plan(),
    plan({
      key: "team",
      label: "Team",
      monthly_minor: 129_900,
      annual_minor: 1_299_900,
      per_seat: true,
    }),
  ];
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
      plan({ key: "free", label: "Free", monthly_minor: 0, self_serve: false }),
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
    createCheckoutSession.mockResolvedValue({ subscription_id: "sub_1", key_id: "rzp_test_k" });
    openCheckout.mockResolvedValue(undefined);

    renderWall();
    await userEvent.click(screen.getByRole("button", { name: "annual" }));
    await userEvent.click(screen.getByRole("button", { name: /Start 7-day trial/ }));

    await waitFor(() =>
      expect(createCheckoutSession).toHaveBeenCalledWith({ plan: "pro", interval: "annual" }),
    );
    // The subscription the backend just made is the one the modal opens
    // against. Handing over anything else authorizes a mandate for a plan the
    // customer did not choose.
    await waitFor(() =>
      expect(openCheckout).toHaveBeenCalledWith(
        { subscription_id: "sub_1", key_id: "rzp_test_k" },
        expect.objectContaining({ onDismiss: expect.any(Function) }),
      ),
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

  it("quotes the charged currency on the button, whatever the page is read in", async () => {
    // The one number on this screen that cannot be a conversion. Razorpay
    // debits INR, so a button reading "Pay $4.99" over a ₹499 statement line
    // is a different price from the one that was agreed to.
    localStorage.setItem("stackforge-currency", "usd");
    // No trial on this product, so the button quotes the amount rather than
    // offering days.
    data.plans = [plan({ trial_days: 0 })];

    renderWall();

    expect(await screen.findByRole("button", { name: /Pay ₹499/ })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Pay \$/ })).not.toBeInTheDocument();
    // The picker above it still reads in dollars, with the rupee charge beside
    // each one.
    expect(screen.getByText("$4.99")).toBeInTheDocument();
    expect(screen.getByText("(₹499 charged)")).toBeInTheDocument();
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
