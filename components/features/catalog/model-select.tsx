"use client";

import { CheckIcon, ChevronsUpDownIcon, TriangleAlertIcon } from "lucide-react";
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
import { useModels } from "@/lib/api/hooks";
import type { CatalogModel } from "@/lib/api/catalog";
import { compactNumber, perMillion } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * The model picker, used by a dozen tools.
 *
 * Price and lifecycle status are shown inline, before the calculation runs.
 * A user who picks a model and only then discovers what it costs has been
 * made to do the tool's job for it.
 */

export function ModelSelect({
  value,
  onChange,
  family = "chat",
  placeholder = "Select a model",
  disabled,
  id,
}: {
  value: string | undefined;
  onChange: (value: string) => void;
  family?: "chat" | "embedding" | "rerank";
  placeholder?: string;
  disabled?: boolean;
  id?: string;
}) {
  const [open, setOpen] = useState(false);
  const { data: models, isPending } = useModels({ family });

  const grouped = useMemo(() => groupByProvider(models ?? []), [models]);
  const selected = models?.find((model) => model.model_id === value);

  return (
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
          {selected ? (
            <span className="flex min-w-0 items-center gap-2">
              <span className="truncate">{selected.display_name}</span>
              <span className="shrink-0 text-xs text-fg-subtle tabular-nums">
                {perMillion(selected.input_cost_per_1k)}
              </span>
            </span>
          ) : (
            <span className="text-fg-subtle">{isPending ? "Loading models…" : placeholder}</span>
          )}
          <ChevronsUpDownIcon className="size-3.5 shrink-0 opacity-50" aria-hidden />
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-[--radix-popover-trigger-width] min-w-[340px] p-0" align="start">
        <Command
          filter={(itemValue, search) =>
            itemValue.toLowerCase().includes(search.toLowerCase()) ? 1 : 0
          }
        >
          <CommandInput placeholder="Search models…" className="h-9" />
          <CommandList className="max-h-[320px]">
            <CommandEmpty>No model matches.</CommandEmpty>
            {grouped.map(([provider, providerModels]) => (
              <CommandGroup key={provider} heading={provider}>
                {providerModels.map((model) => (
                  <CommandItem
                    key={model.id}
                    value={`${model.display_name} ${model.model_id} ${model.provider}`}
                    onSelect={() => {
                      onChange(model.model_id);
                      setOpen(false);
                    }}
                    className="gap-2"
                  >
                    <CheckIcon
                      className={cn(
                        "size-3.5 shrink-0",
                        model.model_id === value ? "opacity-100" : "opacity-0",
                      )}
                      aria-hidden
                    />
                    <span className="min-w-0 flex-1 truncate">{model.display_name}</span>
                    <ModelMeta model={model} />
                  </CommandItem>
                ))}
              </CommandGroup>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

function ModelMeta({ model }: { model: CatalogModel }) {
  return (
    <span className="flex shrink-0 items-center gap-2 text-xs">
      {model.status !== "active" ? (
        <Badge variant="outline" className="gap-1 border-warning-line text-warning">
          <TriangleAlertIcon className="size-2.5" aria-hidden />
          {model.status}
        </Badge>
      ) : null}
      {model.context_window ? (
        <span className="text-fg-subtle tabular-nums">{compactNumber(model.context_window)}</span>
      ) : null}
      <span className="w-[72px] text-right text-fg-muted tabular-nums">
        {perMillion(model.input_cost_per_1k)}
      </span>
    </span>
  );
}

/** Providers ordered by their cheapest model, so the list opens on value. */
function groupByProvider(models: CatalogModel[]): [string, CatalogModel[]][] {
  const groups = new Map<string, CatalogModel[]>();
  for (const model of models) {
    const bucket = groups.get(model.provider);
    if (bucket) bucket.push(model);
    else groups.set(model.provider, [model]);
  }
  return [...groups.entries()].sort(
    ([, a], [, b]) => Number(a[0]?.input_cost_per_1k ?? 0) - Number(b[0]?.input_cost_per_1k ?? 0),
  );
}
