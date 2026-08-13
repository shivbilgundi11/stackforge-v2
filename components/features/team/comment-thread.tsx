"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2Icon, MessageSquareIcon, Trash2Icon, UndoIcon } from "lucide-react";

import { notify } from "@/components/toaster";
import { Panel, PanelHeader } from "@/components/forge/panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { hasCode } from "@/lib/api/errors";
import { qk } from "@/lib/api/query-keys";
import {
  createComment,
  deleteComment,
  listComments,
  listMembers,
  resolveComment,
  type OrgComment,
  type TeamResourceType,
} from "@/lib/api/team";
import { useAuth } from "@/lib/auth/auth-provider";
import { useOrg } from "@/lib/team/org-provider";
import { cn } from "@/lib/utils";

/**
 * A comment thread on a team resource (M21).
 *
 * Renders nothing at all when the resource has no thread — a private stack,
 * a run outside any shared project, or a caller outside the org all get the
 * same 404 from the API, and an empty panel would advertise a feature the
 * resource does not have.
 *
 * One level of threading, resolve on the root, tombstones for deletions.
 * Deliberately not real-time; the query refetches on mount and after writes.
 */
export function CommentThread({
  resourceType,
  resourceId,
}: {
  resourceType: TeamResourceType;
  resourceId: string;
}) {
  const { user } = useAuth();
  const { currentOrg, role } = useOrg();
  const queryClient = useQueryClient();

  const thread = useQuery({
    queryKey: qk.team.comments(resourceType, resourceId),
    queryFn: () => listComments(resourceType, resourceId),
    retry: false,
  });

  const members = useQuery({
    queryKey: currentOrg ? qk.team.members(currentOrg.id) : ["team", "members", "none"],
    queryFn: () => listMembers(currentOrg?.id ?? ""),
    enabled: currentOrg !== null && thread.isSuccess,
    staleTime: 60_000,
  });

  const invalidate = () =>
    void queryClient.invalidateQueries({ queryKey: qk.team.comments(resourceType, resourceId) });

  const [body, setBody] = useState("");
  const [replyTo, setReplyTo] = useState<OrgComment | null>(null);
  const [mentions, setMentions] = useState<Set<string>>(new Set());

  const post = useMutation({
    mutationFn: () =>
      createComment({
        resource_type: resourceType,
        resource_id: resourceId,
        body: body.trim(),
        parent_id: replyTo?.id ?? undefined,
        mentions: [...mentions],
      }),
    onSuccess: () => {
      invalidate();
      setBody("");
      setReplyTo(null);
      setMentions(new Set());
    },
    onError: (error) => {
      if (hasCode(error, "FORBIDDEN")) {
        notify.info("Viewers can read the thread but not join it.");
        return;
      }
      notify.error("Could not post the comment.");
    },
  });

  const remove = useMutation({
    mutationFn: (comment: OrgComment) => deleteComment(comment.id),
    onSuccess: invalidate,
    onError: () => notify.error("Could not delete the comment."),
  });

  const resolve = useMutation({
    mutationFn: ({ comment, resolved }: { comment: OrgComment; resolved: boolean }) =>
      resolveComment(comment.id, resolved),
    onSuccess: invalidate,
    onError: () => notify.error("Could not update the comment."),
  });

  const roots = useMemo(() => {
    const rows = thread.data ?? [];
    const replies = new Map<string, OrgComment[]>();
    for (const comment of rows) {
      if (comment.parent_id) {
        const bucket = replies.get(comment.parent_id) ?? [];
        bucket.push(comment);
        replies.set(comment.parent_id, bucket);
      }
    }
    return rows
      .filter((comment) => !comment.parent_id)
      .map((comment) => ({ comment, replies: replies.get(comment.id) ?? [] }));
  }, [thread.data]);

  // No thread here — a private resource, or no membership. Say nothing.
  if (thread.isError) return null;

  if (thread.isLoading) {
    return <Skeleton className="h-24 rounded-md" data-testid="comment-thread-loading" />;
  }

  const canComment = role === "owner" || role === "admin" || role === "member";
  const canModerate = role === "owner" || role === "admin";
  const mentionable = (members.data ?? []).filter((member) => member.user_id !== user?.id);

  return (
    <Panel data-testid="comment-thread">
      <PanelHeader
        title="Comments"
        description={
          roots.length === 0 ? "Start the discussion for your team." : undefined
        }
        icon={<MessageSquareIcon className="size-3.5" aria-hidden />}
      />

      {roots.length > 0 ? (
        <ul className="divide-y divide-line">
          {roots.map(({ comment, replies }) => (
            <li key={comment.id} className="px-4 py-3">
              <CommentRow
                comment={comment}
                canModerate={canModerate}
                onDelete={() => remove.mutate(comment)}
                onResolve={(resolved) => resolve.mutate({ comment, resolved })}
                onReply={canComment ? () => setReplyTo(comment) : undefined}
              />
              {replies.length > 0 ? (
                <ul className="mt-2 flex flex-col gap-2 border-l border-line pl-4">
                  {replies.map((reply) => (
                    <li key={reply.id}>
                      <CommentRow
                        comment={reply}
                        canModerate={canModerate}
                        onDelete={() => remove.mutate(reply)}
                      />
                    </li>
                  ))}
                </ul>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}

      {canComment ? (
        <form
          className="flex flex-col gap-2 border-t border-line p-4"
          onSubmit={(event) => {
            event.preventDefault();
            if (body.trim()) post.mutate();
          }}
        >
          {replyTo ? (
            <p className="flex items-center gap-2 text-[11.5px] text-fg-muted">
              Replying to {replyTo.author_name ?? "a comment"}
              <button
                type="button"
                className="text-fg-subtle underline hover:text-fg"
                onClick={() => setReplyTo(null)}
              >
                cancel
              </button>
            </p>
          ) : null}
          <Textarea
            value={body}
            onChange={(event) => setBody(event.target.value)}
            placeholder={replyTo ? "Write a reply…" : "Write a comment…"}
            aria-label={replyTo ? "Reply" : "Comment"}
            rows={2}
            maxLength={5000}
          />
          {mentionable.length > 0 ? (
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] text-fg-subtle">Notify:</span>
              {mentionable.map((member) => {
                const active = mentions.has(member.user_id);
                return (
                  <button
                    key={member.user_id}
                    type="button"
                    aria-pressed={active}
                    onClick={() =>
                      setMentions((current) => {
                        const next = new Set(current);
                        if (next.has(member.user_id)) {
                          next.delete(member.user_id);
                        } else {
                          next.add(member.user_id);
                        }
                        return next;
                      })
                    }
                    className={cn(
                      "rounded-full border px-2 py-0.5 text-[11px] transition-colors",
                      active
                        ? "border-ember-line bg-ember-quiet text-ember"
                        : "border-line text-fg-muted hover:border-line-strong",
                    )}
                  >
                    @{member.name}
                  </button>
                );
              })}
            </div>
          ) : null}
          <div className="flex justify-end">
            <Button type="submit" size="sm" disabled={!body.trim() || post.isPending}>
              {post.isPending ? "Posting…" : replyTo ? "Reply" : "Comment"}
            </Button>
          </div>
        </form>
      ) : null}
    </Panel>
  );
}

function CommentRow({
  comment,
  canModerate,
  onDelete,
  onResolve,
  onReply,
}: {
  comment: OrgComment;
  canModerate: boolean;
  onDelete: () => void;
  onResolve?: (resolved: boolean) => void;
  onReply?: () => void;
}) {
  const resolved = comment.resolved_at !== null;

  if (comment.deleted) {
    return <p className="text-[12px] text-fg-subtle italic">Comment deleted</p>;
  }

  return (
    <div className={cn(resolved && "opacity-70")}>
      <div className="flex items-center gap-2">
        <p className="text-[12.5px] font-medium text-fg">{comment.author_name ?? "Former member"}</p>
        <p className="text-[11px] text-fg-subtle">
          {new Date(comment.created_at).toLocaleString()}
        </p>
        {resolved ? (
          <Badge variant="outline" className="border-success-line px-1.5 py-0 text-[10px] text-success">
            resolved
          </Badge>
        ) : null}
        <span className="flex-1" />
        {onReply ? (
          <button
            type="button"
            className="text-[11px] text-fg-subtle hover:text-fg"
            onClick={onReply}
          >
            Reply
          </button>
        ) : null}
        {onResolve && !comment.parent_id ? (
          <button
            type="button"
            aria-label={resolved ? "Reopen" : "Resolve"}
            title={resolved ? "Reopen" : "Resolve"}
            className="text-fg-subtle hover:text-fg"
            onClick={() => onResolve(!resolved)}
          >
            {resolved ? (
              <UndoIcon className="size-3.5" aria-hidden />
            ) : (
              <CheckCircle2Icon className="size-3.5" aria-hidden />
            )}
          </button>
        ) : null}
        {comment.is_yours || canModerate ? (
          <button
            type="button"
            aria-label="Delete comment"
            className="text-fg-subtle hover:text-danger"
            onClick={onDelete}
          >
            <Trash2Icon className="size-3.5" aria-hidden />
          </button>
        ) : null}
      </div>
      <p className="mt-1 text-[13px] leading-relaxed whitespace-pre-wrap text-fg">{comment.body}</p>
    </div>
  );
}
