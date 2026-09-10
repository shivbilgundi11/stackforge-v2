import type { Metadata } from "next";
import Link from "next/link";
import { CompassIcon } from "lucide-react";

import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Page not found",
  // A 404 has nothing to offer a search index, and one that gets crawled
  // competes with the page the visitor was actually looking for.
  robots: { index: false, follow: true },
};

/**
 * The root 404.
 *
 * Renders inside the root layout with no shell around it, which is the point:
 * an unmatched URL can be reached signed in or signed out, and a sidebar the
 * visitor has no session for is worse than no sidebar at all. The two links
 * out cover both cases without needing to know which one applies.
 */
export default function NotFound() {
  return (
    <main className="flex min-h-svh flex-col items-center justify-center bg-bg px-5 py-14">
      <div className="flex w-full max-w-[46ch] flex-col items-center text-center">
        <span className="flex size-9 items-center justify-center rounded-full bg-surface-2 text-fg-muted">
          <CompassIcon className="size-4.5" aria-hidden />
        </span>

        <p className="mt-4 font-mono text-[11px] tracking-[0.12em] text-fg-subtle uppercase">
          Error 404
        </p>
        <h1 className="mt-2 text-[15.5px] font-semibold text-balance text-fg">
          We could not find that page.
        </h1>
        <p className="mt-2 text-[13.5px] leading-relaxed text-fg-muted">
          The link may be out of date, or the address may have a typo in it.
        </p>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
          <Button asChild size="sm">
            <Link href="/">Back to home</Link>
          </Button>
          <Button asChild size="sm" variant="outline">
            <Link href="/dashboard">Open the workbench</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
