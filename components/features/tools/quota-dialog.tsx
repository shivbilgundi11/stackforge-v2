"use client";

import { ArrowRightIcon, GaugeIcon } from "lucide-react";
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
import type { ApiError } from "@/lib/api/errors";

/**
 * The 402.
 *
 * Shows the real numbers the backend sent. "You have hit your limit" with no
 * figures is a dead end; "5 of 5 runs used, resets at 00:00 UTC" lets the
 * reader decide between waiting and paying, which is the only decision the
 * dialog exists to support. Every caller that can reach this has an account —
 * the shell is account-only — so the way out is an upgrade, not a signup.
 */

type QuotaDetails = {
  limit: number;
  used: number;
  remaining: number;
  resets_at: string;
  plan: string;
};

export function QuotaDialog({ error, onClose }: { error: ApiError | null; onClose: () => void }) {
  const quota = error?.details?.["quota"] as QuotaDetails | undefined;

  const resetsAt = quota?.resets_at ? new Date(quota.resets_at) : null;

  return (
    <Dialog open={Boolean(error)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mb-2 flex size-9 items-center justify-center rounded-md border border-line bg-surface-2 text-fg-muted">
            <GaugeIcon className="size-4" aria-hidden />
          </div>
          <DialogTitle>Daily limit reached</DialogTitle>
          <DialogDescription>
            {quota
              ? `You have used all ${quota.limit} runs available on the ${quota.plan} plan today.`
              : (error?.message ?? "You have reached your run limit.")}
          </DialogDescription>
        </DialogHeader>

        {quota ? (
          <dl className="grid grid-cols-3 divide-x divide-line overflow-hidden rounded-md border border-line bg-surface">
            <Figure label="Used" value={String(quota.used)} />
            <Figure label="Limit" value={String(quota.limit)} />
            <Figure
              label="Resets"
              value={
                resetsAt
                  ? resetsAt.toLocaleTimeString(undefined, {
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : "—"
              }
            />
          </dl>
        ) : null}

        <DialogFooter className="sm:justify-between">
          <Button variant="ghost" size="sm" onClick={onClose}>
            Not now
          </Button>
          <Button asChild size="sm">
            <Link href="/settings/billing">
              Upgrade
              <ArrowRightIcon className="size-3.5" aria-hidden />
            </Link>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Figure({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1 px-3 py-2.5">
      <dt className="text-[11px] font-medium tracking-[0.05em] text-fg-muted uppercase">{label}</dt>
      <dd className="text-lg font-medium text-fg tabular-nums">{value}</dd>
    </div>
  );
}
