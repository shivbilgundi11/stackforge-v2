import type { Metadata } from "next";

import { PaymentWall } from "@/components/features/billing/payment-wall";

/**
 * The payment wall.
 *
 * Inside the app shell rather than the auth layout: the sidebar stays usable
 * on purpose. Every tool is reachable at the free tier while this screen is up
 * (D-17), and a full-page takeover would tell a hesitating buyer that declining
 * costs them the product.
 */
export const metadata: Metadata = {
  title: "Complete your subscription",
  robots: { index: false, follow: false },
};

export default function Page() {
  return <PaymentWall />;
}
