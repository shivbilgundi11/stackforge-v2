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
    monthly_cents: 1900,
    annual_cents: 19000,
    annual_saving_cents: 3800,
    currency: "usd",
    per_seat: false,
    trial_days: 7,
    highlights: ["Unlimited tool runs"],
    cta: "Start 7-day trial",
    checkout: true,
    current: false,
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
      plan({ key: "free", label: "Free", monthly_cents: 0, checkout: false, trial_days: 0 }),
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

    const cta = screen.getByRole("link", { name: /Start 7-day trial/ });
    expect(cta).toHaveAttribute("href", "/signup?next=/pricing");
    expect(createCheckoutSession).not.toHaveBeenCalled();
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

  it("does not offer a buy button for a plan with no configured price", () => {
    data.plans = [
      plan({
        key: "enterprise",
        label: "Enterprise",
        monthly_cents: null,
        annual_cents: null,
        checkout: false,
        cta: "Talk to us",
      }),
    ];

    renderWith(<PricingTable />);

    expect(screen.getByText("Custom")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Talk to us/ })).toBeInTheDocument();
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

  it("counts down a trial and says what happens if you do nothing", () => {
    const endsAt = new Date(Date.now() + 3 * 86_400_000).toISOString();
    data.subscription = subscription({ status: "trialing", trial_ends_at: endsAt });

    renderWith(<BillingSection />);

    expect(screen.getByText(/3 days left in your trial/)).toBeInTheDocument();
    // The reassuring half, in the banner's own words — "nothing is deleted"
    // appears in the footer too, which is the point rather than a duplicate.
    expect(screen.getByText(/If you do nothing you move to Free/)).toBeInTheDocument();
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
