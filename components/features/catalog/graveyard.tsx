"use client";

import { ArrowRightIcon, FlagIcon, SkullIcon } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import toast from "react-hot-toast";

import { PageHeader } from "@/components/forge/page-header";
import { EmptyState, Panel, PanelBody } from "@/components/forge/panel";
import { Disclaimer } from "@/components/legal/disclaimer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { flagCatalogEntry } from "@/lib/api/catalog";
import { useGraveyard } from "@/lib/api/hooks";
import { relativeAge } from "@/lib/format";
import * as legal from "@/lib/legal/disclaimers";
import { cn } from "@/lib/utils";

/**
 * The Tool Graveyard.
 *
 * Reads `tool_catalog.status` and `status_reason` directly, so an editor
 * changing a status in the database changes this page on the next request
 * with no deploy. That is `PRD.md` §22, and it is the reason status is a
 * column rather than a constant.
 */

const STATUS_LABEL: Record<string, string> = {
  deprecated: "Deprecated",
  not_for_production: "Not for production",
};

export function Graveyard() {
  const { data, isPending } = useGraveyard();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string | null>(null);

  const categories = useMemo(
    () => [...new Set((data ?? []).map((entry) => entry.category))].sort(),
    [data],
  );

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return (data ?? []).filter((entry) => {
      if (category && entry.category !== category) return false;
      if (!needle) return true;
      return `${entry.name} ${entry.slug} ${entry.status_reason}`.toLowerCase().includes(needle);
    });
  }, [data, query, category]);

  return (
    <>
      <PageHeader
        eyebrow="Catalog"
        title="Tool Graveyard"
        description="Tools we would not put in a production stack today, why, and what to use instead. Each entry is an editorial judgement with a date on it."
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search the graveyard…"
          className="h-9 max-w-xs"
          aria-label="Search buried tools"
        />
        <div className="flex flex-wrap gap-1.5">
          <FilterChip active={category === null} onClick={() => setCategory(null)}>
            All
          </FilterChip>
          {categories.map((value) => (
            <FilterChip key={value} active={category === value} onClick={() => setCategory(value)}>
              {value.replace(/-/g, " ")}
            </FilterChip>
          ))}
        </div>
      </div>

      {isPending ? (
        <div className="flex flex-col gap-3">
          {[0, 1, 2].map((index) => (
            <Skeleton key={index} className="h-28 rounded-md" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Panel>
          <EmptyState
            icon={<SkullIcon className="size-4" aria-hidden />}
            title="Nothing buried here"
            description={
              query || category
                ? "No tool matches that filter."
                : "Every tool in the catalog is currently in good standing."
            }
          />
        </Panel>
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map((entry) => (
            <Panel key={entry.slug}>
              <PanelBody className="flex flex-col gap-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-[15px] font-semibold text-fg">{entry.name}</h2>
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-[10px]",
                          entry.status === "not_for_production"
                            ? "border-danger-line text-danger"
                            : "border-warning-line text-warning",
                        )}
                      >
                        {STATUS_LABEL[entry.status] ?? entry.status}
                      </Badge>
                      <Badge variant="secondary" className="text-[10px] font-normal">
                        {entry.category.replace(/-/g, " ")}
                      </Badge>
                    </div>
                    <p className="mt-1 text-[13px] leading-relaxed text-fg-muted">
                      {entry.description}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <span className="text-[11px] text-fg-subtle">
                      reviewed {relativeAge(entry.last_reviewed_at)}
                    </span>
                    <SuggestCorrection slug={entry.slug} name={entry.name} />
                  </div>
                </div>

                <div className="rounded-md border border-line bg-surface-2/50 px-3 py-2.5">
                  <p className="text-[11px] font-medium tracking-[0.05em] text-fg-muted uppercase">
                    Why
                  </p>
                  <p className="mt-1 text-[13px] leading-relaxed text-fg">{entry.status_reason}</p>
                </div>

                {entry.alternative_tools?.length ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[11px] font-medium tracking-[0.05em] text-fg-muted uppercase">
                      Use instead
                    </span>
                    {entry.alternative_tools?.map((alternative) => (
                      <Link
                        key={alternative.slug}
                        href={alternative.docs_url ?? "#"}
                        target={alternative.docs_url ? "_blank" : undefined}
                        rel={alternative.docs_url ? "noreferrer" : undefined}
                        className="inline-flex items-center gap-1 rounded-full border border-success-line bg-success-quiet px-2.5 py-1 text-xs font-medium text-success transition-opacity hover:opacity-80"
                      >
                        {alternative.name}
                        <ArrowRightIcon className="size-3" aria-hidden />
                      </Link>
                    ))}
                  </div>
                ) : null}
              </PanelBody>
            </Panel>
          ))}
          {/* Once, under the list, rather than on every card. Each entry
              already carries its own review date and its own correction
              button; repeating the sentence nine times would bury the dates
              that make it meaningful. */}
          <Disclaimer>{legal.CATALOG}</Disclaimer>
        </div>
      )}
    </>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "rounded-full border px-2.5 py-1 text-xs capitalize transition-colors",
        active
          ? "border-ember-line bg-ember-quiet text-ember"
          : "border-line bg-surface text-fg-muted hover:border-line-strong hover:text-fg",
      )}
    >
      {children}
    </button>
  );
}

/**
 * "Suggest a correction", per entry.
 *
 * The checklist asks for this on every tool page and gives the reason plainly:
 * a standing, visible correction process is what you point at when a vendor
 * disputes how their tool is described here. A burial notice is the page most
 * likely to be disputed, which is why it is the page that carries it.
 *
 * Posts to the same endpoint the comparison matrix flags from, so corrections
 * land in one editorial queue rather than two.
 */
function SuggestCorrection({ slug, name }: { slug: string; name: string }) {
  const [sent, setSent] = useState(false);

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="h-6 px-1.5 text-[11px] text-fg-subtle"
      disabled={sent}
      onClick={async () => {
        try {
          await flagCatalogEntry({
            entity_type: "tool",
            entity_id: slug,
            note: `Correction suggested for ${name} from the tool graveyard.`,
          });
          setSent(true);
          toast.success("Sent for editorial review. Thank you.");
        } catch {
          toast.error("Could not send that. Try again in a moment.");
        }
      }}
    >
      <FlagIcon className="size-3" aria-hidden />
      {sent ? "Sent" : "Suggest a correction"}
    </Button>
  );
}
