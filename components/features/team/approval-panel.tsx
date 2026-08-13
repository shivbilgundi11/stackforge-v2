"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BadgeCheckIcon } from "lucide-react";

import { notify } from "@/components/toaster";
import { Panel, PanelBody, PanelHeader } from "@/components/forge/panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { qk } from "@/lib/api/query-keys";
import {
  decideApproval,
  listApprovals,
  requestApproval,
  type OrgApproval,
  type TeamResourceType,
} from "@/lib/api/team";
import { useOrg } from "@/lib/team/org-provider";
import { cn } from "@/lib/utils";

/**
 * The approval gate on a team resource (M21).
 *
 * A member requests; an admin or the owner approves or rejects with a note.
 * Like the comment thread, it renders nothing when the resource has no team
 * context — the 404 from the API is the signal.
 */
export function ApprovalPanel({
  resourceType,
  resourceId,
}: {
  resourceType: TeamResourceType;
  resourceId: string;
}) {
  const { role } = useOrg();
  const queryClient = useQueryClient();
  const [note, setNote] = useState("");

  const approvals = useQuery({
    queryKey: qk.team.approvals(resourceType, resourceId),
    queryFn: () => listApprovals(resourceType, resourceId),
    retry: false,
  });

  const invalidate = () =>
    void queryClient.invalidateQueries({ queryKey: qk.team.approvals(resourceType, resourceId) });

  const request = useMutation({
    mutationFn: () => requestApproval(resourceType, resourceId),
    onSuccess: () => {
      invalidate();
      notify.success("Approval requested. An admin will see it on the stack.");
    },
    onError: () => notify.error("Could not request approval."),
  });

  const decide = useMutation({
    mutationFn: ({ approval, action }: { approval: OrgApproval; action: "approve" | "reject" }) =>
      decideApproval(approval.id, { action, note: note.trim() || undefined }),
    onSuccess: (decided) => {
      invalidate();
      setNote("");
      notify.done(decided.status === "approved" ? "Approved." : "Rejected with a note.");
    },
    onError: () => notify.error("Could not record the decision."),
  });

  if (approvals.isError) return null;
  if (approvals.isLoading) {
    return <Skeleton className="h-16 rounded-md" data-testid="approval-panel-loading" />;
  }

  const history = approvals.data ?? [];
  const latest = history[0] ?? null;
  const canRequest = role === "owner" || role === "admin" || role === "member";
  const canDecide = role === "owner" || role === "admin";

  return (
    <Panel data-testid="approval-panel">
      <PanelHeader
        title="Approval"
        description="A lightweight gate: request it when the stack is ready for the team's sign-off."
        icon={<BadgeCheckIcon className="size-3.5" aria-hidden />}
        actions={latest ? <StatusBadge status={latest.status} /> : null}
      />
      <PanelBody className="flex flex-col gap-3">
        {latest === null ? (
          <div className="flex items-center justify-between gap-3">
            <p className="text-[12.5px] text-fg-muted">No approval has been requested yet.</p>
            {canRequest ? (
              <Button
                type="button"
                size="sm"
                disabled={request.isPending}
                onClick={() => request.mutate()}
              >
                Request approval
              </Button>
            ) : null}
          </div>
        ) : (
          <>
            <p className="text-[12.5px] leading-relaxed text-fg-muted">
              {latest.status === "pending" ? (
                <>Requested by {latest.requested_by ?? "a member"}.</>
              ) : (
                <>
                  {latest.status === "approved" ? "Approved" : "Rejected"} by{" "}
                  {latest.decided_by ?? "an admin"}
                  {latest.decision_note ? <> — “{latest.decision_note}”</> : null}
                </>
              )}
            </p>

            {latest.status === "pending" && canDecide ? (
              <div className="flex flex-col gap-2">
                <Textarea
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  placeholder="Decision note (optional, shown to the team)"
                  aria-label="Decision note"
                  rows={2}
                  maxLength={2000}
                />
                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="text-danger"
                    disabled={decide.isPending}
                    onClick={() => decide.mutate({ approval: latest, action: "reject" })}
                  >
                    Reject
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    disabled={decide.isPending}
                    onClick={() => decide.mutate({ approval: latest, action: "approve" })}
                  >
                    Approve
                  </Button>
                </div>
              </div>
            ) : null}

            {latest.status !== "pending" && canRequest ? (
              <div className="flex justify-end">
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  disabled={request.isPending}
                  onClick={() => request.mutate()}
                >
                  Request again
                </Button>
              </div>
            ) : null}
          </>
        )}
      </PanelBody>
    </Panel>
  );
}

function StatusBadge({ status }: { status: OrgApproval["status"] }) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "px-1.5 py-0 text-[10px] capitalize",
        status === "approved" && "border-success-line text-success",
        status === "rejected" && "border-danger-line text-danger",
        status === "pending" && "border-warning-line text-warning",
      )}
    >
      {status}
    </Badge>
  );
}
