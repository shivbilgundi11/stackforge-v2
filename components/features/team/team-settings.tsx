"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { SettingsIcon, ShieldCheckIcon, Trash2Icon, WrenchIcon } from "lucide-react";

import { CreateTeam } from "@/components/features/team/create-team";
import { canManage, useTeamOrg } from "@/components/features/team/use-team-org";
import { EmptyState, Panel, PanelBody, PanelFooter, PanelHeader } from "@/components/forge/panel";
import { notify } from "@/components/toaster";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { listTools } from "@/lib/api/catalog";
import { qk } from "@/lib/api/query-keys";
import {
  changeSeats,
  deleteOrganization,
  updateOrganization,
  updateOrganizationSettings,
  type Organization,
} from "@/lib/api/team";
import { useOrg } from "@/lib/team/org-provider";

/**
 * Team → Settings (M21).
 *
 * Name, default visibility, the approval requirement, the approved-tool
 * allowlist, seats, and the delete control. Approved tools *flag* rather than
 * exclude — the copy says so, because a policy whose behaviour surprises its
 * own admin gets turned off.
 */
export function TeamSettings() {
  const { org, role, isLoading } = useTeamOrg();

  if (isLoading) return <Skeleton className="h-48 rounded-md" />;
  if (!org) return <CreateTeam />;

  if (!canManage(role)) {
    return (
      <Panel>
        <PanelHeader title="Team settings" icon={<SettingsIcon className="size-3.5" aria-hidden />} />
        <EmptyState
          title="Admins manage the settings"
          description="Ask an admin or the owner to change the team's configuration."
        />
      </Panel>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <GeneralSection org={org} />
      <ApprovedToolsSection org={org} />
      {role === "owner" ? <SeatsSection org={org} /> : null}
      {role === "owner" ? <DangerSection org={org} /> : null}
    </div>
  );
}

function GeneralSection({ org }: { org: Organization }) {
  const queryClient = useQueryClient();
  const [name, setName] = useState(org.name);
  const [visibility, setVisibility] = useState(org.settings.default_visibility);
  const [requireApproval, setRequireApproval] = useState(org.settings.require_approval);

  const dirty =
    name.trim() !== org.name ||
    visibility !== org.settings.default_visibility ||
    requireApproval !== org.settings.require_approval;

  const save = useMutation({
    mutationFn: async () => {
      if (name.trim() !== org.name) {
        await updateOrganization(org.id, { name: name.trim() });
      }
      if (
        visibility !== org.settings.default_visibility ||
        requireApproval !== org.settings.require_approval
      ) {
        await updateOrganizationSettings(org.id, {
          default_visibility: visibility,
          require_approval: requireApproval,
        });
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: qk.team.orgs() });
      notify.success("Team settings saved.");
    },
    onError: () => notify.error("Could not save the settings."),
  });

  return (
    <Panel>
      <PanelHeader
        title="General"
        description="The name everyone sees, and the defaults new work starts with."
        icon={<SettingsIcon className="size-3.5" aria-hidden />}
      />
      <PanelBody className="flex flex-col gap-4">
        <div className="flex max-w-sm flex-col gap-1.5">
          <Label htmlFor="org-name" className="text-xs">
            Organization name
          </Label>
          <Input
            id="org-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            maxLength={160}
          />
        </div>

        <div className="flex max-w-sm flex-col gap-1.5">
          <Label htmlFor="default-visibility" className="text-xs">
            Default visibility for new work
          </Label>
          <Select
            value={visibility}
            onValueChange={(next) => setVisibility(next as typeof visibility)}
          >
            <SelectTrigger id="default-visibility" className="h-9 text-[12.5px] capitalize">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="private">Private — visible only to its author</SelectItem>
              <SelectItem value="team">Team — visible to every member</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-[11.5px] text-fg-muted">
            A suggestion for new work, never a change to existing work. Moving something to the
            team stays a deliberate act by its author.
          </p>
        </div>

        <div className="flex items-start justify-between gap-4">
          <div>
            <Label htmlFor="require-approval" className="text-[12.5px]">
              Require approval on stacks
            </Label>
            <p className="mt-0.5 max-w-md text-[11.5px] text-fg-muted">
              When on, a stack shows its approval state and the team treats an unapproved stack
              as not ready. Off by default — a five-person team that did not ask for a gate
              should not meet one.
            </p>
          </div>
          <Switch
            id="require-approval"
            checked={requireApproval}
            onCheckedChange={setRequireApproval}
          />
        </div>
      </PanelBody>
      <PanelFooter>
        <p className="text-[11.5px] text-fg-subtle">{dirty ? "Unsaved changes" : " "}</p>
        <Button type="button" disabled={!dirty || save.isPending} onClick={() => save.mutate()}>
          {save.isPending ? "Saving…" : "Save"}
        </Button>
      </PanelFooter>
    </Panel>
  );
}

