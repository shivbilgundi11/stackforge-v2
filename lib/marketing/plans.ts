import snapshot from "./plans.generated.json";

/**
 * The plan line-up, snapshotted from the configuration the checkout charges
 * from.
 *
 * ## Why this file exists
 *
 * `getPlansStatic()` returns `null` when `GET /billing/plans` cannot be
 * reached, and that took the whole plan grid down with it: the pricing page
 * rendered one paragraph saying prices were loading, so a reader arriving
 * during a backend restart saw no tiers, no feature lists and no amounts. The
 * page that exists to sell the plans stopped naming them, and stopped naming
 * their prices.
 *
 * The rule it was protecting is the right one — **a price the checkout will
 * not honour is a trust problem, not a copy problem** — but "never write a
 * price down" is only one way to enforce it, and it enforces it by having no
 * price to be wrong. The other way is to write the price down and make drift
 * impossible to commit. That is what this file is.
 *
 * ## It is generated, and it is checked
 *
 * `plans.generated.json` is written by `npm run plans:snapshot`, which imports
 * `backend/app/data/plans.py` — the same module `GET /billing/plans` renders
 * from, static enough to read with no server and no database. `npm run
 * plans:check` regenerates it and fails the build if a single field differs,
 * naming the field; it runs as part of `npm run check`.
 *
 * So the amounts below are not remembered prices. They are the same prices,
 * re-derived on every check, and they cannot go stale without CI saying so.
 * Do not hand-edit the JSON — change `data/plans.py` and re-run the snapshot.
 *
 * ## What is safe here, and what would not be
 *
 * Every field is static configuration. What must never move into this file is
 * anything *computed per caller* — a proration, a seat total, a discount, a
 * currency picked from the viewer's settings. Those depend on state this file
 * cannot see, so a snapshot of one would be a guess rather than a copy. The
 * marketing site only ever shows the list price, which is why the list price
 * is all that is here.
 *
 * It is also only ever *rendered* when the API is unreachable: the moment the
 * catalog answers, the API's own plans replace it wholesale. See
 * `components/home/sections/plan-cards.tsx`.
 */

export type PlanOutline = {
  key: string;
  label: string;
  tagline: string;
  /**
   * Minor units of {@link PLAN_CURRENCY} — paise. `null` means the tier has no
   * list price at all, which is Enterprise: not a price being withheld, but a
   * conversation. `0` is the free tier.
   */
  monthly_minor: number | null;
  per_seat: boolean;
  highlights: string[];
  cta: string;
};

/**
 * The currency every `monthly_minor` is denominated in, mirroring
 * `plans.CURRENCY` on the backend. It is the currency the card is actually
 * debited in, not a display preference: the marketing site does not offer the
 * currency toggle the signed-in app does, so there is only ever one to show.
 */
export const PLAN_CURRENCY: string = snapshot.currency;

export const PLAN_OUTLINES: readonly PlanOutline[] = snapshot.plans;
