"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { BookOpenIcon, PlayIcon, SparklesIcon, ZapIcon } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo } from "react";
import { useForm, useWatch } from "react-hook-form";
import toast from "react-hot-toast";

import { FieldControl } from "@/components/features/tools/field-control";
import { QuotaDialog } from "@/components/features/tools/quota-dialog";
import { ResultBlockRenderer } from "@/components/features/tools/result-blocks";
import { PageHeader } from "@/components/forge/page-header";
import { EmptyState, Panel, PanelBody, PanelFooter, PanelHeader } from "@/components/forge/panel";
import { ProvenanceChip } from "@/components/forge/provenance-chip";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ApiError } from "@/lib/api/errors";
import { qk } from "@/lib/api/query-keys";
import { runTool, type ToolRunResult } from "@/lib/api/tools";
import { useToolUrlState } from "@/lib/tools/url-state";
import type { ToolSpec } from "@/lib/tools/spec";
import { duration } from "@/lib/format";
import { getToolsByGroup } from "@/lib/tools/registry";

/**
 * One component, 28 tools.
 *
 * Everything cross-cutting lives here: validation, 422 field mapping, the 402
 * quota dialog, provenance, URL round-tripping, and the four result states.
 * A tool that supplies `result.component` still gets all of it — the escape
 * hatch replaces the *rendering*, not the machinery.
 */

type Values = Record<string, unknown>;

export function ToolPage({ spec }: { spec: ToolSpec }) {
  const queryClient = useQueryClient();
  const [urlState, setUrlState] = useToolUrlState(spec);

  const form = useForm<Values>({
    resolver: zodResolver(spec.input as never),
    defaultValues: { ...spec.defaults, ...urlState },
    mode: "onSubmit",
  });

  const values = useWatch({ control: form.control }) as Values;

  const mutation = useMutation({
    mutationFn: (input: Values) => runTool(spec.endpoint, input),
    onSuccess: (data) => {
      // Seed the cache under the run id so a share or save is instant rather
      // than a second round trip for data we already hold.
      queryClient.setQueryData(qk.runs.result(data.run_id), data);
      void queryClient.invalidateQueries({ queryKey: qk.runs.quota() });
      void queryClient.invalidateQueries({ queryKey: qk.runs.list() });
    },
    onError: (error) => {
      if (!(error instanceof ApiError)) {
        toast.error("Something went wrong. Try again.");
        return;
      }
      // A 422 belongs on the fields, not in a toast. A toast for a field
      // error makes the user hunt for which input was wrong.
      if (error.code === "VALIDATION_ERROR") {
        for (const field of error.fieldErrors) {
          form.setError(field.path as never, { message: field.message });
        }
        return;
      }
      if (error.code === "QUOTA_EXCEEDED" || error.code === "PLAN_REQUIRED") return;
      toast.error(error.message);
    },
  });

  // Keep the URL in step with a successful run, so the configured tool is
  // linkable and the back button restores what was on screen.
  useEffect(() => {
    if (mutation.isSuccess) setUrlState(form.getValues());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mutation.isSuccess]);

  const related = useMemo(
    () =>
      (spec.relatedTools ?? [])
        .map((slug) => getToolsByGroup(spec.group).find((tool) => tool.slug === slug))
        .filter((tool): tool is ToolSpec => Boolean(tool)),
    [spec],
  );

  const quotaError =
    mutation.error instanceof ApiError && mutation.error.code === "QUOTA_EXCEEDED"
      ? mutation.error
      : null;

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        eyebrow={spec.eyebrow}
        title={spec.title}
        description={spec.summary}
        actions={
          <div className="flex items-center gap-2">
            {spec.tier !== "free" ? (
              <Badge variant="outline" className="border-forge-line text-forge">
                {spec.tier}
              </Badge>
            ) : null}
            {spec.docsHref ? (
              <Button asChild variant="ghost" size="sm">
                <Link href={spec.docsHref}>
                  <BookOpenIcon className="size-3.5" aria-hidden />
                  Docs
                </Link>
              </Button>
            ) : null}
          </div>
        }
      />

      <div className="grid gap-5 lg:grid-cols-[minmax(320px,380px)_minmax(0,1fr)] lg:items-start">
        <Panel className="lg:sticky lg:top-4">
          <form
            onSubmit={form.handleSubmit((input) => mutation.mutate(input))}
            noValidate
            className="contents"
          >
            {spec.presets?.length ? (
              <div className="flex flex-wrap gap-1.5 border-b border-line px-4 py-3">
                {spec.presets.map((preset) => (
                  <button
                    key={preset.label}
                    type="button"
                    title={preset.description}
                    onClick={() => {
                      form.reset({ ...spec.defaults, ...preset.values });
                      form.clearErrors();
                    }}
                    className="rounded-full border border-line bg-surface px-2.5 py-1 text-xs text-fg-muted transition-colors hover:border-line-strong hover:text-fg"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            ) : null}

            <PanelBody className="grid gap-4 sm:grid-cols-12">
              {spec.fields.map((field) => (
                <FieldControl
                  key={field.name}
                  field={field}
                  control={form.control}
                  errors={form.formState.errors}
                  values={values}
                />
              ))}
            </PanelBody>

            <PanelFooter>
              <span className="text-xs text-fg-subtle">
                {mutation.data ? `Ran in ${duration(mutation.data.duration_ms)}` : " "}
              </span>
              <Button type="submit" size="sm" disabled={mutation.isPending}>
                <PlayIcon className="size-3.5" aria-hidden />
                {mutation.isPending ? "Calculating…" : (spec.submitLabel ?? "Calculate")}
              </Button>
            </PanelFooter>
          </form>
        </Panel>

        {/* The result column reserves its height while pending, so submitting
            does not shove the page around. */}
        <div className="flex min-h-[420px] flex-col gap-4">
          <ResultArea spec={spec} result={mutation.data} isPending={mutation.isPending} />
          {related.length ? <RelatedTools tools={related} /> : null}
        </div>
      </div>

      <QuotaDialog error={quotaError} onClose={() => mutation.reset()} />
    </div>
  );
}

function ResultArea({
  spec,
  result,
  isPending,
}: {
  spec: ToolSpec;
  result: ToolRunResult | undefined;
  isPending: boolean;
}) {
  if (isPending) return <ResultSkeleton />;

  if (!result) {
    return (
      <Panel className="flex-1">
        <EmptyState
          icon={<ZapIcon className="size-4" aria-hidden />}
          title="No result yet"
          description={`Fill in the form and run ${spec.title.toLowerCase()} to see figures here.`}
        />
      </Panel>
    );
  }

  const Bespoke = spec.result.component;

  return (
    <>
      {Bespoke ? (
        <Bespoke data={result} />
      ) : (
        spec.result.blocks.map((block, index) => (
          <ResultBlockRenderer key={`${block.kind}-${index}`} block={block} data={result} />
        ))
      )}
      <ProvenanceFooter result={result} />
    </>
  );
}

function ResultSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <div className="grid divide-line overflow-hidden rounded-md border border-line bg-surface sm:grid-cols-4 sm:divide-x">
        {[0, 1, 2, 3].map((index) => (
          <div key={index} className="flex flex-col gap-2 px-4 py-3.5">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-6 w-16" />
          </div>
        ))}
      </div>
      <Skeleton className="h-56 rounded-md" />
      <Skeleton className="h-40 rounded-md" />
    </div>
  );
}