function ApprovedToolsSection({ org }: { org: Organization }) {
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<Set<string>>(new Set(org.settings.approved_tools));

  const tools = useQuery({ queryKey: qk.catalog.tools(), queryFn: () => listTools() });

  const grouped = useMemo(() => {
    const byCategory = new Map<string, { slug: string; name: string }[]>();
    for (const tool of tools.data ?? []) {
      const bucket = byCategory.get(tool.category) ?? [];
      bucket.push({ slug: tool.slug, name: tool.name });
      byCategory.set(tool.category, bucket);
    }
    return [...byCategory.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [tools.data]);

  const dirty = useMemo(() => {
    const current = new Set(org.settings.approved_tools);
    if (current.size !== selected.size) return true;
    for (const slug of selected) if (!current.has(slug)) return true;
    return false;
  }, [org.settings.approved_tools, selected]);

  const save = useMutation({
    mutationFn: () =>
      updateOrganizationSettings(org.id, { approved_tools: [...selected].sort() }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: qk.team.orgs() });
      notify.success(
        selected.size === 0
          ? "Allowlist cleared — recommendations carry no policy badges."
          : "Approved tools saved. Unapproved picks get a badge, never removed.",
      );
    },
    onError: () => notify.error("Could not save the approved tools."),
  });

  const toggle = (slug: string) => {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(slug)) {
        next.delete(slug);
      } else {
        next.add(slug);
      }
      return next;
    });
  };

  return (
    <Panel>
      <PanelHeader
        title="Approved tools"
        description="Stack Architect prefers approved tools and flags the rest with a note. It never silently excludes the best answer."
        icon={<WrenchIcon className="size-3.5" aria-hidden />}
      />
      {tools.isLoading ? (
        <div className="flex flex-col gap-2 p-4">
          <Skeleton className="h-16 rounded-md" />
        </div>
      ) : tools.isError ? (
        <EmptyState
          title="Could not load the catalog"
          description="Reload the page. If it keeps happening, the API is not reachable."
        />
      ) : (
        <PanelBody className="flex flex-col gap-4">
          {selected.size === 0 ? (
            <p className="text-[11.5px] text-fg-muted">
              Empty means no policy: nothing is flagged and nothing is preferred.
            </p>
          ) : null}
          {grouped.map(([category, entries]) => (
            <fieldset key={category}>
              <legend className="mb-1.5 text-[11px] font-medium tracking-wide text-fg-subtle uppercase">
                {category.replace(/-/g, " ")}
              </legend>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 sm:grid-cols-3">
                {entries.map((tool) => (
                  <label
                    key={tool.slug}
                    className="flex cursor-pointer items-center gap-2 text-[12.5px] text-fg"
                  >
                    <Checkbox
                      checked={selected.has(tool.slug)}
                      onCheckedChange={() => toggle(tool.slug)}
                      aria-label={`Approve ${tool.name}`}
                    />
                    <span className="truncate">{tool.name}</span>
                  </label>
                ))}
              </div>
            </fieldset>
          ))}
        </PanelBody>
      )}
      <PanelFooter>
        <p className="text-[11.5px] text-fg-subtle">
          {selected.size === 0 ? "No allowlist" : `${selected.size} approved`}
        </p>
        <Button type="button" disabled={!dirty || save.isPending} onClick={() => save.mutate()}>
          {save.isPending ? "Saving…" : "Save allowlist"}
        </Button>
      </PanelFooter>
    </Panel>
  );
}

