"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeftIcon, FolderIcon, PinIcon, Trash2Icon, UsersIcon } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import toast from "react-hot-toast";

import { ApprovalPanel } from "@/components/features/team/approval-panel";
import { CommentThread } from "@/components/features/team/comment-thread";
import { EmptyState, Panel, PanelBody, PanelHeader } from "@/components/forge/panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ApiError } from "@/lib/api/errors";
import { qk } from "@/lib/api/query-keys";
import {
  clearCarriedSession,
  getCarriedSession,
  getProject,
  listProjectItems,
  pinProjectItem,
  removeProjectItem,
  updateProjectVisibility,
} from "@/lib/api/workspace";
import { useAuth } from "@/lib/auth/auth-provider";
import { relativeAge } from "@/lib/format";
import { useOrg } from "@/lib/team/org-provider";

/**
 * One project: what is in it, and what it carries between tools.
 *
 * The carried session is shown rather than left implicit. A figure that
 * silently prefills the next tool's form is indistinguishable from a bug when
 * it is wrong, so the project states what it is holding and offers to drop it.
 */
export function ProjectDetail({ projectId }: { projectId: string }) {
  const { status } = useAuth();
  const { currentOrg } = useOrg();
  const client = useQueryClient();
  const signedIn = status === "authenticated";

  const project = useQuery({
    queryKey: qk.workspace.project(projectId),
    queryFn: () => getProject(projectId),
    enabled: signedIn,
    retry: false,
  });

  const items = useQuery({
    queryKey: qk.workspace.items(projectId),
    queryFn: () => listProjectItems(projectId),
    enabled: signedIn,
  });

  const session = useQuery({
    queryKey: qk.workspace.session(projectId),
    queryFn: () => getCarriedSession(projectId),
    enabled: signedIn,
  });

  const invalidate = () => {
    void client.invalidateQueries({ queryKey: qk.workspace.items(projectId) });
    void client.invalidateQueries({ queryKey: qk.workspace.project(projectId) });
    void client.invalidateQueries({ queryKey: qk.workspace.projects() });
  };

  const drop = useMutation({
    mutationFn: (itemId: string) => removeProjectItem(projectId, itemId),
    onSuccess: invalidate,
  });

  const pin = useMutation({
    mutationFn: ({ itemId, pinned }: { itemId: string; pinned: boolean }) =>
      pinProjectItem(projectId, itemId, pinned),
    onSuccess: invalidate,
  });

  const clearSession = useMutation({
    mutationFn: () => clearCarriedSession(projectId),
    onSuccess: () => {
      toast.success("Carried figures cleared");
      void client.invalidateQueries({ queryKey: qk.workspace.session(projectId) });
    },
  });

  const share = useMutation({
    mutationFn: (visibility: "private" | "team") =>
      updateProjectVisibility(projectId, visibility),
    onSuccess: (updated) => {
      toast.success(
        updated.visibility === "team"
          ? "Shared — every team member can now see it"
          : "Private again — only you can see it",
      );
      invalidate();
    },
    onError: () => toast.error("Could not change the visibility."),
  });

  if (!signedIn) {
    return (
      <Panel>
        <PanelBody>
          <EmptyState
            icon={<FolderIcon className="size-4" aria-hidden />}
            title="Sign in to open this project"
            action={
              <Button asChild size="sm">
                <Link href="/login">Sign in</Link>
              </Button>
            }
          />
        </PanelBody>
      </Panel>
    );
  }

  // A project that is not yours reads as one that does not exist. The API
  // returns 404 for both cases on purpose (ownership scoping is applied in the
  // query, not checked after), and the UI must not undo that by distinguishing
  // them.
  if (project.error instanceof ApiError && project.error.status === 404) notFound();
  if (project.isPending || !project.data) return <Skeleton className="h-64 rounded-md" />;

  const rows = items.data ?? [];
  const carried = Object.entries(session.data?.session_state ?? {});

  return (
    <div className="flex flex-col gap-4">
      <Button asChild variant="ghost" size="sm" className="self-start">
        <Link href="/projects">
          <ArrowLeftIcon className="size-3.5" aria-hidden />
          All projects
        </Link>
      </Button>

      <Panel>
        <PanelHeader
          icon={<FolderIcon className="size-4" aria-hidden />}
          title={
            project.data.visibility === "team" ? (
              <span className="flex items-center gap-2">
                {project.data.name}
                <Badge variant="outline">team</Badge>
              </span>
            ) : (
              project.data.name
            )
          }
          description={
            project.data.description ??
            `${rows.length} item${rows.length === 1 ? "" : "s"} · updated ${relativeAge(project.data.updated_at)}`
          }
          actions={
            currentOrg && project.data.is_yours ? (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                disabled={share.isPending}
                onClick={() =>
                  share.mutate(project.data.visibility === "team" ? "private" : "team")
                }
              >
                <UsersIcon className="size-3.5" aria-hidden />
                {project.data.visibility === "team" ? "Make private" : "Share with team"}
              </Button>
            ) : null
          }
        />
        <PanelBody className="flex flex-col gap-1.5">
          {rows.length === 0 ? (
            <p className="text-xs text-fg-muted">
              Nothing in here yet. Keep a run or a stack, then add it to this project.
            </p>
          ) : (
            rows.map((item) => (
              <div key={item.id} className="flex items-center gap-2 text-xs">
                <Badge variant="outline">{item.item_type}</Badge>
                {item.href && item.title ? (
                  <Link
                    href={item.href}
                    className="min-w-0 flex-1 truncate text-fg hover:underline"
                  >
                    {item.title}
                  </Link>
                ) : (
                  <span className="min-w-0 flex-1 truncate text-fg-muted italic">
                    No longer available
                  </span>
                )}
                {item.subtitle ? (
                  <span className="shrink-0 truncate text-[11px] text-fg-muted">
                    {item.subtitle}
                  </span>
                ) : null}
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="size-6"
                  aria-label={
                    item.pinned ? `Unpin ${item.title ?? "item"}` : `Pin ${item.title ?? "item"}`
                  }
                  aria-pressed={item.pinned}
                  onClick={() => pin.mutate({ itemId: item.id, pinned: !item.pinned })}
                >
                  <PinIcon
                    className={item.pinned ? "size-3 text-ember" : "size-3 text-fg-muted"}
                    aria-hidden
                  />
                </Button>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="size-6"
                  aria-label={`Remove ${item.title ?? "item"}`}
                  onClick={() => drop.mutate(item.id)}
                >
                  <Trash2Icon className="size-3" aria-hidden />
                </Button>
              </div>
            ))
          )}
        </PanelBody>
      </Panel>

      <Panel>
        <PanelHeader
          title="Carried figures"
          description="What this project hands forward when you open a tool from it."
          actions={
            carried.length > 0 ? (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                disabled={clearSession.isPending}
                onClick={() => clearSession.mutate()}
              >
                Clear
              </Button>
            ) : null
          }
        />
        <PanelBody>
          {carried.length === 0 ? (
            <p className="text-xs text-fg-muted">
              Nothing carried yet. Run a tool from this project and the figures it produces are
              offered to the next one.
            </p>
          ) : (
            <dl className="grid gap-1.5 sm:grid-cols-2">
              {carried.map(([key, value]) => (
                <div key={key} className="flex items-baseline gap-2 text-xs">
                  <dt className="shrink-0 text-fg-muted">{key}</dt>
                  <dd className="min-w-0 truncate font-mono text-fg tabular-nums">
                    {typeof value === "object" ? JSON.stringify(value) : String(value)}
                  </dd>
                </div>
              ))}
            </dl>
          )}
        </PanelBody>
      </Panel>

      {/* Team surfaces (M21). Both render nothing on a private project. */}
      <ApprovalPanel resourceType="project" resourceId={projectId} />
      <CommentThread resourceType="project" resourceId={projectId} />
    </div>
  );
}
