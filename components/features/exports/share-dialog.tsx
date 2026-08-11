"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CheckIcon, CopyIcon, EyeIcon, Link2Icon, TrashIcon } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import toast from "react-hot-toast";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ApiError } from "@/lib/api/errors";
import { createShare, revokeShare, type ShareLink, type SourceType } from "@/lib/api/exports";
import { qk } from "@/lib/api/query-keys";
import { useAuth } from "@/lib/auth/auth-provider";

/**
 * Minting a public link (M18).
 *
 * The dialog states what the link does before it exists, because a capability
 * URL is not obviously one: anybody holding it can read the result, there is no
 * sign-in, and the only control afterwards is revoking. Saying that after the
 * link is copied is saying it too late.
 *
 * Expiry is optional and defaults to never. Revocation is the primary control
 * and it is always available, so forcing an expiry on every link would make the
 * common case an unnecessary decision.
 */

const EXPIRY_OPTIONS = [
  { value: "never", label: "Never expires" },
  { value: "7", label: "Expires in 7 days" },
  { value: "30", label: "Expires in 30 days" },
  { value: "90", label: "Expires in 90 days" },
];

export function ShareDialog({
  open,
  onOpenChange,
  targetType,
  targetId,
  artifactType,
  artifactLabel,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetType: SourceType;
  targetId: string;
  artifactType: string | null;
  artifactLabel: string | null;
}) {
  const { status } = useAuth();
  const client = useQueryClient();
  const [expiry, setExpiry] = useState("never");
  const [link, setLink] = useState<ShareLink | null>(null);
  const [copied, setCopied] = useState(false);

  const mint = useMutation({
    mutationFn: () =>
      createShare({
        target_type: targetType,
        target_id: targetId,
        artifact_type: artifactType,
        expires_in_days: expiry === "never" ? null : Number(expiry),
      }),
    onSuccess: async (created) => {
      setLink(created);
      void client.invalidateQueries({ queryKey: qk.shares.list(false) });
      await copy(created.url);
    },
    onError: (error) =>
      toast.error(error instanceof ApiError ? error.message : "Could not create that link."),
  });

  const revoke = useMutation({
    mutationFn: (id: string) => revokeShare(id),
    onSuccess: () => {
      setLink(null);
      void client.invalidateQueries({ queryKey: qk.shares.list(false) });
      toast.success("Link revoked. It now returns a 404.");
    },
    onError: () => toast.error("Could not revoke that link."),
  });

  const copy = async (url: string) => {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
    toast.success("Link copied");
  };

  const close = (next: boolean) => {
    if (!next) {
      setLink(null);
      setCopied(false);
    }
    onOpenChange(next);
  };

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="mb-2 flex size-9 items-center justify-center rounded-md border border-line bg-surface-2 text-fg-muted">
            <Link2Icon className="size-4" aria-hidden />
          </div>
          <DialogTitle>
            {artifactLabel ? `Share ${artifactLabel.toLowerCase()}` : "Share this result"}
          </DialogTitle>
          <DialogDescription>
            Anyone with the link can read it. No sign-in, no account, and nothing about you is shown
            on the page.
          </DialogDescription>
        </DialogHeader>

        {status !== "authenticated" ? (
          <p className="rounded-md border border-line bg-surface-2/50 px-3 py-2.5 text-xs leading-relaxed text-fg-muted">
            Sharing needs an account — a link you cannot revoke later is a link you cannot take
            back, and revoking is the only control a public URL has. Exporting works either way.
          </p>
        ) : link ? (
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="share-url">Your link</Label>
              <div className="flex gap-2">
                <Input id="share-url" readOnly value={link.url} className="font-mono text-xs" />
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => void copy(link.url)}
                >
                  {copied ? (
                    <CheckIcon className="size-3.5" aria-hidden />
                  ) : (
                    <CopyIcon className="size-3.5" aria-hidden />
                  )}
                  Copy
                </Button>
              </div>
            </div>

            <dl className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-fg-muted">
              <div className="flex items-center gap-1">
                <EyeIcon className="size-3" aria-hidden />
                <dt className="sr-only">Views</dt>
                <dd>
                  {link.view_count} {link.view_count === 1 ? "view" : "views"}
                </dd>
              </div>
              <div>
                <dt className="sr-only">Expiry</dt>
                <dd>
                  {link.expires_at
                    ? `Expires ${new Date(link.expires_at).toLocaleDateString()}`
                    : "No expiry"}
                </dd>
              </div>
              <div className="ml-auto">
                <Link href="/settings#shares" className="underline underline-offset-2">
                  Manage all links
                </Link>
              </div>
            </dl>
          </div>
        ) : (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="share-expiry">Expiry</Label>
            <Select value={expiry} onValueChange={setExpiry}>
              <SelectTrigger id="share-expiry">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {EXPIRY_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-[11px] text-fg-subtle">
              The page is marked <code className="font-mono">noindex</code>, so it will not appear
              in a search engine. You can revoke the link at any time — it starts returning a 404
              immediately.
            </p>
          </div>
        )}

        <DialogFooter className="sm:justify-between">
          {link ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={revoke.isPending}
              onClick={() => revoke.mutate(link.id)}
            >
              <TrashIcon className="size-3.5" aria-hidden />
              Revoke
            </Button>
          ) : (
            <Button variant="ghost" size="sm" onClick={() => close(false)}>
              Cancel
            </Button>
          )}

          {status !== "authenticated" ? (
            <Button asChild size="sm">
              <Link href="/signup">Create an account</Link>
            </Button>
          ) : link ? (
            <Button size="sm" onClick={() => close(false)}>
              Done
            </Button>
          ) : (
            <Button size="sm" disabled={mint.isPending} onClick={() => mint.mutate()}>
              {mint.isPending ? "Creating…" : "Create link"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
