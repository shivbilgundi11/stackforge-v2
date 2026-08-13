"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FolderIcon, PlusIcon, Trash2Icon } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import toast from "react-hot-toast";

import { EmptyState, Panel, PanelBody, PanelHeader } from "@/components/forge/panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ApiError } from "@/lib/api/errors";
import { qk } from "@/lib/api/query-keys";
import {
  createProject,
  deleteProject,
  listProjectItems,
  listProjects,
  removeProjectItem,
} from "@/lib/api/workspace";
import { useAuth } from "@/lib/auth/auth-provider";
import { relativeAge } from "@/lib/format";

/**
 * Projects — the container that turns a set of calculators into a workspace.
 *
 * Free plans have none, and the refusal says so rather than failing silently:
 * a 402 here is a pricing answer, and the panel renders it as one.
 */
export function Projects() {
  const { status } = useAuth();
  const client = useQueryClient();
  const [name, setName] = useState("");

  const projects = useQuery({
    queryKey: qk.workspace.projects(),
    queryFn: listProjects,
    enabled: status === "authenticated",
  });

  const create = useMutation({
    mutationFn: () => createProject({ name: name.trim() }),
    onSuccess: () => {
      setName("");
      toast.success("Project created");
      void client.invalidateQueries({ queryKey: qk.workspace.projects() });
      void client.invalidateQueries({ queryKey: qk.workspace.dashboard() });
    },
    onError: (error) => {
      // A quota refusal is a pricing answer, not a failure. Saying "something
      // went wrong" here would hide the upgrade path the 402 exists to offer.
      if (error instanceof ApiError && error.code === "QUOTA_EXCEEDED") {
        toast.error(error.message);
        return;
      }
      toast.error("Could not create that project.");
    },
  });

  const remove = useMutation({
    mutationFn: deleteProject,
    onSuccess: () => {
      toast.success("Project deleted — the runs and stacks it held are untouched");
      void client.invalidateQueries({ queryKey: qk.workspace.projects() });
      void client.invalidateQueries({ queryKey: qk.workspace.dashboard() });
    },
  });

  if (status !== "authenticated") {
    return (
      <Panel>
        <PanelBody>
          <EmptyState
            icon={<FolderIcon className="size-4" aria-hidden />}
            title="Sign in to use projects"
            description="A project groups the runs and stacks for one piece of work, and carries figures between the tools you use on it."
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

  if (projects.isPending) return <Skeleton className="h-64 rounded-md" />;

  const rows = projects.data ?? [];

  return (
    <div className="flex flex-col gap-4">
      <Panel>
        <PanelHeader title="New project" description="A container for one piece of work." />
        <PanelBody>
          <form
            className="flex flex-wrap gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              if (name.trim()) create.mutate();
            }}
          >
            <Input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Client X RAG rollout"
              aria-label="Project name"
              className="max-w-sm"
            />
            <Button type="submit" size="sm" disabled={!name.trim() || create.isPending}>
              <PlusIcon className="size-3.5" aria-hidden />
              Create
            </Button>
          </form>
        </PanelBody>
      </Panel>

      {rows.length === 0 ? (
        <Panel>
          <PanelBody>
            <EmptyState
              icon={<FolderIcon className="size-4" aria-hidden />}
              title="No projects yet"
              description="Group the runs and stacks for one piece of work, and keep the figures you carry between tools with it."
            />
          </PanelBody>
        </Panel>
      ) : (
        rows.map((project) => (
          <ProjectCard
            key={project.id}
            project={project}
            onDelete={() => remove.mutate(project.id)}
          />
        ))
      )}
    </div>
  );
}

function ProjectCard({
  project,
  onDelete,
}: {
  project: {
    id: string;
    name: string;
    use_case: string | null;
    item_count: number;
    updated_at: string;
  };
  onDelete: () => void;
}) {
  const client = useQueryClient();
  const items = useQuery({
    queryKey: qk.workspace.items(project.id),
    queryFn: () => listProjectItems(project.id),
  });

  const drop = useMutation({
    mutationFn: (itemId: string) => removeProjectItem(project.id, itemId),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: qk.workspace.items(project.id) });
      void client.invalidateQueries({ queryKey: qk.workspace.projects() });
    },
  });

  const rows = items.data ?? [];

  return (
    <Panel>
      <PanelHeader
        icon={<FolderIcon className="size-4" aria-hidden />}
        title={
          <Link href={`/projects/${project.id}`} className="hover:underline">
            {project.name}
          </Link>
        }
        description={`${project.item_count} item${project.item_count === 1 ? "" : "s"} · updated ${relativeAge(project.updated_at)}`}
        actions={
          <Button type="button" size="sm" variant="ghost" onClick={onDelete}>
            <Trash2Icon className="size-3.5" aria-hidden />
            Delete
          </Button>
        }
      />
      <PanelBody className="flex flex-col gap-1.5">
        {rows.length === 0 ? (
          <p className="text-xs text-fg-muted">
            Nothing in here yet. Keep a run or a stack and add it to this project.
          </p>
        ) : (
          rows.map((item) => (
            <div key={item.id} className="flex items-center gap-2 text-xs">
              <Badge variant="outline">{item.item_type}</Badge>
              {item.href && item.title ? (
                <Link href={item.href} className="min-w-0 flex-1 truncate text-fg hover:underline">
                  {item.title}
                </Link>
              ) : (
                // A dangling item is a real state — the polymorphic join
                // cannot be a foreign key — so it is shown rather than hidden.
                <span className="min-w-0 flex-1 truncate text-fg-muted italic">
                  No longer available
                </span>
              )}
              <span className="shrink-0 truncate text-[11px] text-fg-muted">{item.subtitle}</span>
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
  );
}
