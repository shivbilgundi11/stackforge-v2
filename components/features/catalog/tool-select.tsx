"use client";

import { CheckIcon, ChevronsUpDownIcon, SkullIcon, XIcon } from "lucide-react";
import { useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { CatalogTool } from "@/lib/api/catalog";
import { useTools } from "@/lib/api/hooks";
import { cn } from "@/lib/utils";

/**
 * The tool picker. Single or multiple, grouped by category.
 *
 * Lifecycle status is shown on every row, so choosing a deprecated tool is a
 * decision rather than an accident.
 */

const STATUS_TONE: Record<string, string> = {
  recommended: "border-success-line text-success",
  stable: "border-line text-fg-muted",
  caution: "border-warning-line text-warning",
  deprecated: "border-danger-line text-danger",
  not_for_production: "border-danger-line text-danger",
};

export function ToolSelect({
  value,
  onChange,
  category,
  multiple = false,
  max,
  placeholder = "Select a tool",
  disabled,
  id,
}: {
  value: string | string[] | undefined;
  onChange: (value: string | string[]) => void;
  category?: string;
  multiple?: boolean;
  max?: number;
  placeholder?: string;
  disabled?: boolean;
  id?: string;
}) {
  const [open, setOpen] = useState(false);
  const { data: tools, isPending } = useTools(category ? { category } : {});

  const selected = useMemo(() => (Array.isArray(value) ? value : value ? [value] : []), [value]);
  const bySlug = useMemo(() => new Map((tools ?? []).map((tool) => [tool.slug, tool])), [tools]);
  const grouped = useMemo(() => groupByCategory(tools ?? []), [tools]);

  const atLimit = multiple && max !== undefined && selected.length >= max;

  function toggle(slug: string) {
    if (!multiple) {
      onChange(slug);
      setOpen(false);
      return;
    }
    const next = selected.includes(slug)
      ? selected.filter((item) => item !== slug)
      : atLimit
        ? selected
        : [...selected, slug];
    onChange(next);
  }

  return (
    <div className="flex flex-col gap-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            id={id}
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            disabled={disabled || isPending}
            className="h-9 w-full justify-between px-3 font-normal"
          >
            <span className="truncate">
              {selected.length === 0 ? (
                <span className="text-fg-subtle">{isPending ? "Loading tools…" : placeholder}</span>
              ) : multiple ? (
                `${selected.length} selected${max ? ` of ${max}` : ""}`
              ) : (
                (bySlug.get(selected[0] ?? "")?.name ?? selected[0])
              )}
            </span>
            <ChevronsUpDownIcon className="size-3.5 shrink-0 opacity-50" aria-hidden />
          </Button>
        </PopoverTrigger>

        <PopoverContent
          className="w-[--radix-popover-trigger-width] min-w-[320px] p-0"
          align="start"
        >
          <Command>
            <CommandInput placeholder="Search tools…" className="h-9" />
            <CommandList className="max-h-[320px]">
              <CommandEmpty>No tool matches.</CommandEmpty>
              {grouped.map(([group, groupTools]) => (
                <CommandGroup key={group} heading={group}>
                  {groupTools.map((tool) => {
                    const isSelected = selected.includes(tool.slug);
                    return (
                      <CommandItem
                        key={tool.slug}
                        value={`${tool.name} ${tool.slug} ${(tool.tags ?? []).join(" ")}`}
                        onSelect={() => toggle(tool.slug)}
                        // A disabled row at the limit still reads as
                        // selectable unless it also looks disabled.
                        disabled={atLimit && !isSelected}
                        className="gap-2"
                      >
                        <CheckIcon
                          className={cn(
                            "size-3.5 shrink-0",
                            isSelected ? "opacity-100" : "opacity-0",
                          )}
                          aria-hidden
                        />
                        <span className="min-w-0 flex-1 truncate">{tool.name}</span>
                        {tool.status === "deprecated" || tool.status === "not_for_production" ? (
                          <SkullIcon className="size-3 shrink-0 text-danger" aria-hidden />
                        ) : null}
                        <Badge
                          variant="outline"
                          className={cn("shrink-0 text-[10px]", STATUS_TONE[tool.status])}
                        >
                          {tool.status.replace(/_/g, " ")}
                        </Badge>
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              ))}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {multiple && selected.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {selected.map((slug) => (
            <Badge key={slug} variant="secondary" className="gap-1 pr-1 font-normal">
              {bySlug.get(slug)?.name ?? slug}
              <button
                type="button"
                onClick={() => toggle(slug)}
                className="rounded-xs p-0.5 text-fg-subtle hover:text-fg"
                aria-label={`Remove ${bySlug.get(slug)?.name ?? slug}`}
              >
                <XIcon className="size-3" aria-hidden />
              </button>
            </Badge>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function groupByCategory(tools: CatalogTool[]): [string, CatalogTool[]][] {
  const groups = new Map<string, CatalogTool[]>();
  for (const tool of tools) {
    const label = tool.category.replace(/-/g, " ");
    const bucket = groups.get(label);
    if (bucket) bucket.push(tool);
    else groups.set(label, [tool]);
  }
  return [...groups.entries()].sort(([a], [b]) => a.localeCompare(b));
}
