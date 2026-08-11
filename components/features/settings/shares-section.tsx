"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckIcon, CopyIcon, EyeIcon, Link2Icon, TrashIcon } from "lucide-react";
import { useState } from "react";
import toast from "react-hot-toast";

import { EmptyState, Panel, PanelHeader } from "@/components/forge/panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { listShares, revokeAllShares, revokeShare } from "@/lib/api/exports";
import { qk } from "@/lib/api/query-keys";

/**
 * Settings → Shares (M18).
 *
 * The page that answers "what have I put on the internet". Every live link,
 * how often each has been opened, and one control that kills all of them.
 *
 * Bulk revoke is deliberately not behind a confirm dialog *and* deliberately
 * destructive-styled: someone reaching for it usually has a reason to be in a
 * hurry, and a link is re-mintable in two clicks, so the cost of an accidental
 * press is low and the cost of a slow one is not.
 */
export function SharesSection() {
  const client = useQueryClient();
  const [copied, setCopied] = useState<string | null>(null);

  const shares = useQuery({ queryKey: qk.shares.list(false), queryFn: () => listShares(false) });

  const revoke = useMutation({
    mutationFn: (id: string) => revokeShare(id),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: qk.shares.list(false) });
      toast.success("Link revoked. It now returns a 404.");
    },
    onError: () => toast.error("Could not revoke that link."),
  });

  const revokeAll = useMutation({
    mutationFn: revokeAllShares,
    onSuccess: (result) => {
      void client.invalidateQueries({ queryKey: qk.shares.list(false) });
      toast.success(
        result.revoked === 0
          ? "There was nothing live to revoke."
          : `${result.revoked} ${result.revoked === 1 ? "link" : "links"} revoked.`,
      );
    },
    onError: () => toast.error("Could not revoke those links."),
  });

  const copy = async (url: string, id: string) => {
    await navigator.clipboard.writeText(url);
    setCopied(id);
    setTimeout(() => setCopied(null), 1600);
  };

  const rows = shares.data ?? [];

  return (
    <Panel id="shares">
      <PanelHeader
        title="Shared links"
        description="Anyone holding one of these can read the result it points at. Revoking takes effect immediately."
        icon={<Link2Icon className="size-3.5" aria-hidden />}
        actions={
          rows.length > 0 ? (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="text-danger hover:text-danger"
              disabled={revokeAll.isPending}
              onClick={() => revokeAll.mutate()}
            >
              Revoke all
            </Button>
          ) : null
        }
      />

      {shares.isLoading ? (
        <div className="flex flex-col gap-2 p-4">
          <Skeleton className="h-12 rounded-md" />
          <Skeleton className="h-12 rounded-md" />
        </div>
      ) : shares.isError ? (
        <EmptyState
          title="Could not load your links"
          description="Reload the page. If it keeps happening, the API is not reachable."
        />
      ) : rows.length === 0 ? (
        <EmptyState
          icon={<Link2Icon className="size-4" aria-hidden />}
          title="No live links"
          description="Share a result or a saved stack and the link will show up here with its view count."
        />
      ) : (
        <ul className="divide-y divide-line">
          {rows.map((share) => (
            <li key={share.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-medium text-fg">{share.title}</p>
                <p className="truncate font-mono text-[11px] text-fg-subtle">{share.url}</p>
              </div>

              <div className="flex items-center gap-2 text-[11px] text-fg-muted">
                <span className="flex items-center gap-1">
                  <EyeIcon className="size-3" aria-hidden />
                  {share.view_count}
                </span>
                {share.expires_at ? (
                  <Badge variant="outline" className="border-line px-1.5 py-0 text-[10px]">
                    expires {new Date(share.expires_at).toLocaleDateString()}
                  </Badge>
                ) : null}
              </div>

              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  aria-label={`Copy the link to ${share.title}`}
                  onClick={() => void copy(share.url, share.id)}
                >
                  {copied === share.id ? (
                    <CheckIcon className="size-3.5" aria-hidden />
                  ) : (
                    <CopyIcon className="size-3.5" aria-hidden />
                  )}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="text-danger hover:text-danger"
                  aria-label={`Revoke the link to ${share.title}`}
                  disabled={revoke.isPending}
                  onClick={() => revoke.mutate(share.id)}
                >
                  <TrashIcon className="size-3.5" aria-hidden />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
