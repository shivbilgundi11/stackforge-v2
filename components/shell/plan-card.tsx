"use client";

import Link from "next/link";

import { formatLimit, usagePercent, usageTone } from "@/lib/api/billing";
import { useUsage } from "@/lib/api/hooks";
import { cn } from "@/lib/utils";

/**
 * Usage against quota, in the sidebar footer.
 *
 * The gate has to be visible to convert — a user who never sees the limit
 * approaching never upgrades for it. Placement here rather than buried in
 * billing settings is deliberate.
 *
 * Wired to `GET /billing/usage` in M20. It shows the run counter, which is the
 * meter that moves while someone is working; the other five live on the billing
 * page, where there is room to explain them.
 *
 * Renders nothing while loading rather than a placeholder: this sits at the
 * bottom of the sidebar, and a skeleton that resolves into a bar is more
 * movement than a number nobody was waiting for deserves.
 */
export function PlanCard() {
  const usage = useUsage();

  const quota = usage.data?.quotas.find((row) => row.metric === "tool_runs_per_day");
  if (!quota) return null;

  const plan = usage.data?.plan ?? "free";
  const unlimited = quota.limit === null || quota.limit === undefined;
  const percent = usagePercent(quota);
  const tone = usageTone(quota);

  return (
    <div className="rounded-md border border-line bg-surface p-2.5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11.5px] font-medium text-fg capitalize">{plan} plan</span>
        <span className="font-mono text-[11px] text-fg-subtle tabular-nums">
          {unlimited ? formatLimit(quota.limit) : `${quota.used}/${quota.limit}`}
        </span>
      </div>

      {unlimited ? null : (
        <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-surface-3">
          <div
            className={cn(
              "h-full rounded-full transition-[width] duration-300",
              tone === "ember" && "bg-ember",
              tone === "warning" && "bg-warning",
              tone === "danger" && "bg-danger",
            )}
            style={{ width: `${percent}%` }}
          />
        </div>
      )}

      <p className="mt-1.5 text-[10.5px] leading-snug text-fg-subtle">
        {unlimited ? "Tool runs. No daily cap." : "Tool runs today. Resets at midnight UTC."}
      </p>

      {unlimited ? null : (
        <Link
          href="/pricing"
          className="mt-2 inline-block text-[11px] font-medium text-ember hover:text-ember-hover"
        >
          Upgrade for unlimited →
        </Link>
      )}
    </div>
  );
}
