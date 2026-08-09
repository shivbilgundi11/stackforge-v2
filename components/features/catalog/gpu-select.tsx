"use client";

import { CheckIcon, ChevronsUpDownIcon } from "lucide-react";
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
import type { CatalogGpu } from "@/lib/api/catalog";
import { useGpus } from "@/lib/api/hooks";
import { currency } from "@/lib/format";
import { cn } from "@/lib/utils";

/** GPU instances, grouped by provider, with hourly rate and total VRAM inline. */
export function GpuSelect({
  value,
  onChange,
  minVram,
  placeholder = "Select an instance",
  disabled,
  id,
}: {
  value: string | undefined;
  onChange: (value: string) => void;
  minVram?: number;
  placeholder?: string;
  disabled?: boolean;
  id?: string;
}) {
  const [open, setOpen] = useState(false);
  const { data: gpus, isPending } = useGpus(minVram ? { minVram } : {});

  const grouped = useMemo(() => groupByProvider(gpus ?? []), [gpus]);
  const selected = gpus?.find((gpu) => gpu.id === value);

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
              <span className="truncate">{selected.instance_name}</span>
              <span className="shrink-0 text-xs text-fg-subtle tabular-nums">
                {currency(selected.hourly_cost_usd)}/hr
              </span>
            </span>
          ) : (
            <span className="text-fg-subtle">{isPending ? "Loading instances…" : placeholder}</span>
          )}
          <ChevronsUpDownIcon className="size-3.5 shrink-0 opacity-50" aria-hidden />
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-[--radix-popover-trigger-width] min-w-[360px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Search instances…" className="h-9" />
          <CommandList className="max-h-[320px]">
            <CommandEmpty>No instance matches.</CommandEmpty>
            {grouped.map(([provider, providerGpus]) => (
              <CommandGroup key={provider} heading={provider}>
                {providerGpus.map((gpu) => (
                  <CommandItem
                    key={gpu.id}
                    value={`${gpu.instance_name} ${gpu.gpu_model} ${gpu.provider}`}
                    onSelect={() => {
                      onChange(gpu.id);
                      setOpen(false);
                    }}
                    className="gap-2"
                  >
                    <CheckIcon
                      className={cn(
                        "size-3.5 shrink-0",
                        gpu.id === value ? "opacity-100" : "opacity-0",
                      )}
                      aria-hidden
                    />
                    <span className="min-w-0 flex-1 truncate">{gpu.instance_name}</span>
                    {gpu.spot ? (
                      <Badge variant="outline" className="shrink-0 text-[10px]">
                        spot
                      </Badge>
                    ) : null}
                    <span className="shrink-0 text-xs text-fg-subtle tabular-nums">
                      {gpu.gpu_count}x {gpu.gpu_model} · {gpu.vram_total_gb}GB
                    </span>
                    <span className="w-[68px] shrink-0 text-right text-xs text-fg-muted tabular-nums">
                      {currency(gpu.hourly_cost_usd)}/hr
                    </span>
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

function groupByProvider(gpus: CatalogGpu[]): [string, CatalogGpu[]][] {
  const groups = new Map<string, CatalogGpu[]>();
  for (const gpu of gpus) {
    const bucket = groups.get(gpu.provider);
    if (bucket) bucket.push(gpu);
    else groups.set(gpu.provider, [gpu]);
  }
  return [...groups.entries()].sort(([a], [b]) => a.localeCompare(b));
}
