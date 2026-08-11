"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CheckIcon,
  CopyIcon,
  DownloadIcon,
  FileTextIcon,
  FolderPlusIcon,
  LockIcon,
  Share2Icon,
} from "lucide-react";
import { useState } from "react";
import toast from "react-hot-toast";

import { ExportProgress } from "@/components/features/exports/export-progress";
import { ShareDialog } from "@/components/features/exports/share-dialog";
import { UpgradeDialog } from "@/components/features/exports/upgrade-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ApiError } from "@/lib/api/errors";
import {
  createExport,
  downloadExport,
  getExportOptions,
  readExport,
  type ExportFormat,
  type ExportRecord,
  type FormatOption,
  type SourceType,
} from "@/lib/api/exports";
import { qk } from "@/lib/api/query-keys";
import { addProjectItem, listProjects } from "@/lib/api/workspace";
import { useAuth } from "@/lib/auth/auth-provider";
import { cn } from "@/lib/utils";

/**
 * The artifact tray (M18).
 *
 * `PRD.md` §18 names export as the primary Pro conversion trigger, which makes
 * this bar both a feature and the paywall. Two rules follow from that and both
 * are visible in the markup:
 *
 * **Locked formats are shown, not hidden.** A `LockIcon` and a plan badge, and
 * clicking one opens the upgrade dialog rather than doing nothing. A user who
 * never learns PDF export exists never upgrades for it.
 *
 * **Markdown is never locked.** The free format is complete and first in the
 * row, so the answer is takeable before any of this is a decision.
 */

