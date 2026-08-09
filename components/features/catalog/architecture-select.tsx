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
import { useArchitectures } from "@/lib/api/hooks";
import { compactNumber } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * Open-weight models, grouped by family.
 *
 * The GQA badge is inline rather than buried in the result, because it is the
 * property that decides the answer: a multi-head model of the same parameter
 * count needs several times the KV cache, and the user picking between two
 * 8B models has no other way to see that before they run it.
 */
export function ArchitectureSelect({
  value,
  onChange,
  placeholder = "Select a model",
  disabled,
  id,
}: {
  value: string | undefined;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  id?: string;
}) {
  const [open, setOpen] = useState(false);
  const { data: architectures, isPending } = useArchitectures();

  const grouped = useMemo(() => {
    const families = new Map<string, NonNullable<typeof architectures>>();
    for (const arch of architectures ?? []) {
      const list = families.get(arch.family) ?? [];
      list.push(arch);
      families.set(arch.family, list);
    }
    return [...families.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [architectures]);

  const selected = architectures?.find((arch) => arch.key === value);

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
          className="h-9 w-full justify-between font-normal"
        >
          {selected ? (
            <span className="flex min-w-0 items-center gap-2">
              <span className="truncate">{selected.name}</span>
              <span className="shrink-0 text-xs text-fg-subtle">
                {selected.uses_gqa ? "GQA" : "MHA"}
              </span>
            </span>
          ) : (
            <span className="text-fg-subtle">{isPending ? "Loading…" : placeholder}</span>
          )}
          <ChevronsUpDownIcon className="size-4 shrink-0 opacity-50" aria-hidden />
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <Command>
          <CommandInput placeholder="Search models…" />
          <CommandList>
            <CommandEmpty>No model matches.</CommandEmpty>
            {grouped.map(([family, items]) => (
              <CommandGroup key={family} heading={family}>
                {items.map((arch) => (
                  <CommandItem
                    key={arch.key}
                    value={`${arch.name} ${arch.key} ${arch.family}`}
                    onSelect={() => {
                      onChange(arch.key);
                      setOpen(false);
                    }}
                  >
                    <CheckIcon
                      className={cn(
                        "mr-2 size-4 shrink-0",
                        arch.key === value ? "opacity-100" : "opacity-0",
                      )}
                      aria-hidden
                    />
                    <span className="min-w-0 flex-1 truncate">{arch.name}</span>
                    <span className="ml-2 shrink-0 text-xs text-fg-subtle tabular-nums">
                      {compactNumber(arch.max_context)} ctx
                    </span>
                    <Badge
                      variant="outline"
                      className={cn(
                        "ml-2 shrink-0 text-[10px] font-normal",
                        // MHA is the one worth noticing: same size, several
                        // times the cache.
                        !arch.uses_gqa && "border-warning-line text-warning",
                      )}
                    >
                      {arch.uses_gqa ? "GQA" : "MHA"}
                    </Badge>
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
