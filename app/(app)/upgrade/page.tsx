import { Suspense } from "react";
import type { Metadata } from "next";

import { PricingTable } from "@/components/features/billing/pricing-table";

/**
 * Compare the plans and buy one, without leaving the app.
 *
 * ## Why this route exists
 *
 * `PricingTable` has always been able to do this — it reads the plan catalog,
 * toggles the interval, knows which tier the caller already has, and its buy
 * button opens the same Razorpay mandate the payment wall does. What it did
 * not have was a route. It was the old `/pricing` page, and when the marketing
 * site was rebuilt that URL moved to the public surface, leaving the component
 * mounted nowhere.
 *
 * So the upgrade path went through the marketing site: Settings → Billing
 * pointed "Upgrade" at `/pricing`, which took a signed-in customer out of the
 * product to a page selling it to them, whose only call to action was to sign
 * up for an account they already had. The one in-app payment screen,
 * `/checkout`, redirects to the dashboard unless money is already owed — so
 * nobody on the free tier could reach a payment screen at all.
 *
 * This is that screen. `/checkout` keeps its own job, which is a different
 * one: it collects on a debt that already exists — a plan chosen at signup and
 * never paid for, or a subscription past its grace period — and it is where
 * `AuthGuard` sends someone who owes. This route is for a customer who owes
 * nothing and is choosing to spend money, which is a decision, not a blocker,
 * and wants the comparison next to it.
 *
 * ## The plan can be named in the URL
 *
 * `/upgrade?plan=pro&interval=annual` preselects, which is what the marketing
 * page's plan cards link to so a decision made out there survives the trip in.
 * It preselects rather than opening the payment sheet on arrival: a modal that
 * appears before the page behind it has been read is one people dismiss on
 * reflex, and dismissing this one costs the sale. The choice is one click away
 * and already made for them.
 */
export const metadata: Metadata = {
  title: "Upgrade",
  description: "Compare the plans and change yours.",
  // A signed-in-only surface, and one whose content is the public pricing page
  // said twice. Indexing it would compete with /pricing for the same query.
  robots: { index: false, follow: false },
};

export default function Page() {
  // `PricingTable` reads the preselected plan from the query string, which
  // needs `useSearchParams`, which needs a suspense boundary to keep the route
  // prerenderable. The fallback is `null` rather than a skeleton because the
  // component has its own loading state for the catalog behind it.
  return (
    <Suspense fallback={null}>
      <PricingTable />
    </Suspense>
  );
}
