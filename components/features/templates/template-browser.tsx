"use client";

import { useQuery } from "@tanstack/react-query";
import { LibraryIcon, SearchIcon, XIcon } from "lucide-react";
import { parseAsString, useQueryStates } from "nuqs";
import { useEffect, useState } from "react";

import { TemplateCard } from "@/components/features/templates/template-card";
import { EmptyState, Panel } from "@/components/forge/panel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { qk } from "@/lib/api/query-keys";
import { getFacets, listTemplates } from "@/lib/api/templates";
import { cn } from "@/lib/utils";

/**
 * Search and filter over the library (M19).
 *
 * Every control lives in the URL through `nuqs`, so a filtered view is
 * linkable, shareable, and indexable — which is most of why this module is an
 * acquisition surface rather than an internal browser. `history: "replace"`
 * keeps typing in the search box from filling the back stack with one entry
 * per keystroke.
 */

const FILTERS = {
  q: parseAsString.withDefault(""),
  category: parseAsString.withDefault(""),
  use_case: parseAsString.withDefault(""),
  difficulty: parseAsString.withDefault(""),
  plan: parseAsString.withDefault(""),
};

const CATEGORY_LABELS: Record<string, string> = {
  stack: "Stacks",
  blueprint: "Blueprints",
  "code-starter": "Starters",
  prompt: "Prompts",
  config: "Configs",
  checklist: "Checklists",
  business: "Business",
};

export function TemplateBrowser() {
  const [filters, setFilters] = useQueryStates(FILTERS, { history: "replace" });
  const [draft, setDraft] = useState(filters.q);

  // Debounced so typing does not fire a request per keystroke. The URL is
  // updated on the same beat, so the address bar never shows a query the
  // results do not reflect.
  useEffect(() => {
    const timer = setTimeout(() => {
      if (draft !== filters.q) void setFilters({ q: draft || null });
    }, 250);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft]);

  const facets = useQuery({ queryKey: qk.templates.facets(), queryFn: getFacets });

  const query = {
    ...(filters.q ? { q: filters.q } : {}),
    ...(filters.category ? { category: filters.category } : {}),
    ...(filters.use_case ? { use_case: filters.use_case } : {}),
    ...(filters.difficulty ? { difficulty: filters.difficulty } : {}),
    ...(filters.plan === "free" ? { premium: false } : {}),
    ...(filters.plan === "pro" ? { premium: true } : {}),
  };

  const templates = useQuery({
    queryKey: qk.templates.list(query),
    queryFn: () => listTemplates(query),
  });

  const active = Object.values(filters).filter(Boolean).length;
  const rows = templates.data ?? [];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3">
        <div className="relative">
          <SearchIcon
            className="pointer-events-none absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-fg-subtle"
            aria-hidden
          />
          <Input
            type="search"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Search templates — try 'chunking', 'agent safety', 'payback'"
            aria-label="Search templates"
            className="pl-9"
          />
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <FilterGroup
            label="Category"
            options={(facets.data?.categories ?? []).map((key) => ({
              value: key,
              label: CATEGORY_LABELS[key] ?? key,
            }))}
            value={filters.category}
            onChange={(value) => void setFilters({ category: value })}
          />
          <FilterGroup
            label="Difficulty"
            options={(facets.data?.difficulties ?? []).map((key) => ({
              value: key,
              label: key,
            }))}
            value={filters.difficulty}
            onChange={(value) => void setFilters({ difficulty: value })}
          />
          <FilterGroup
            label="Plan"
            options={[
              { value: "free", label: "Free" },
              { value: "pro", label: "Pro" },
            ]}
            value={filters.plan}
            onChange={(value) => void setFilters({ plan: value })}
          />

          {active > 0 ? (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => {
                setDraft("");
                void setFilters({
                  q: null,
                  category: null,
                  use_case: null,
                  difficulty: null,
                  plan: null,
                });
              }}
            >
              <XIcon className="size-3.5" aria-hidden />
              Clear
            </Button>
          ) : null}
        </div>
      </div>

      <p className="text-xs text-fg-subtle" role="status" aria-live="polite">
        {templates.isLoading
          ? "Searching…"
          : `${rows.length} ${rows.length === 1 ? "template" : "templates"}`}
      </p>

      {templates.isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2, 3, 4, 5].map((index) => (
            <Skeleton key={index} className="h-32 rounded-md" />
          ))}
        </div>
      ) : templates.isError ? (
        <Panel>
          <EmptyState
            title="Could not load the library"
            description="Reload the page. If it keeps happening, the API is not reachable."
          />
        </Panel>
      ) : rows.length === 0 ? (
        <Panel>
          <EmptyState
            icon={<LibraryIcon className="size-4" aria-hidden />}
            title="Nothing matches"
            description={
              filters.q
                ? `No template mentions "${filters.q}". Try a broader term, or clear the filters.`
                : "No template matches every filter. Try removing one."
            }
          />
        </Panel>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((template) => (
            <TemplateCard key={template.slug} template={template} />
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * A row of toggles rather than a select.
 *
 * Six categories fit on one line and a toggle shows what is available without
 * a click — a select hides the vocabulary behind an interaction, which on a
 * library someone is browsing is the wrong trade.
 */
function FilterGroup({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { value: string; label: string }[];
  value: string;
  onChange: (value: string | null) => void;
}) {
  if (options.length === 0) return null;

  return (
    <div className="flex items-center gap-1" role="group" aria-label={label}>
      {options.map((option) => {
        const selected = value === option.value;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={selected}
            onClick={() => onChange(selected ? null : option.value)}
            className={cn(
              "rounded-full border px-2.5 py-1 text-xs capitalize transition-colors",
              selected
                ? "border-forge-line bg-forge-quiet text-forge"
                : "border-line bg-surface text-fg-muted hover:border-line-strong hover:text-fg",
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
