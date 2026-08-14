import type { Metadata } from "next";

import { CheckoutReturn } from "@/components/features/billing/checkout-return";

/** Where Razorpay returns the browser. Never treated as proof of payment —
 *  see the note in `checkout-return.tsx`. */
export const metadata: Metadata = {
  title: "Confirming your payment",
  robots: { index: false, follow: false },
};

export default function Page() {
  return <CheckoutReturn />;
}
