import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type * as BillingModule from "@/lib/api/billing";
import type { Plan, Quota, Subscription, Usage } from "@/lib/api/billing";

/**
 * The billing surfaces (M20).
 *
 * What is worth testing here is not the layout but the two places the UI has
 * to reason about a value rather than print it: `null` meaning *unlimited*
 * rather than zero, and the state banners saying what happens if the reader
 * does nothing.
 *
 * Both have a failure mode that looks fine in a screenshot. A meter that reads
 * "0 of 0" on an unlimited plan renders perfectly and tells the user they have
 * nothing left.
 */

const createCheckoutSession = vi.hoisted(() => vi.fn());
const createPortalSession = vi.hoisted(() => vi.fn());
const setCancellation = vi.hoisted(() => vi.fn());
const authStatus = vi.hoisted(() => ({ current: "authenticated" }));
const data = vi.hoisted(() => ({
  plans: [] as Plan[],
  subscription: null as Subscription | null,
  usage: null as Usage | null,
}));

vi.mock("@/lib/api/hooks", () => ({
  usePlans: () => ({ data: data.plans, isLoading: false }),
  useSubscription: () => ({ data: data.subscription ?? undefined, isLoading: false }),
  useUsage: () => ({ data: data.usage ?? undefined, isLoading: false }),
  useInvoices: () => ({ data: [], isLoading: false }),
}));

vi.mock("@/lib/auth/auth-provider", () => ({
  useAuth: () => ({ status: authStatus.current, user: null }),
}));

vi.mock("react-hot-toast", () => ({ default: { success: vi.fn(), error: vi.fn() } }));

vi.mock("@/lib/api/billing", async () => {
  // Partially mocked: the formatters are the thing under test in half of these
  // cases, so only the network calls are replaced.
  const actual = await vi.importActual<typeof BillingModule>("@/lib/api/billing");
  return { ...actual, createCheckoutSession, createPortalSession, setCancellation };
});

const { PricingTable } = await import("@/components/features/billing/pricing-table");
const { BillingSection } = await import("@/components/features/billing/billing-section");
const { UsageMeter } = await import("@/components/features/billing/usage-meter");

function quota(overrides: Partial<Quota> = {}): Quota {
  return {
    metric: "tool_runs_per_day",
    limit: 25,
    used: 4,
    remaining: 21,
    period: "2026-08-11",
    resets_at: "2026-08-12T00:00:00Z",
    plan: "free",
    ...overrides,
  };
}

function plan(overrides: Partial<Plan> = {}): Plan {
  return {
    key: "pro",
    label: "Pro",
    tagline: "For the person who has to defend the number.",
    monthly_minor: 1900,
    annual_minor: 19000,
    annual_saving_minor: 3800,
    currency: "usd",
    per_seat: false,
    trial_days: 7,
    highlights: ["Unlimited tool runs"],
    cta: "Start 7-day trial",
    self_serve: true,
    checkout: true,
    current: false,
    included: false,
    features: [
      { key: "export_pdf", label: "PDF export", included: true, pitch: "A laid-out document." },
    ],
    limits: [{ metric: "tool_runs_per_day", label: "Tool runs per day", limit: null }],
    ...overrides,
  };
}

function subscription(overrides: Partial<Subscription> = {}): Subscription {
  return {
    plan: "pro",
    status: "active",
    checkout_available: true,
    seats: 1,
    cancel_at_period_end: false,
    current_period_end: "2026-09-11T00:00:00Z",
    trial_ends_at: null,
    past_due_since: null,
    grace_days_left: null,
    pending_plan: null,
    pending_interval: null,
    payment_required: false,
    ...overrides,
  };
}

