import type { Metadata } from "next";

import { BillingSection } from "@/components/features/billing/billing-section";
import { PageHeader } from "@/components/forge/page-header";

export const metadata: Metadata = {
  title: "Billing",
  description: "Your plan, what you have used, and your invoices.",
};

export default function Page() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col">
      <PageHeader
        title="Billing"
        description="Your plan, what you have used against it, and every invoice."
      />
      <BillingSection />
    </div>
  );
}
