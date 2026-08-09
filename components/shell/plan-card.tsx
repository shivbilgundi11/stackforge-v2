"use client";

import Link from "next/link";

import { cn } from "@/lib/utils";

/**
 * Usage against quota, in the sidebar footer.
 *
 * The gate has to be visible to convert — a user who never sees the limit
 * approaching never upgrades for it. Placement here rather than buried in
 * billing settings is deliberate.
 *
 * Wired to real data in M20; the shape is fixed now so the surface exists.
 */
export function PlanCard({
  plan = "Free",
  used = 2,
  limit = 5,
}: {
  plan?: string;
  used?: number;
  limit?: number;
}) {
  const pct = Math.min(100, Math.round((used / limit) * 100));
  const tone = pct >= 100 ? "danger" : pct >= 70 ? "warning" : "ember";

  return (
    <div className="rounded-md border border-line bg-surface p-2.5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11.5px] font-medium text-fg">{plan} plan</span>
        <span className="font-mono text-[11px] text-fg-subtle tabular-nums">
          {used}/{limit}
        </span>
      </div>

      <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-surface-3">
        <div
          className={cn(
            "h-full rounded-full transition-[width] duration-300",
            tone === "ember" && "bg-ember",
            tone === "warning" && "bg-warning",
            tone === "danger" && "bg-danger",
          )}
          style={{ width: `${pct}%` }}
        />
      </div>

      <p className="mt-1.5 text-[10.5px] leading-snug text-fg-subtle">
        Tool runs today. Resets at midnight UTC.
      </p>

      <Link
        href="/pricing"
        className="mt-2 inline-block text-[11px] font-medium text-ember hover:text-ember-hover"
      >
        Upgrade for unlimited →
      </Link>
    </div>
  );
}