function renderWith(ui: React.ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

beforeEach(() => {
  vi.clearAllMocks();
  authStatus.current = "authenticated";
  data.plans = [];
  data.subscription = null;
  data.usage = null;
});

// ── Meters ──────────────────────────────────────────────────────────────────

describe("UsageMeter", () => {
  it("shows used against limit", () => {
    render(<UsageMeter quota={quota({ used: 4, limit: 25 })} />);

    expect(screen.getByText("4/25")).toBeInTheDocument();
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "4");
  });

  it("says unlimited rather than showing an empty bar", () => {
    render(<UsageMeter quota={quota({ limit: null, remaining: null, used: 900 })} />);

    expect(screen.getByText("Unlimited")).toBeInTheDocument();
    // The crux: `null` is not zero. A bar at 0 % on an unlimited plan reads as
    // "you have nothing left".
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuetext", "Unlimited");
    expect(screen.queryByText("900/0")).not.toBeInTheDocument();
  });

  it("never divides by a zero limit", () => {
    render(<UsageMeter quota={quota({ limit: 0, used: 0, remaining: 0 })} />);

    expect(screen.getByText("0/0")).toBeInTheDocument();
  });
});

// ── Pricing ─────────────────────────────────────────────────────────────────

describe("PricingTable", () => {
  it("renders prices and limits from the API rather than its own copy", () => {
    data.plans = [
      plan({ key: "free", label: "Free", monthly_minor: 0, checkout: false, trial_days: 0 }),
      plan(),
    ];

    renderWith(<PricingTable />);

    expect(screen.getByText("$19")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Pro" })).toBeInTheDocument();
    // The limit comes from the payload, and `null` reads as Unlimited.
    expect(screen.getAllByText("Unlimited").length).toBeGreaterThan(0);
  });

  it("switches the price when the interval changes", async () => {
    data.plans = [plan()];
    renderWith(<PricingTable />);

    await userEvent.click(screen.getByRole("button", { name: "annual" }));

    expect(screen.getByText("$190")).toBeInTheDocument();
    expect(screen.getByText(/Save \$38 a year/)).toBeInTheDocument();
  });

  it("sends an anonymous visitor to signup rather than to checkout", async () => {
    authStatus.current = "anonymous";
    data.plans = [plan()];

    renderWith(<PricingTable />);

    // The plan travels with them, so the signup form opens already agreeing
    // with the button that was clicked.
    const cta = screen.getByRole("link", { name: /Start 7-day trial/ });
    expect(cta).toHaveAttribute("href", "/signup?plan=pro&interval=monthly");
    expect(createCheckoutSession).not.toHaveBeenCalled();
  });

  it("still sends a signed-out visitor to signup when billing is unconfigured", () => {
    authStatus.current = "anonymous";
    // The regression this pins: reading `checkout` before `authenticated`
    // meant an environment with no payment keys sent every visitor to the
    // resources page. Whether *this deployment* can take a card has no bearing
    // on where somebody with no account belongs.
    data.plans = [plan({ checkout: false })];

    renderWith(<PricingTable />);

    expect(screen.getByRole("link", { name: /Start 7-day trial/ })).toHaveAttribute(
      "href",
      "/signup?plan=pro&interval=monthly",
    );
  });

  it("starts checkout for a signed-in visitor", async () => {
    createCheckoutSession.mockResolvedValue({ url: "https://checkout.test/1" });
    data.plans = [plan()];

    renderWith(<PricingTable />);
    await userEvent.click(screen.getByRole("button", { name: /Start 7-day trial/ }));

    await waitFor(() =>
      expect(createCheckoutSession).toHaveBeenCalledWith({ plan: "pro", interval: "monthly" }),
    );
  });

  it("sends a plan that is not self-serve to a conversation, not a checkout", () => {
    data.plans = [
      plan({
        key: "enterprise",
        label: "Enterprise",
        monthly_minor: null,
        annual_minor: null,
        self_serve: false,
        checkout: false,
        cta: "Talk to us",
      }),
    ];

    renderWith(<PricingTable />);

    expect(screen.getByText("Custom")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Talk to us/ })).toBeInTheDocument();
  });

  it("disables a self-serve plan that has no price configured here", () => {
    // Signed in, so signup is not the answer, and there is nothing to charge
    // against. Saying so beats a button that returns a 402.
    authStatus.current = "authenticated";
    data.plans = [plan({ checkout: false })];

    renderWith(<PricingTable />);

    expect(screen.getByRole("button", { name: "Not available yet" })).toBeDisabled();
  });

  it("marks the current plan instead of selling it again", () => {
    data.plans = [plan({ current: true })];
    renderWith(<PricingTable />);

    expect(screen.getByRole("button", { name: "Your plan" })).toBeDisabled();
  });
});

