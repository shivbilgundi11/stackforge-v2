"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { CrownIcon, Layers3Icon, MailPlusIcon, SettingsIcon, UsersIcon } from "lucide-react";

import { CreateTeam } from "@/components/features/team/create-team";
import { canManage, useTeamOrg } from "@/components/features/team/use-team-org";
import { EmptyState, Panel, PanelHeader } from "@/components/forge/panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { apiFetch } from "@/lib/api/client";
import { qk } from "@/lib/api/query-keys";
import { listMembers, type Organization } from "@/lib/api/team";
import { useOrg } from "@/lib/team/org-provider";
import type { components } from "@/types/api";

type Stack = components["schemas"]["StackOut"];

/**
 * Team → Overview (M21): members, seats, and the work the team has shared.
 *
 * The seat figure lives here, on the team page, not only in billing — the
 * person who hits the limit is usually not the person who buys seats, and
 * they need to see why the invite failed.
 */
export function TeamOverview() {
  const { org, role, isLoading } = useTeamOrg();

  if (isLoading) return <Skeleton className="h-48 rounded-md" />;
  if (!org) return <CreateTeam />;

  return <Overview org={org} manage={canManage(role)} />;
}

function Overview({ org, manage }: { org: Organization; manage: boolean }) {
  const { currentOrg, switchOrg } = useOrg();

  const members = useQuery({
    queryKey: qk.team.members(org.id),
    queryFn: () => listMembers(org.id),
  });
  const shared = useQuery({
    queryKey: qk.team.sharedStacks(org.id),
    queryFn: () => apiFetch<Stack[]>("/api/v1/stacks", { query: { scope: "team" } }),
    // Team scope comes from the header; make sure the switcher agrees.
    enabled: currentOrg?.id === org.id,
  });

  return (
    <div className="flex flex-col gap-5">
      {currentOrg?.id !== org.id ? (
        <Panel>
          <EmptyState
            icon={<UsersIcon className="size-4" aria-hidden />}
            title={`You are browsing in personal scope`}
            description={`Switch to ${org.name} to see shared work and run tools under its policy.`}
            action={
              <Button type="button" onClick={() => switchOrg(org.id)}>
                Switch to {org.name}
              </Button>
            }
          />
        </Panel>
      ) : null}

      <Panel>
        <PanelHeader
          title={org.name}
          description={
            org.seats.limit === null
              ? `${org.seats.used} members.`
              : `${org.seats.used} of ${org.seats.limit} seats in use.`
          }
          icon={<UsersIcon className="size-3.5" aria-hidden />}
          actions={
            <>
              {manage ? (
                <Button asChild size="sm" variant="ghost">
                  <Link href="/team/invitations">
                    <MailPlusIcon className="size-3.5" aria-hidden />
                    Invite
                  </Link>
                </Button>
              ) : null}
              <Button asChild size="sm" variant="ghost">
                <Link href="/team/settings">
                  <SettingsIcon className="size-3.5" aria-hidden />
                  Settings
                </Link>
              </Button>
            </>
          }
        />
        {members.isLoading ? (
          <div className="flex flex-col gap-2 p-4">
            <Skeleton className="h-10 rounded-md" />
            <Skeleton className="h-10 rounded-md" />
          </div>
        ) : (
          <ul className="divide-y divide-line">
            {(members.data ?? []).map((member) => (
              <li key={member.id} className="flex items-center gap-3 px-4 py-2.5">
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-1.5 truncate text-[13px] text-fg">
                    {member.name}
                    {member.role === "owner" ? (
                      <CrownIcon className="size-3 text-warning" aria-label="Owner" />
                    ) : null}
                  </p>
                </div>
                <Badge variant="outline" className="border-line px-1.5 py-0 text-[10px] capitalize">
                  {member.role}
                </Badge>
              </li>
            ))}
          </ul>
        )}
        <div className="border-t border-line px-4 py-2.5">
          <Link href="/team/members" className="text-[12px] text-fg-muted hover:text-fg">
            Manage members →
          </Link>
        </div>
      </Panel>

      <Panel>
        <PanelHeader
          title="Shared stacks"
          description="Work members have deliberately moved to the team. Open one to comment or request approval."
          icon={<Layers3Icon className="size-3.5" aria-hidden />}
        />
        {currentOrg?.id !== org.id ? (
          <EmptyState
            title="Switch scope to see shared work"
            description={`Shared stacks load in ${org.name}'s scope.`}
          />
        ) : shared.isLoading ? (
          <div className="flex flex-col gap-2 p-4">
            <Skeleton className="h-12 rounded-md" />
          </div>
        ) : (shared.data ?? []).length === 0 ? (
          <EmptyState
            icon={<Layers3Icon className="size-4" aria-hidden />}
            title="Nothing shared yet"
            description="Save a stack and set its visibility to team — it will show up here for everyone."
          />
        ) : (
          <ul className="divide-y divide-line">
            {(shared.data ?? []).map((stack) => (
              <li key={stack.id} className="flex items-center gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/stack-architect/my-stacks?stack=${stack.id}`}
                    className="block truncate text-[13px] font-medium text-fg hover:underline"
                  >
                    {stack.name}
                  </Link>
                  <p className="truncate text-[11.5px] text-fg-subtle">
                    {stack.owner_name ?? "Unknown"} · v{stack.current_version} ·{" "}
                    {stack.component_slugs.slice(0, 4).join(", ")}
                  </p>
                </div>
                <span className="font-mono text-[12px] text-fg-muted">{stack.score}</span>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}
