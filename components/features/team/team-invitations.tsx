"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { MailPlusIcon } from "lucide-react";

import { CreateTeam } from "@/components/features/team/create-team";
import { canManage, useTeamOrg } from "@/components/features/team/use-team-org";
import { EmptyState, Panel, PanelBody, PanelHeader } from "@/components/forge/panel";
import { notify } from "@/components/toaster";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { hasCode, isApiError } from "@/lib/api/errors";
import { qk } from "@/lib/api/query-keys";
import {
  createInvitation,
  listInvitations,
  resendInvitation,
  revokeInvitation,
  type GrantableRole,
} from "@/lib/api/team";

/**
 * Team → Invitations (M21).
 *
 * Sending checks seats on the server; a full team gets the real figures back
 * in `SEATS_EXCEEDED` rather than a disabled button guessing at them. The
 * pending list is a work list — accepted and revoked invites are history and
 * are not shown.
 */
export function TeamInvitations() {
  const { org, role, isLoading } = useTeamOrg();

  if (isLoading) return <Skeleton className="h-48 rounded-md" />;
  if (!org) return <CreateTeam />;

  if (!canManage(role)) {
    return (
      <Panel>
        <PanelHeader title="Invitations" icon={<MailPlusIcon className="size-3.5" aria-hidden />} />
        <EmptyState
          title="Admins send the invitations"
          description="Ask an admin or the owner to invite new members."
        />
      </Panel>
    );
  }

  return <InvitationsPanel orgId={org.id} seatsUsed={org.seats.used} seatLimit={org.seats.limit} />;
}

function InvitationsPanel({
  orgId,
  seatsUsed,
  seatLimit,
}: {
  orgId: string;
  seatsUsed: number;
  seatLimit: number | null;
}) {
  const queryClient = useQueryClient();
  const [email, setEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<GrantableRole>("member");

  const invitations = useQuery({
    queryKey: qk.team.invitations(orgId),
    queryFn: () => listInvitations(orgId),
  });

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: qk.team.invitations(orgId) });
    void queryClient.invalidateQueries({ queryKey: qk.team.orgs() });
  };

  const send = useMutation({
    mutationFn: () => createInvitation(orgId, { email: email.trim(), role: inviteRole }),
    onSuccess: (invitation) => {
      invalidate();
      setEmail("");
      notify.success(`Invitation sent to ${invitation.email}.`);
    },
    onError: (error) => {
      if (hasCode(error, "SEATS_EXCEEDED")) {
        notify.warning("Every seat is taken. Add seats in Team settings, then invite.");
        return;
      }
      if (hasCode(error, "CONFLICT")) {
        notify.info(isApiError(error) ? error.message : "That address is already invited.");
        return;
      }
      notify.error("Could not send the invitation.");
    },
  });

  const resend = useMutation({
    mutationFn: (invitationId: string) => resendInvitation(orgId, invitationId),
    onSuccess: (invitation) => {
      invalidate();
      notify.done(`Re-sent to ${invitation.email}. The old link no longer works.`);
    },
    onError: () => notify.error("Could not resend that invitation."),
  });

  const revoke = useMutation({
    mutationFn: (invitationId: string) => revokeInvitation(orgId, invitationId),
    onSuccess: () => {
      invalidate();
      notify.done("Invitation revoked. Its link now returns a 404.");
    },
    onError: () => notify.error("Could not revoke that invitation."),
  });

  const rows = invitations.data ?? [];

  return (
    <Panel>
      <PanelHeader
        title="Invitations"
        description={
          seatLimit === null
            ? `${seatsUsed} seats in use.`
            : `${seatsUsed} of ${seatLimit} seats in use. Seats are checked again when an invite is accepted.`
        }
        icon={<MailPlusIcon className="size-3.5" aria-hidden />}
      />

      <PanelBody className="border-b border-line">
        <form
          className="flex flex-wrap items-end gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            if (email.trim()) send.mutate();
          }}
        >
          <div className="flex min-w-52 flex-1 flex-col gap-1.5">
            <Label htmlFor="invite-email" className="text-xs">
              Email address
            </Label>
            <Input
              id="invite-email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="teammate@company.com"
              required
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="invite-role" className="text-xs">
              Role
            </Label>
            <Select value={inviteRole} onValueChange={(next) => setInviteRole(next as GrantableRole)}>
              <SelectTrigger id="invite-role" className="h-9 w-28 text-[12.5px] capitalize">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="member">Member</SelectItem>
                <SelectItem value="viewer">Viewer</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button type="submit" disabled={!email.trim() || send.isPending}>
            {send.isPending ? "Sending…" : "Send invite"}
          </Button>
        </form>
      </PanelBody>

      {invitations.isLoading ? (
        <div className="flex flex-col gap-2 p-4">
          <Skeleton className="h-12 rounded-md" />
        </div>
      ) : invitations.isError ? (
        <EmptyState
          title="Could not load invitations"
          description="Reload the page. If it keeps happening, the API is not reachable."
        />
      ) : rows.length === 0 ? (
        <EmptyState
          icon={<MailPlusIcon className="size-4" aria-hidden />}
          title="No pending invitations"
          description="Invites expire after 7 days. Accepted and revoked ones do not linger here."
        />
      ) : (
        <ul className="divide-y divide-line">
          {rows.map((invitation) => (
            <li key={invitation.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-medium text-fg">{invitation.email}</p>
                <p className="text-[11.5px] text-fg-subtle">
                  <span className="capitalize">{invitation.role}</span>
                  {invitation.invited_by ? <> · invited by {invitation.invited_by}</> : null}
                  {" · expires "}
                  {new Date(invitation.expires_at).toLocaleDateString()}
                </p>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  disabled={resend.isPending}
                  onClick={() => resend.mutate(invitation.id)}
                >
                  Resend
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="text-danger hover:text-danger"
                  disabled={revoke.isPending}
                  onClick={() => revoke.mutate(invitation.id)}
                >
                  Revoke
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