export function ArtifactTray({
  sourceType,
  sourceId,
}: {
  sourceType: SourceType;
  sourceId: string;
}) {
  const [artifactType, setArtifactType] = useState<string | null>(null);
  const [locked, setLocked] = useState<FormatOption | null>(null);
  const [share, setShare] = useState(false);
  const [lastExport, setLastExport] = useState<ExportRecord | null>(null);
  const [copied, setCopied] = useState(false);

  const options = useQuery({
    queryKey: qk.exports.options(sourceType, sourceId),
    queryFn: () => getExportOptions(sourceType, sourceId),
    // A result that has not been saved yet has nothing to export from, and the
    // 404 that produces is expected rather than an error worth retrying.
    retry: false,
  });

  const exporter = useMutation({
    mutationFn: (variables: { format: ExportFormat; table?: string }) =>
      createExport({
        source_type: sourceType,
        source_id: sourceId,
        format: variables.format,
        artifact_type: artifactType,
        ...(variables.table ? { table: variables.table } : {}),
      }),
    onError: (error) => {
      if (error instanceof ApiError && error.code === "PLAN_REQUIRED") return;
      toast.error(error instanceof ApiError ? error.message : "That export failed.");
    },
  });

  if (options.isError || !options.data) return null;
  // `tables` has a server-side default, so the generated type makes it
  // optional. Defaulted here rather than asserted — a result with nothing
  // rectangular is a normal state, not a missing field.
  const { artifacts, formats } = options.data;
  const tables = options.data.tables ?? [];

  const chosen = artifacts.find((artifact) => artifact.type === artifactType) ?? null;

  const run = async (format: FormatOption) => {
    if (!format.available) {
      setLocked(format);
      return;
    }
    // CSV over a result with several tables needs to know which one. Asking
    // here beats a 422 the user has to interpret.
    const table = format.format === "csv" && tables.length > 1 ? tables[0] : undefined;
    const record = await exporter.mutateAsync({
      format: format.format,
      ...(table ? { table } : {}),
    });
    setLastExport(record);

    if (record.status === "ready") {
      await downloadExport(record);
      return;
    }
    toast.success("Building your bundle. It will download when it is ready.");
  };

  return (
    <>
      <div className="sticky bottom-0 z-10 -mx-1 flex flex-col gap-2 rounded-md border border-line bg-surface/95 px-3 py-2.5 backdrop-blur supports-[backdrop-filter]:bg-surface/80">
        <div className="flex flex-wrap items-center gap-2">
          <FileTextIcon className="size-3.5 shrink-0 text-fg-muted" aria-hidden />
          <span className="text-xs font-medium text-fg">Export</span>

          {artifacts.length > 0 ? (
            <Select
              value={artifactType ?? "__all__"}
              onValueChange={(value) => setArtifactType(value === "__all__" ? null : value)}
            >
              <SelectTrigger size="sm" className="w-56" aria-label="What to export">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">The whole result</SelectItem>
                {artifacts.map((artifact) => (
                  <SelectItem key={artifact.type} value={artifact.type}>
                    {artifact.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : null}

          <div className="ml-auto flex flex-wrap items-center gap-1.5">
            {formats.map((format) => (
              <FormatButton
                key={format.format}
                format={format}
                pending={exporter.isPending && exporter.variables?.format === format.format}
                onClick={() => void run(format)}
              />
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 border-t border-line pt-2">
          <div className="min-w-0 flex-1">
            {lastExport?.status === "pending" ? (
              <ExportProgress record={lastExport} onSettled={setLastExport} />
            ) : (
              <p className="truncate text-[11px] text-fg-subtle">
                {chosen
                  ? `${chosen.filename} — ${chosen.description}`
                  : "Everything on this page, in one file."}
              </p>
            )}
          </div>

          <Button
            type="button"
            size="sm"
            variant="ghost"
            disabled={exporter.isPending}
            onClick={async () => {
              const record = await exporter.mutateAsync({ format: "markdown" });
              await navigator.clipboard.writeText(await readExport(record));
              setCopied(true);
              setTimeout(() => setCopied(false), 1600);
              toast.success("Copied as Markdown");
            }}
          >
            {copied ? (
              <CheckIcon className="size-3.5" aria-hidden />
            ) : (
              <CopyIcon className="size-3.5" aria-hidden />
            )}
            Copy
          </Button>

          <SaveToProject exportRecord={lastExport} />

          <Button type="button" size="sm" variant="outline" onClick={() => setShare(true)}>
            <Share2Icon className="size-3.5" aria-hidden />
            Share
          </Button>
        </div>
      </div>

      <UpgradeDialog format={locked} onClose={() => setLocked(null)} />
      <ShareDialog
        open={share}
        onOpenChange={setShare}
        targetType={sourceType}
        targetId={sourceId}
        artifactType={artifactType}
        artifactLabel={chosen?.label ?? null}
      />
    </>
  );
}

function FormatButton({
  format,
  pending,
  onClick,
}: {
  format: FormatOption;
  pending: boolean;
  onClick: () => void;
}) {
  return (
    <Button
      type="button"
      size="sm"
      variant={format.format === "markdown" ? "default" : "outline"}
      disabled={pending}
      onClick={onClick}
      // The lock is announced, not only drawn. A badge that only exists in
      // colour and an icon is a badge a screen reader user never receives.
      aria-label={
        format.available
          ? `Export as ${format.label}`
          : `Export as ${format.label} — requires the ${format.required_plan} plan`
      }
      className={cn(!format.available && "text-fg-muted")}
    >
      {format.available ? (
        <DownloadIcon className="size-3.5" aria-hidden />
      ) : (
        <LockIcon className="size-3.5" aria-hidden />
      )}
      {format.label}
      {format.available ? null : (
        <Badge
          variant="outline"
          className="ml-1 border-forge-line px-1 py-0 text-[10px] text-forge"
        >
          {format.required_plan}
        </Badge>
      )}
    </Button>
  );
}

/**
 * Filing a rendered export into a project.
 *
 * Only offered once something has actually been exported — the thing a project
 * holds is the rendered artifact, so there is nothing to file before then.
 * Hidden entirely when there are no projects, for the same reason `SaveRun`
 * hides its picker: an empty dropdown beside a result is an upsell in the place
 * someone came for an answer.
 */
function SaveToProject({ exportRecord }: { exportRecord: ExportRecord | null }) {
  const { status } = useAuth();
  const client = useQueryClient();

  const projects = useQuery({
    queryKey: qk.workspace.projects(),
    queryFn: listProjects,
    enabled: status === "authenticated",
  });

  const add = useMutation({
    mutationFn: (projectId: string) =>
      addProjectItem(projectId, { item_type: "artifact", item_id: exportRecord!.id }),
    onSuccess: (_result, projectId) => {
      toast.success("Filed in your project");
      void client.invalidateQueries({ queryKey: qk.workspace.items(projectId) });
    },
    onError: () => toast.error("Could not file that export."),
  });

  const rows = projects.data ?? [];
  if (!exportRecord || exportRecord.status !== "ready" || rows.length === 0) return null;

  return (
    <Select onValueChange={(value) => add.mutate(value)} disabled={add.isPending}>
      <SelectTrigger size="sm" className="w-44" aria-label="File this export in a project">
        <FolderPlusIcon className="size-3.5" aria-hidden />
        <SelectValue placeholder="Save to project" />
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
