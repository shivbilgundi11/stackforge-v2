import type { Metadata } from "next";
import { Suspense } from "react";

import { CheckoutReturn } from "@/components/features/billing/checkout-return";

/** Where Razorpay returns the browser. Never treated as proof of payment —
 *  see the note in `checkout-return.tsx`. */
export const metadata: Metadata = {
  title: "Confirming your payment",
  robots: { index: false, follow: false },
};

export default function Page() {
  // `CheckoutReturn` reads `?plan=` to know what it is waiting for, and
  // `useSearchParams` needs a boundary or the whole route opts out of static
  // rendering at build time.
  return (
    <Suspense fallback={null}>
      <CheckoutReturn />
    </Suspense>
  );
}
