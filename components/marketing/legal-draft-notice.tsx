import { AlertTriangleIcon } from "lucide-react";

/**
 * The banner on both legal pages.
 *
 * M22 flags counsel review as a **calendar dependency, not a build task** —
 * three to five business days that cannot start the week of launch. Until
 * that review lands, these pages describe what the product actually does with
 * data, which is verifiable, and say plainly that they are not yet the
 * binding instrument. Publishing unreviewed text as though it were reviewed
 * would be the worst version of this page.
 */
export function LegalDraftNotice() {
  return (
    <div
      role="note"
      className="flex gap-3 rounded-[var(--radius)] border border-warning-line bg-warning-quiet p-4"
    >
      <AlertTriangleIcon className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden />
      <div className="text-[13px] leading-relaxed text-fg-muted">
        <p className="font-semibold text-fg">Draft — pending legal review</p>
        <p className="mt-1 max-w-[70ch]">
          This document describes how the product currently behaves and is accurate to the
          implementation, but it has not yet been reviewed by counsel and is not in force. It will
          be replaced by the reviewed version before launch.
        </p>
      </div>
    </div>
  );
}