function SeatsSection({ org }: { org: Organization }) {
  const queryClient = useQueryClient();
  const [seats, setSeats] = useState(String(Math.max(org.seats.purchased, org.seats.used)));

  const parsed = Number.parseInt(seats, 10);
  const valid = Number.isFinite(parsed) && parsed >= Math.max(1, org.seats.used) && parsed <= 500;

  const save = useMutation({
    mutationFn: () => changeSeats({ seats: parsed, organization_id: org.id }),
    onSuccess: (result) => {
      void queryClient.invalidateQueries({ queryKey: qk.team.orgs() });
      void queryClient.invalidateQueries({ queryKey: qk.billing.subscription() });
      notify.success(`Seats set to ${result.seats}. The change is prorated on the next invoice.`);
    },
    onError: () =>
      notify.error("Could not change seats. Seat billing needs a live Team subscription."),
  });

  return (
    <Panel>
      <PanelHeader
        title="Seats"
        description={`${org.seats.used} in use · ${org.seats.purchased} purchased${
          org.seats.limit !== null ? ` · limit ${org.seats.limit}` : ""
        }. Removing a member frees a seat at the next period.`}
        icon={<ShieldCheckIcon className="size-3.5" aria-hidden />}
      />
      <PanelBody className="flex items-end gap-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="seat-count" className="text-xs">
            Purchased seats
          </Label>
          <Input
            id="seat-count"
            type="number"
            min={Math.max(1, org.seats.used)}
            max={500}
            value={seats}
            onChange={(event) => setSeats(event.target.value)}
            className="w-28"
          />
        </div>
        <Button type="button" disabled={!valid || save.isPending} onClick={() => save.mutate()}>
          {save.isPending ? "Updating…" : "Update seats"}
        </Button>
      </PanelBody>
    </Panel>
  );
}

function DangerSection({ org }: { org: Organization }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { switchOrg } = useOrg();
  const [open, setOpen] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const armed = confirmation.trim() === org.name;

  const remove = useMutation({
    mutationFn: () => deleteOrganization(org.id),
    onSuccess: () => {
      switchOrg(null);
      void queryClient.invalidateQueries();
      notify.done(`${org.name} was deleted. Shared work reverted to its authors.`);
      router.push("/dashboard");
    },
    onError: () => notify.error("Could not delete the organization."),
  });

  return (
    <Panel className="border-danger-line">
      <PanelHeader
        title="Delete organization"
        description="Members lose team access; shared stacks and projects revert to their authors as private work. A live subscription cancels at period end."
        icon={<Trash2Icon className="size-3.5" aria-hidden />}
      />
      <PanelFooter>
        <p className="text-[11.5px] text-fg-subtle">Owner only. There is no undo.</p>
        <Button type="button" variant="destructive" onClick={() => setOpen(true)}>
          Delete…
        </Button>
      </PanelFooter>

      <Dialog
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) setConfirmation("");
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete {org.name}?</DialogTitle>
            <DialogDescription>
              This removes the team for every member. No one&apos;s work is destroyed — shared
              items revert to their authors — but the shared space, comments, and approvals go
              with it.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="delete-confirm" className="text-xs text-fg-muted">
              Type <span className="font-medium text-fg">{org.name}</span> to confirm
            </label>
            <Input
              id="delete-confirm"
              value={confirmation}
              onChange={(event) => setConfirmation(event.target.value)}
              autoComplete="off"
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={!armed || remove.isPending}
              onClick={() => remove.mutate()}
            >
              {remove.isPending ? "Deleting…" : "Delete organization"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Panel>
  );
}
