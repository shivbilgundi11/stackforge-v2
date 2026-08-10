"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BookmarkCheckIcon, BookmarkIcon, FolderPlusIcon } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import toast from "react-hot-toast";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { qk } from "@/lib/api/query-keys";
import { addProjectItem, listProjects, saveRun, unsaveRun } from "@/lib/api/workspace";
import { useAuth } from "@/lib/auth/auth-provider";

/**
 * "Keep this" (M17).
 *
 * Every run is already logged and survives 30 days; saving is what exempts it
 * from the purge. The distinction is stated on the control rather than
 * assumed, because "save" in a product that already stored the thing means
 * nothing on its own.
 *
 * Signed out, this is the ask — and it is the highest-intent moment the
 * product gets, because the work is already done and the account is what
 * keeps it. It is a prompt, never a wall: the result is on screen and
 * exportable either way.
 */
export function SaveRun({ runId }: { runId: string }) {
  const { status } = useAuth();
  const client = useQueryClient();
  const [saved, setSaved] = useState(false);

  const mutation = useMutation({
    mutationFn: () => (saved ? unsaveRun(runId) : saveRun(runId)),
    onSuccess: (result) => {
      setSaved(result.saved);
      toast.success(result.saved ? "Kept in your workspace" : "No longer kept");
      void client.invalidateQueries({ queryKey: qk.workspace.dashboard() });
      void client.invalidateQueries({ queryKey: qk.runs.list() });
    },
    onError: () => toast.error("Could not save that run."),
  });

  if (status !== "authenticated") {
    return (
      <div className="flex flex-wrap items-center gap-2 rounded-md border border-line bg-surface-2/40 px-3 py-2">
        <BookmarkIcon className="size-3.5 shrink-0 text-fg-muted" aria-hidden />
        <span className="text-xs text-fg-muted">
          This result is kept for 30 days. An account keeps it for good.
        </span>
        <Button asChild size="sm" variant="outline" className="ml-auto">
          <Link href="/signup">Create an account</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        type="button"
        size="sm"
        variant={saved ? "outline" : "default"}
        disabled={mutation.isPending}
        onClick={() => mutation.mutate()}
      >
        {saved ? (
          <BookmarkCheckIcon className="size-3.5" aria-hidden />
        ) : (
          <BookmarkIcon className="size-3.5" aria-hidden />
        )}
        {saved ? "Kept" : "Keep this run"}
      </Button>
      <AddToProject runId={runId} />
    </div>
  );
}

/**
 * Filing a run into a project.
 *
 * Only rendered once a project exists — on Free there are none, and an empty
 * picker beside every result is an upsell in a place the user came to get an
 * answer. The dashboard is where projects get sold.
 */
function AddToProject({ runId }: { runId: string }) {
  const client = useQueryClient();

  const projects = useQuery({ queryKey: qk.workspace.projects(), queryFn: listProjects });

  const add = useMutation({
    mutationFn: (projectId: string) =>
      addProjectItem(projectId, { item_type: "run", item_id: runId }),
    onSuccess: (_result, projectId) => {
      toast.success("Added to project");
      void client.invalidateQueries({ queryKey: qk.workspace.items(projectId) });
      void client.invalidateQueries({ queryKey: qk.workspace.projects() });
    },
    onError: () => toast.error("Could not add that run to the project."),
  });

  const rows = projects.data ?? [];
  if (rows.length === 0) return null;

  return (
    <Select onValueChange={(value) => add.mutate(value)} disabled={add.isPending}>
      <SelectTrigger size="sm" className="w-48" aria-label="Add this run to a project">
        <FolderPlusIcon className="size-3.5" aria-hidden />
        <SelectValue placeholder="Add to project" />
      </SelectTrigger>
      <SelectContent>
        {rows.map((project) => (
          <SelectItem key={project.id} value={project.id}>
            {project.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