/**
 * The verification dates of the exact catalog rows this run read — not a
 * global "catalog updated" date, which is true and useless.
 */
function ProvenanceFooter({ result }: { result: ToolRunResult }) {
  const sources = result.provenance?.sources ?? [];

  return (
    <div className="flex flex-wrap items-center gap-2 px-1 py-1">
      <ProvenanceChip variant="computed" />
      {sources.map((source) => (
        <ProvenanceChip
          key={source.url}
          variant="verified"
          verifiedAt={source.last_verified_at}
          source={{ name: source.name, url: source.url }}
        />
      ))}
      {result.ai ? (
        <ProvenanceChip
          variant="synthesised"
          model={result.ai.model}
          promptVersion={result.ai.prompt_version}
        />
      ) : null}
    </div>
  );
}

function RelatedTools({ tools }: { tools: ToolSpec[] }) {
  return (
    <Panel>
      <PanelHeader title="Related" icon={<SparklesIcon className="size-3.5" aria-hidden />} />
      <ul className="divide-y divide-line">
        {tools.map((tool) => (
          <li key={tool.slug}>
            <Link
              href={`/${tool.group}/${tool.slug}`}
              className="flex flex-col gap-0.5 px-4 py-2.5 hover:bg-surface-2/60"
            >
              <span className="text-[13px] font-medium text-fg">{tool.title}</span>
              <span className="text-xs text-fg-muted">{tool.summary}</span>
            </Link>
          </li>
        ))}
      </ul>
    </Panel>
  );
}
