"use client";

import { formatLimit, metricLabel, usagePercent, usageTone, type Quota } from "@/lib/api/billing";
import { cn } from "@/lib/utils";

/**
 * One meter (M20).
 *
 * The bar shifts colour at 70 % and again at 100 %, which is the whole reason
 * it exists: a gate has to be *seen approaching* to convert. A meter that only
 * changes once the limit is reached has told the reader nothing they could
 * still act on.
 *
 * An unlimited quota renders as a flat rail with the word rather than a bar at
 * 0 %. A permanently empty progress bar reads as broken, and "0 of unlimited"
 * is not a fact anyone needs.
 */
export function UsageMeter({
  quota,
  className,
  compact = false,
}: {
  quota: Quota;
  className?: string;
  compact?: boolean;
}) {
  const unlimited = quota.limit === null || quota.limit === undefined;
  const percent = usagePercent(quota);
  const tone = usageTone(quota);

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <div className="flex items-baseline justify-between gap-2">
        <span
          className={cn("truncate font-medium text-fg", compact ? "text-[11.5px]" : "text-[13px]")}
        >
          {metricLabel(quota.metric)}
        </span>
        <span
          className={cn(
            "shrink-0 font-mono text-fg-subtle tabular-nums",
            compact ? "text-[11px]" : "text-xs",
          )}
        >
          {unlimited ? formatLimit(quota.limit) : `${quota.used}/${quota.limit}`}
        </span>
      </div>

      <div
        className="h-1 w-full overflow-hidden rounded-full bg-surface-3"
        role="progressbar"
        aria-label={metricLabel(quota.metric)}
        aria-valuenow={unlimited ? undefined : quota.used}
        aria-valuemin={0}
        aria-valuemax={unlimited ? undefined : (quota.limit ?? undefined)}
        aria-valuetext={unlimited ? "Unlimited" : `${quota.used} of ${quota.limit} used`}
      >
        {unlimited ? null : (
          <div
            className={cn(
              "h-full rounded-full transition-[width] duration-300",
              tone === "ember" && "bg-ember",
              tone === "warning" && "bg-warning",
              tone === "danger" && "bg-danger",
            )}
            style={{ width: `${percent}%` }}
          />
        )}
      </div>

      {!compact && quota.resets_at ? (
        <p className="text-[11px] text-fg-subtle">
          Resets{" "}
          {new Date(quota.resets_at).toLocaleString(undefined, {
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </p>
      ) : null}
    </div>
  );
}
