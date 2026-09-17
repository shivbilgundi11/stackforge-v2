import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { PlanCards, orderPlans } from "@/components/home/sections/plan-cards";
import type { Plan } from "@/lib/api/billing";

/**
 * The plan cards, which the home page and `/pricing` both render.
 *
 * What is worth asserting here is not that the component renders — it is the
 * two rules that make it safe to have a price on a marketing page at all:
 *
 *   1. **Every configured plan appears.** Filtering to a known list is the
 *      obvious implementation and the dangerous one: a tier added to the
 *      billing configuration would be charged by the checkout and never shown,
 *      and nothing would fail. The ordering below is a preference, so an
 *      unrecognised key has to survive it.
 *   2. **No amount is written down.** Every figure comes from the plan, so a
 *      plan priced differently renders differently. A test that asserted a
 *      literal price would be the second place a price lives, which is the
 *      failure the component exists to prevent.
 *
 * The unreachable-catalog state is third: it is a real state at build time, and
 * it must not silently render a card with a missing or remembered price.
 */

function plan(over: Partial<Plan> & Pick<Plan, "key" | "label">): Plan {
  return {
    tagline: `${over.label} tagline`,
    monthly_minor: 0,
    annual_minor: null,
    annual_saving_minor: 0,
    currency: "usd",
    prices: [],
    per_seat: false,
    trial_days: 0,
    highlights: [],
    cta: "Start",
    self_serve: true,
    ...over,
  } as Plan;
}

const FREE = plan({ key: "free", label: "Free", monthly_minor: 0 });
const PRO = plan({ key: "pro", label: "Pro", monthly_minor: 2900 });
const TEAM = plan({ key: "team", label: "Team", monthly_minor: 4900, per_seat: true });
const ENTERPRISE = plan({
  key: "enterprise",
  label: "Enterprise",
  monthly_minor: null,
  self_serve: false,
  cta: "Talk to sales",
});

describe("orderPlans", () => {
  it("puts the preferred tiers first, whatever order the API returns them in", () => {
    const ordered = orderPlans([TEAM, FREE, PRO]);
    expect(ordered.map((p) => p.key)).toEqual(["free", "pro", "team"]);
  });

  it("keeps a plan whose key it does not recognise, after the ones it does", () => {
    const ordered = orderPlans([ENTERPRISE, PRO, FREE]);
    expect(ordered.map((p) => p.key)).toEqual(["free", "pro", "enterprise"]);
  });

  it("treats a missing catalog as empty rather than throwing", () => {
    expect(orderPlans(null)).toEqual([]);
  });
});

describe("PlanCards", () => {
  it("renders every plan the API configures, including an unrecognised tier", () => {
    render(<PlanCards plans={[PRO, ENTERPRISE, FREE, TEAM]} />);

    for (const label of ["Free", "Pro", "Team", "Enterprise"]) {
      expect(
        screen.getByRole("heading", { name: label }),
        `the ${label} plan is configured but not shown`,
      ).toBeInTheDocument();
    }
  });

  it("renders amounts from the plan rather than from this file", () => {
    render(<PlanCards plans={[PRO]} />);
    // $29.00 from 2900 minor units — the formatting is the assertion, not the
    // number: a plan repriced in the billing config renders the new figure.
    expect(screen.getByText("$29")).toBeInTheDocument();
  });

  it("says a plan without a monthly price is a conversation", () => {
    render(<PlanCards plans={[ENTERPRISE]} />);
    expect(screen.getByText("Talk to us")).toBeInTheDocument();
    expect(screen.getByText("Custom")).toBeInTheDocument();
  });

  it("labels a per-seat plan as per seat", () => {
    render(<PlanCards plans={[TEAM]} />);
    expect(screen.getByText("Per seat / month")).toBeInTheDocument();
  });

  it("caps the feature list only when asked to", () => {
    const wordy = plan({
      key: "pro",
      label: "Pro",
      monthly_minor: 2900,
      highlights: ["one", "two", "three", "four"],
    });

    const { unmount } = render(<PlanCards plans={[wordy]} />);
    expect(screen.getByText("four")).toBeInTheDocument();
    unmount();

    render(<PlanCards plans={[wordy]} maxHighlights={2} />);
    expect(screen.getByText("two")).toBeInTheDocument();
    expect(screen.queryByText("three")).not.toBeInTheDocument();
  });

  it("links the free tier at sign-up, not at the contact page", () => {
    // The API reports `self_serve: false` for Free, because the flag mirrors
    // whether the tier goes through checkout and Free has nothing to charge.
    // Keying the link on it sent "Get started" to /contact.
    render(
      <PlanCards
        plans={[
          plan({
            key: "free",
            label: "Free",
            monthly_minor: 0,
            self_serve: false,
            cta: "Get started",
          }),
        ]}
      />,
    );
    expect(screen.getByRole("link", { name: "Get started" })).toHaveAttribute("href", "/signup");
  });

  it("sends a plan with no price to the contact page", () => {
    render(<PlanCards plans={[ENTERPRISE]} />);
    expect(screen.getByRole("link", { name: "Talk to sales" })).toHaveAttribute("href", "/contact");
  });
});

/**
 * The unreachable catalog.
 *
 * This used to replace the grid with a single line saying prices were loading,
 * which protected the two charged amounts by throwing away four tiers and
 * their feature lists — on the page whose job is to name them. The fallback
 * now keeps everything that is not a price. Both halves of that need a test:
 * the plans have to survive, and no amount may.
 */
describe("PlanCards with no catalog", () => {
  it("still names every tier and what is in it", () => {
    render(<PlanCards plans={null} />);

    for (const label of ["Free", "Pro", "Team", "Enterprise"]) {
      expect(
        screen.getByRole("heading", { name: label }),
        `the ${label} tier disappears when the catalog is unreachable`,
      ).toBeInTheDocument();
    }

    // One highlight per tier, to prove the feature lists render rather than
    // just the headings. Asserting all nineteen would make this a copy test.
    expect(screen.getByText("25 tool runs a day")).toBeInTheDocument();
    expect(screen.getByText("Unlimited tool runs")).toBeInTheDocument();
    expect(screen.getByText("Shared workspace, roles, and approvals")).toBeInTheDocument();
    expect(screen.getByText("SSO and an audit trail")).toBeInTheDocument();
  });

  it("withholds the charged amounts rather than remembering them", () => {
    render(<PlanCards plans={null} />);

    // The failure this guards is a card rendering a stale or blank amount that
    // reads as a real price. No currency symbol may appear in any locale.
    expect(screen.queryByText(/[$₹€£]/)).not.toBeInTheDocument();
    expect(screen.getAllByText("Price unavailable")).toHaveLength(2);
    expect(screen.getByText(/temporarily unavailable/i)).toBeInTheDocument();
  });

  it("says Free is free, because that is not a quote", () => {
    // Nothing is charged for it, so there is no figure the checkout could
    // contradict — and a Free card showing an em dash reads as broken.
    render(<PlanCards plans={null} />);
    expect(screen.getByText("Free", { selector: "p" })).toBeInTheDocument();
    expect(screen.getByText("Forever")).toBeInTheDocument();
  });
});
