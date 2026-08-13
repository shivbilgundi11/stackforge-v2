"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { UsersIcon } from "lucide-react";

import { EmptyState, Panel, PanelHeader } from "@/components/forge/panel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { hasCode } from "@/lib/api/errors";
import { qk } from "@/lib/api/query-keys";
import { createOrganization } from "@/lib/api/team";
import { useAuth } from "@/lib/auth/auth-provider";
import { useOrg } from "@/lib/team/org-provider";
import { notify } from "@/components/toaster";

/**
 * The no-team-yet state of every /team page (M21).
 *
 * Creating an organization needs the Team plan; a Free or Pro user sees the
 * same form and gets sent to pricing when the server says `PLAN_REQUIRED` —
 * the gate's figures come from the server, not a local plan check that would
 * drift from it.
 */
export function CreateTeam() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { switchOrg } = useOrg();
  const [name, setName] = useState("");

  const create = useMutation({
    mutationFn: () => createOrganization({ name: name.trim() }),
    onSuccess: (org) => {
      void queryClient.invalidateQueries({ queryKey: qk.team.orgs() });
      switchOrg(org.id);
      notify.success(`${org.name} is ready. Invite your first teammate.`);
      router.push("/team/invitations");
    },
    onError: (error) => {
      if (hasCode(error, "PLAN_REQUIRED")) {
        notify.info("Team workspaces are on the Team plan.");
        router.push("/pricing");
        return;
      }
      notify.error("Could not create the organization.");
    },
  });

  const onTeamPlan = user?.plan === "team" || user?.plan === "enterprise";

  return (
    <Panel>
      <PanelHeader
        title="Start a team"
        description="A shared workspace with roles, shared stacks, comments, and approvals."
        icon={<UsersIcon className="size-3.5" aria-hidden />}
      />
      <EmptyState
        icon={<UsersIcon className="size-4" aria-hidden />}
        title={onTeamPlan ? "Name your organization" : "Teams are on the Team plan"}
        description={
          onTeamPlan
            ? "You are the owner. Seats, roles, and invitations come next."
            : "Upgrade to create a shared workspace — your personal work stays personal either way."
        }
        action={
          <form
            className="flex items-end gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              if (name.trim()) create.mutate();
            }}
          >
            <div className="flex flex-col items-start gap-1.5">
              <Label htmlFor="team-name" className="text-xs">
                Organization name
              </Label>
              <Input
                id="team-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Acme Robotics"
                className="w-56"
                maxLength={160}
              />
            </div>
            <Button type="submit" disabled={!name.trim() || create.isPending}>
              {create.isPending ? "Creating…" : "Create team"}
            </Button>
          </form>
        }
      />
    </Panel>
  );
}