// ── Billing settings ────────────────────────────────────────────────────────

describe("BillingSection", () => {
  it("shows the plan and when it renews", () => {
    data.subscription = subscription();
    data.usage = { plan: "pro", quotas: [quota({ limit: null, remaining: null })] };

    renderWith(<BillingSection />);

    expect(screen.getByText("Active")).toBeInTheDocument();
    expect(screen.getByText(/Renews on/)).toBeInTheDocument();
  });

  it("warns about a failed payment and says the plan is unchanged for now", () => {
    data.subscription = subscription({
      status: "past_due",
      past_due_since: "2026-08-09T00:00:00Z",
      grace_days_left: 5,
    });

    renderWith(<BillingSection />);

    expect(screen.getByText("We could not charge your card")).toBeInTheDocument();
    expect(screen.getByText(/unchanged for now/)).toBeInTheDocument();
    expect(screen.getByText(/5 more days/)).toBeInTheDocument();
  });

  it("counts down a trial and says it will charge, not lapse", () => {
    const endsAt = new Date(Date.now() + 3 * 86_400_000).toISOString();
    data.subscription = subscription({ status: "trialing", trial_ends_at: endsAt });

    renderWith(<BillingSection />);

    expect(screen.getByText(/3 days left in your trial/)).toBeInTheDocument();
    // The banner has to say the opposite of what it said under Stripe. That
    // trial collected no card, so doing nothing dropped you to Free; Razorpay
    // authorizes a mandate up front (D-50), so doing nothing charges you.
    // Telling someone their plan will lapse when it will renew is the worse
    // of the two ways to get this wrong.
    expect(screen.getByText(/continues automatically/)).toBeInTheDocument();
    expect(screen.getByText(/Cancel before it ends and you are not charged/)).toBeInTheDocument();
    expect(screen.queryByText(/If you do nothing you move to Free/)).not.toBeInTheDocument();
  });

  it("cancels at period end and offers to undo it", async () => {
    setCancellation.mockResolvedValue(subscription({ cancel_at_period_end: true }));
    data.subscription = subscription();

    renderWith(<BillingSection />);
    await userEvent.click(screen.getByRole("button", { name: "Cancel plan" }));

    await waitFor(() => expect(setCancellation).toHaveBeenCalledWith(true));
  });

  it("says access ends rather than renews once cancelled", () => {
    data.subscription = subscription({ cancel_at_period_end: true });

    renderWith(<BillingSection />);

    expect(screen.getByText(/Access ends on/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Resume plan" })).toBeInTheDocument();
  });

  it("hides the portal button when no payment provider is configured", () => {
    data.subscription = subscription({ checkout_available: false });

    renderWith(<BillingSection />);

    expect(screen.queryByRole("button", { name: /Manage payment/ })).not.toBeInTheDocument();
  });

  it("offers an upgrade rather than a portal on the free plan", () => {
    data.subscription = subscription({ plan: "free", status: null, current_period_end: null });

    renderWith(<BillingSection />);

    expect(screen.getByRole("link", { name: /Upgrade/ })).toHaveAttribute("href", "/pricing");
    expect(screen.queryByRole("button", { name: "Cancel plan" })).not.toBeInTheDocument();
  });
});
