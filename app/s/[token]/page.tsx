import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { SharedResult } from "@/components/features/exports/shared-result";
import { Button } from "@/components/ui/button";
import { getShared } from "@/lib/api/exports";

/**
 * The public share page (M18).
 *
 * Server-rendered and outside `(app)`, so it gets none of the shell: no
 * sidebar, no command palette, no navigation back into a product the reader
 * has no account for. `Workflows/Phase-9` is explicit that the only route out
 * of this page is the "build your own" call to action, and the cheapest way to
 * honour that is to not have the shell in the first place.
 *
 * Three properties this file is responsible for:
 *
 *   * **`noindex`, with no opt-in.** A capability URL in a search index is not
 *     a capability. The API sends `X-Robots-Tag` as well, for the crawler that
 *     reads the payload URL out of the network log rather than the page.
 *   * **404 for every dead state.** Revoked, expired, and never-existed all
 *     produce the same `notFound()`, because distinguishing them tells a former
 *     recipient that the thing they lost access to is still there.
 *   * **No owner identity.** There is none in the payload to render — see
 *     `SharePayloadOut`, which has no field for one.
 */

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  robots: { index: false, follow: false, nocache: true },
};

export default async function SharedPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const payload = await getShared(token);
  if (!payload) notFound();

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-3xl flex-col gap-6 px-5 py-10">
      <header className="flex flex-col gap-1.5 border-b border-line pb-5">
        <p className="text-[11px] font-medium tracking-[0.08em] text-fg-subtle uppercase">
          Shared from StackForge
        </p>
        <h1 className="font-serif text-3xl leading-tight text-fg">{payload.title}</h1>
        <p className="text-sm text-fg-muted">{payload.subtitle}</p>
        {payload.expires_at ? (
          <p className="text-xs text-fg-subtle">
            This link expires {new Date(payload.expires_at).toLocaleDateString()}.
          </p>
        ) : null}
      </header>

      <SharedResult payload={payload} />

      {/* The whole reason this page is built. `PRD.md` §24 makes the shared URL
          a retention mechanic: the recipient lands here and is prompted to run
          their own. */}
      <aside className="mt-4 flex flex-col items-start gap-3 rounded-md border border-line bg-surface-2/50 px-5 py-5">
        <h2 className="text-[15px] font-semibold text-fg">Plan your own stack</h2>
        <p className="max-w-prose text-sm leading-relaxed text-fg-muted">
          This was produced by StackForge — costs, comparisons, and architectures computed from a
          hand-verified catalog, with every figure traceable to the date its source was checked.
          Running your own takes about a minute and does not need an account.
        </p>
        <Button asChild size="sm">
          <Link href="/">Build your own</Link>
        </Button>
      </aside>

      <footer className="mt-auto pt-6 text-[11px] text-fg-subtle">
        Shared {new Date(payload.created_at).toLocaleDateString()}. The owner can revoke this link
        at any time.
      </footer>
    </main>
  );
}
