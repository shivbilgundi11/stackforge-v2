"use client";

import { ArrowRightIcon, LockIcon } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { FormatOption } from "@/lib/api/exports";
import { useAuth } from "@/lib/auth/auth-provider";

/**
 * What a locked format opens (M18).
 *
 * It says what the format *is* rather than only that it is locked. "PDF
 * requires Pro" is a wall; "a PDF you can send to a client, laid out and
 * paginated" is the thing being sold, and the reader cannot decide to buy
 * something nobody described.
 *
 * Markdown is named in the footer on purpose. Sending someone away empty is
 * how a paywall becomes a bounce, and the free format really does contain the
 * whole answer.
 */

const PITCH: Record<string, string> = {
  pdf: "A laid-out, paginated document with a cover page and your share link in the footer — the version you send to a client.",
  zip: "Every file in the plan as one download: the architecture document, the diagram, the roadmap, a starter Compose file, and .cursorrules.",
  json: "The full result as structured data, with a versioned envelope — for a pipeline, a diff, or a script.",
  yaml: "The same structured data as JSON, in the format your config tooling already reads.",
  csv: "One table, ready for a spreadsheet.",
};

export function UpgradeDialog({
  format,
  onClose,
}: {
  format: FormatOption | null;
  onClose: () => void;
}) {
  const { status } = useAuth();
  const isAnonymous = status !== "authenticated";

  return (
    <Dialog open={Boolean(format)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mb-2 flex size-9 items-center justify-center rounded-md border border-line bg-surface-2 text-fg-muted">
            <LockIcon className="size-4" aria-hidden />
          </div>
          <DialogTitle>
            {format?.label} export is on {format?.required_plan}
          </DialogTitle>
          <DialogDescription>
            {format ? (PITCH[format.format] ?? "This format is available on a paid plan.") : null}
          </DialogDescription>
        </DialogHeader>

        <p className="rounded-md border border-line bg-surface-2/50 px-3 py-2.5 text-xs leading-relaxed text-fg-muted">
          Markdown export is free and always will be. It contains the whole answer — every figure,
          table, and source on this page — so nothing here is being held back from you, only
          reformatted.
        </p>

        <DialogFooter className="sm:justify-between">
          <Button variant="ghost" size="sm" onClick={onClose}>
            Not now
          </Button>
          <Button asChild size="sm">
            <Link href={isAnonymous ? "/signup" : "/settings/billing"}>
              {isAnonymous ? "Create an account" : `Upgrade to ${format?.required_plan}`}
              <ArrowRightIcon className="size-3.5" aria-hidden />
            </Link>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
