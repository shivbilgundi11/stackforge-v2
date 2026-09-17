import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The cards branch on whether the reader has a session — a paid tier sends a
 * customer straight to the in-app upgrade page and a stranger to log in first
 * — so the tests drive that rather than standing up a real provider.
 */
const authStatus = vi.hoisted(() => ({ current: "signed-out" as string }));

vi.mock("@/lib/auth/auth-provider", () => ({
  useAuth: () => ({ status: authStatus.current, user: null, isVerified: false }),
}));

beforeEach(() => {
  authStatus.current = "signed-out";
});

const { PlanCards, orderPlans } = await import("@/components/home/sections/plan-cards");
import type { Plan } from "@/lib/api/billing";
import { localeFor } from "@/lib/currency/display-currency";
import { PLAN_CURRENCY, PLAN_OUTLINES } from "@/lib/marketing/plans";

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
 * The unreachable-catalog state is third, and it is covered separately at the
 * bottom of this file. It is a real state at build time, and what it must not
 * do is quietly become a different page — either by dropping the plans or by
 * rendering them some second way that nobody looks at.
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

  it("sends a signed-in customer straight to the in-app upgrade page", () => {
    // The whole point of the change: somebody who already has an account and
    // is reading the marketing site should not be asked to sign up again, and
    // should not be paying on the marketing site either.
    authStatus.current = "authenticated";
    render(<PlanCards plans={[PRO]} />);

    expect(screen.getByRole("link", { name: "Start" })).toHaveAttribute(
      "href",
      "/upgrade?plan=pro",
    );
  });

  it("sends a signed-out visitor to log in, carrying the plan", () => {
    render(<PlanCards plans={[PRO]} />);

    const href = screen.getByRole("link", { name: "Start" }).getAttribute("href") ?? "";
    expect(href.startsWith("/login")).toBe(true);

    const next = new URL(href, "http://x").searchParams.get("next");
    expect(next).toBe("/upgrade?plan=pro");
  });

  it("treats a session that has not resolved yet as signed out", () => {
    // `loading` is the first render on every cold load. Guessing the other way
    // would link a stranger at a page that bounces them; guessing this way
    // costs a signed-in reader nothing, because the login screen forwards them
    // to the same `next`.
    authStatus.current = "loading";
    render(<PlanCards plans={[PRO]} />);

    expect(screen.getByRole("link", { name: "Start" }).getAttribute("href")).toContain("/login");
  });

  it("never routes a priced plan through checkout on the marketing site", () => {
    // Paying is an in-app act. A card that linked at /checkout would put the
    // payment wall behind the marketing chrome, where there is no session to
    // charge against.
    for (const status of ["authenticated", "signed-out"]) {
      authStatus.current = status;
      const { unmount } = render(<PlanCards plans={[PRO, TEAM]} />);

      for (const link of screen.getAllByRole("link")) {
        expect(link.getAttribute("href") ?? "").not.toContain("/checkout");
      }
      unmount();
    }
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
 * so a backend restart emptied the page that exists to name the tiers and what
 * they cost. It now renders `PLAN_OUTLINES`, generated from the backend's own
 * plan module and diffed against it by `npm run plans:check`.
 *
 * Nothing here asserts a literal price. The snapshot is the second place a
 * price lives, and a test hardcoding one would be the third — the check script
 * is what holds it to the billing configuration, and these assert only that
 * the fallback renders the snapshot rather than something invented.
 */
describe("PlanCards with no catalog", () => {
  it("still names every tier and what is in it", () => {
    render(<PlanCards plans={null} />);

    for (const outline of PLAN_OUTLINES) {
      expect(
        screen.getByRole("heading", { name: outline.label }),
        `the ${outline.label} tier disappears when the catalog is unreachable`,
      ).toBeInTheDocument();

      // One highlight per tier proves the feature list renders rather than
      // just the heading. Asserting all nineteen would make this a copy test.
      expect(screen.getByText(outline.highlights[0]!)).toBeInTheDocument();
    }
  });

  it("shows each tier's amount, formatted from the snapshot", () => {
    render(<PlanCards plans={null} />);

    for (const outline of PLAN_OUTLINES) {
      if (outline.monthly_minor === null) continue;
      const expected = new Intl.NumberFormat(localeFor(PLAN_CURRENCY), {
        style: "currency",
        currency: PLAN_CURRENCY.toUpperCase(),
        maximumFractionDigits: 0,
      }).format(outline.monthly_minor / 100);

      expect(
        screen.getByText(expected),
        `${outline.label} shows no amount when the catalog is unreachable`,
      ).toBeInTheDocument();
    }
  });

  it("renders the snapshot through the same path as a live plan", () => {
    // The failure this guards is the fallback drifting into a second layout
    // that only appears during an outage, when nobody is looking at it.
    const { container, unmount } = render(<PlanCards plans={null} />);
    const offline = container.innerHTML;
    unmount();

    const live = PLAN_OUTLINES.map((outline) =>
      plan({ ...outline, currency: PLAN_CURRENCY, highlights: [...outline.highlights] }),
    );
    const { container: second } = render(<PlanCards plans={live} />);

    // Identical but for the footnote, which is the one thing that should
    // differ: it says where the amounts came from.
    const strip = (html: string) => html.replace(/Prices [^<]*/, "");
    expect(strip(second.innerHTML)).toBe(strip(offline));
  });

  it("says where the amounts came from", () => {
    render(<PlanCards plans={null} />);
    expect(screen.getByText(/checked against the configuration/i)).toBeInTheDocument();
  });
});
