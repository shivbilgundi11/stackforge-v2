import { MarketingFooter } from "@/components/marketing/marketing-footer";
import { MarketingHeader } from "@/components/marketing/marketing-header";

/**
 * The public surface (M22).
 *
 * A distinct layout from the app shell — no sidebar, no command palette, no
 * auth guard — sharing tokens and primitives with the product so the two read
 * as one thing without sharing chrome (D-02).
 *
 * **Nothing under this group may import from `lib/api`.** The acquisition
 * surface should not have a runtime dependency on the application: these
 * pages are statically generated and must render with the API down. The one
 * sanctioned exception is the pricing page's plan fetch, which is a
 * build-time read with a static fallback.
 */
export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-bg">
      <MarketingHeader />
      <main id="content" className="flex-1">
        {children}
      </main>
      <MarketingFooter />
    </div>
  );
}
