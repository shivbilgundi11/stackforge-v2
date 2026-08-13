"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CrownIcon, UsersIcon } from "lucide-react";

import { CreateTeam } from "@/components/features/team/create-team";
import { canManage, useTeamOrg } from "@/components/features/team/use-team-org";
import { EmptyState, Panel, PanelHeader } from "@/components/forge/panel";
import { notify } from "@/components/toaster";
import { Badge } from "@/components/ui/badge";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { qk } from "@/lib/api/query-keys";
import {
  listMembers,
  removeMember,
  transferOwnership,
  updateMemberRole,
  type GrantableRole,
  type OrgMember,
} from "@/lib/api/team";

/**
 * Team → Members (M21).
 *
 * Role changes are inline — a select on the row, not a modal per edit.
 * Removal and ownership transfer are dialogs, transfer with the org name
 * typed back: it is the one action that cannot be undone by the person who
 * did it.
 */
export function TeamMembers() {
  const { org, role, isLoading } = useTeamOrg();

  if (isLoading) {
    return <Skeleton className="h-48 rounded-md" />;
  }
  if (!org) return <CreateTeam />;

  return <MembersPanel orgId={org.id} orgName={org.name} manage={canManage(role)} isOwner={role === "owner"} />;
}

function MembersPanel({
  orgId,
  orgName,
  manage,
  isOwner,
}: {
  orgId: string;
  orgName: string;
  manage: boolean;
  isOwner: boolean;
}) {
  const queryClient = useQueryClient();
  const [removing, setRemoving] = useState<OrgMember | null>(null);
  const [promoting, setPromoting] = useState<OrgMember | null>(null);

  const members = useQuery({ queryKey: qk.team.members(orgId), queryFn: () => listMembers(orgId) });

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: qk.team.members(orgId) });
    void queryClient.invalidateQueries({ queryKey: qk.team.orgs() });
  };

  const changeRole = useMutation({
    mutationFn: ({ member, next }: { member: OrgMember; next: GrantableRole }) =>
      updateMemberRole(orgId, member.id, next),
    onSuccess: (updated) => {
      invalidate();
      notify.success(`${updated.name} is now a ${updated.role}.`);
    },
    onError: () => notify.error("Could not change that role."),
  });

  const remove = useMutation({
    mutationFn: (member: OrgMember) => removeMember(orgId, member.id),
    onSuccess: (_, member) => {
      invalidate();
      setRemoving(null);
      notify.done(`${member.name} was removed. Their seat frees at the next period.`);
    },
    onError: () => notify.error("Could not remove that member."),
  });

  const transfer = useMutation({
    mutationFn: (member: OrgMember) => transferOwnership(orgId, member.id),
    onSuccess: (successor) => {
      invalidate();
      setPromoting(null);
      notify.success(`${successor.name} now owns ${orgName}. You are an admin.`);
    },
    onError: () => notify.error("Could not transfer ownership."),
  });

  const rows = members.data ?? [];

  return (
    <Panel>
      <PanelHeader
        title="Members"
        description="Roles decide what each person can see, edit, approve, and manage."
        icon={<UsersIcon className="size-3.5" aria-hidden />}
      />

      {members.isLoading ? (
        <div className="flex flex-col gap-2 p-4">
          <Skeleton className="h-12 rounded-md" />
          <Skeleton className="h-12 rounded-md" />
        </div>
      ) : members.isError ? (
        <EmptyState
          title="Could not load the member list"
          description="Reload the page. If it keeps happening, the API is not reachable."
        />
      ) : (
        <ul className="divide-y divide-line">
          {rows.map((member) => (
            <li key={member.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-1.5 truncate text-[13px] font-medium text-fg">
                  {member.name}
                  {member.is_current_user ? (
                    <span className="text-[11px] font-normal text-fg-subtle">(you)</span>
                  ) : null}
                  {member.role === "owner" ? (
                    <CrownIcon className="size-3 text-warning" aria-label="Owner" />
                  ) : null}
                </p>
                <p className="truncate text-[11.5px] text-fg-subtle">{member.email}</p>
              </div>

              {member.role === "owner" ? (
                <Badge variant="outline" className="border-line px-1.5 py-0 text-[10px] capitalize">
                  owner
                </Badge>
              ) : manage ? (
                <Select
                  value={member.role}
                  onValueChange={(next) =>
                    changeRole.mutate({ member, next: next as GrantableRole })
                  }
                >
                  <SelectTrigger
                    aria-label={`Role for ${member.name}`}
                    className="h-8 w-28 text-[12.5px] capitalize"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="member">Member</SelectItem>
                    <SelectItem value="viewer">Viewer</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <Badge variant="outline" className="border-line px-1.5 py-0 text-[10px] capitalize">
                  {member.role}
                </Badge>
              )}

              {manage && member.role !== "owner" ? (
                <div className="flex items-center gap-1">
                  {isOwner ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => setPromoting(member)}
                    >
                      Make owner
                    </Button>
                  ) : null}
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="text-danger hover:text-danger"
                    onClick={() => setRemoving(member)}
                  >
                    Remove
                  </Button>
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      <RemoveDialog
        member={removing}
        pending={remove.isPending}
        onCancel={() => setRemoving(null)}
        onConfirm={(member) => remove.mutate(member)}
      />
      <TransferDialog
        member={promoting}
        orgName={orgName}
        pending={transfer.isPending}
        onCancel={() => setPromoting(null)}
        onConfirm={(member) => transfer.mutate(member)}
      />
    </Panel>
  );
}

function RemoveDialog({
  member,
  pending,
  onCancel,
  onConfirm,
}: {
  member: OrgMember | null;
  pending: boolean;
  onCancel: () => void;
  onConfirm: (member: OrgMember) => void;
}) {
  return (
    <Dialog open={member !== null} onOpenChange={(open) => (!open ? onCancel() : undefined)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Remove {member?.name}?</DialogTitle>
          <DialogDescription>
            They lose access to team stacks, projects, and comments immediately. Their personal
            work stays theirs, and the seat frees at the next billing period.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={pending}
            onClick={() => member && onConfirm(member)}
          >
            {pending ? "Removing…" : "Remove member"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function TransferDialog({
  member,
  orgName,
  pending,
  onCancel,
  onConfirm,
}: {
  member: OrgMember | null;
  orgName: string;
  pending: boolean;
  onCancel: () => void;
  onConfirm: (member: OrgMember) => void;
}) {
  const [confirmation, setConfirmation] = useState("");
  const armed = confirmation.trim() === orgName;

  return (
    <Dialog
      open={member !== null}
      onOpenChange={(open) => {
        if (!open) {
          setConfirmation("");
          onCancel();
        }
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Transfer ownership to {member?.name}?</DialogTitle>
          <DialogDescription>
            There is exactly one owner. {member?.name} gains billing, seats, and the ability to
            delete the organization; you become an admin. Only they can transfer it back.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="transfer-confirm" className="text-xs text-fg-muted">
            Type <span className="font-medium text-fg">{orgName}</span> to confirm
          </label>
          <Input
            id="transfer-confirm"
            value={confirmation}
            onChange={(event) => setConfirmation(event.target.value)}
            autoComplete="off"
          />
        </div>
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={!armed || pending}
            onClick={() => member && onConfirm(member)}
          >
            {pending ? "Transferring…" : "Transfer ownership"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
