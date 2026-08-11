"use client";

import { useQuery } from "@tanstack/react-query";
import { AlertTriangleIcon, LoaderIcon } from "lucide-react";
import { useEffect, useRef } from "react";
import toast from "react-hot-toast";

import { downloadExport, getExport, type ExportRecord } from "@/lib/api/exports";
import { qk } from "@/lib/api/query-keys";

/**
 * The queued-bundle path (M18).
 *
 * Only large bundles are queued — a 2 KB Markdown export goes through the
 * request that asked for it — so most of the time this renders nothing and
 * polls nothing. It exists because the alternative is a button that appears to
 * do nothing for twenty seconds.
 *
 * The download fires once, guarded by a ref rather than by the query's state.
 * React Query will re-run effects on a refetch, a window focus, or a
 * remount, and each of those would otherwise hand the user another copy of the
 * same file.
 */
export function ExportProgress({
  record,
  onSettled,
}: {
  record: ExportRecord | null;
  onSettled?: (record: ExportRecord) => void;
}) {
  const delivered = useRef<string | null>(null);
  const pending = record?.status === "pending";

  const polled = useQuery({
    queryKey: qk.exports.detail(record?.id ?? "none"),
    queryFn: () => getExport(record!.id),
    enabled: pending,
    // Two seconds: fast enough that a bundle finishing in five does not feel
    // stalled, slow enough that a minute-long build is thirty requests rather
    // than six hundred.
    refetchInterval: (query) => (query.state.data?.status === "pending" ? 2000 : false),
  });

  const current = polled.data ?? record;

  useEffect(() => {
    if (!current || current.status !== "ready") return;
    if (delivered.current === current.id) return;
    delivered.current = current.id;
    onSettled?.(current);
    void downloadExport(current).catch(() => toast.error("That download failed."));
  }, [current, onSettled]);

  if (!current || current.status === "ready") return null;

  if (current.status === "failed") {
    return (
      <p className="flex items-center gap-1.5 text-[11px] text-danger">
        <AlertTriangleIcon className="size-3" aria-hidden />
        {/* The reason, not just the failure. A build that failed for a reason
            the user can act on is worth telling them about. */}
        {current.error ?? "That export failed. Try again."}
      </p>
    );
  }

  return (
    <p
      className="flex items-center gap-1.5 text-[11px] text-fg-muted"
      role="status"
      aria-live="polite"
    >
      <LoaderIcon className="size-3 animate-spin" aria-hidden />
      Building {current.filename}. It will download on its own when it is ready.
    </p>
  );
}
