/**
 * The shape of the plan line-up, without a single amount in it.
 *
 * ## Why this file exists
 *
 * `getPlansStatic()` returns `null` when `GET /billing/plans` cannot be
 * reached, and until now that took the whole plan grid down with it: the
 * pricing page rendered one paragraph saying prices were loading, and a reader
 * arriving during a backend restart saw no tiers, no feature lists and nothing
 * to compare. The page that exists to sell the plans stopped naming them.
 *
 * The rule it was protecting is still right, but it was drawn around the wrong
 * thing. What must never be guessed at is a **price** — a figure the checkout
 * will not honour is a trust problem, not a copy problem. Which tiers exist,
 * what each one is for and what is in it are not prices. They are static copy
 * that lives in `backend/app/data/plans.py`, changes when someone edits that
 * file, and is safe to mirror.
 *
 * So this is the structure, and only the structure. There is no
 * `monthly_minor` here and there must never be one: `price` below says how a
 * card should *describe* its cost, never what it costs.
 *
 * ## It is a mirror, so it can drift
 *
 * Mirrored from `backend/app/data/plans.py` — verified 2026-09-17. It is only
 * ever rendered when the API is unreachable; the moment the catalog answers,
 * the API's own plans replace it wholesale (see `plan-cards.tsx`). Drift here
 * therefore shows up as an out-of-date fallback rather than as a wrong page,
 * and `e2e/marketing.spec.ts` checks the live grid against the API. Still: if
 * you change a tagline, a highlight or a CTA in `data/plans.py`, change it
 * here in the same commit.
 */

export type PlanOutline = {
  key: string;
  label: string;
  tagline: string;
  /**
   * How the card describes its cost when there is no catalog to read one from.
   *
   *   - `free` — the word "Free". Not a quote: nothing is charged, so there is
   *     no figure the checkout could disagree with.
   *   - `charged` — this tier has a price and we do not know it right now. The
   *     card withholds the amount and says so.
   *   - `custom` — there is no list price to withhold; it is a conversation.
   */
  price: "free" | "charged" | "custom";
  per_seat: boolean;
  highlights: string[];
  cta: string;
};

export const PLAN_OUTLINES: readonly PlanOutline[] = [
  {
    key: "free",
    label: "Free",
    tagline: "Every tool, every catalog page, no card.",
    price: "free",
    per_seat: false,
    highlights: [
      "Every tool and every workflow",
      "25 tool runs a day",
      "Markdown export on every result",
      "One saved stack",
    ],
    cta: "Get started",
  },
  {
    key: "pro",
    label: "Pro",
    tagline: "For the person who has to defend the number.",
    price: "charged",
    per_seat: false,
    highlights: [
      "Unlimited tool runs",
      "100 AI-assisted runs a day",
      "PDF, JSON, YAML, CSV, and bundle export",
      "20 projects and unlimited saved stacks",
      "Price-change and deprecation alerts",
      "The full template library",
    ],
    cta: "Upgrade to Pro",
  },
  {
    key: "team",
    label: "Team",
    tagline: "One shared view of what the team has decided.",
    price: "charged",
    per_seat: true,
    highlights: [
      "Everything in Pro, per seat",
      "300 AI-assisted runs a day",
      "Shared workspace, roles, and approvals",
      "Unlimited projects",
      "500 exports a month",
    ],
    cta: "Choose Team",
  },
  {
    key: "enterprise",
    label: "Enterprise",
    tagline: "Your procurement process, our numbers.",
    price: "custom",
    per_seat: true,
    highlights: [
      "Everything in Team, without the ceilings",
      "Custom AI allowance",
      "SSO and an audit trail",
      "A named contact",
    ],
    cta: "Talk to us",
  },
];
