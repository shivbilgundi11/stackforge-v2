"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Command } from "cmdk";
import { useTheme } from "next-themes";
import { LaptopIcon, MoonIcon, SearchIcon, SunIcon } from "lucide-react";

import { ALL_TOOLS, NAV_GROUPS, WORKSPACE_NAV } from "@/lib/navigation";
import { cn } from "@/lib/utils";

/**
 * ⌘K over everything.
 *
 * Reads the navigation registry, so a tool added there appears here with no
 * further work. In a product with 28 tools across 7 groups, the palette is
 * the primary navigation and the sidebar is the map.
 */
export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const { setTheme } = useTheme();

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "k" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        setOpen((value) => !value);
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  const run = useCallback((action: () => void) => {
    setOpen(false);
    action();
  }, []);

  return (
    <Command.Dialog
      open={open}
      onOpenChange={setOpen}
      label="Command palette"
      shouldFilter
      className={cn(
        "fixed top-1/2 left-1/2 z-50 w-[min(94vw,620px)] -translate-x-1/2 -translate-y-1/2",
        "overflow-hidden rounded-lg border border-line bg-surface shadow-overlay",
        "data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-98",
      )}
      overlayClassName="fixed inset-0 z-50 bg-fg/25 backdrop-blur-[2px] data-[state=open]:animate-in data-[state=open]:fade-in-0"
    >
      <div className="flex items-center gap-2.5 border-b border-line px-3.5">
        <SearchIcon className="size-4 shrink-0 text-fg-subtle" />
        <Command.Input
          placeholder="Search tools, workflows, and actions…"
          className="h-12 w-full bg-transparent text-[13.5px] text-fg outline-none placeholder:text-fg-subtle"
        />
        <kbd className="hidden rounded-xs border border-line px-1.5 py-0.5 font-mono text-[10px] text-fg-subtle sm:block">
          ESC
        </kbd>
      </div>

      <Command.List className="max-h-[min(60vh,420px)] overflow-y-auto overscroll-contain p-1.5">
        <Command.Empty className="px-3 py-8 text-center text-[13px] text-fg-muted">
          No matches. Try a provider name, a metric, or a workflow.
        </Command.Empty>

        <Command.Group heading="Workspace" className={groupClass}>
          {WORKSPACE_NAV.map((item) => (
            <Command.Item
              key={item.href}
              value={`${item.label} ${item.summary}`}
              onSelect={() => run(() => router.push(item.href))}
              className={itemClass}
            >
              <item.icon className="size-4 shrink-0 text-fg-muted" />
              <span className="flex-1 truncate">{item.label}</span>
              <span className="hidden truncate text-[11px] text-fg-subtle sm:block">
                {item.summary}
              </span>
            </Command.Item>
          ))}
        </Command.Group>

        <Command.Group heading="Workflows" className={groupClass}>
          {NAV_GROUPS.map((group) => (
            <Command.Item
              key={group.id}
              value={`${group.label} ${group.eyebrow ?? ""} ${group.summary}`}
              onSelect={() => run(() => router.push(group.href))}
              className={itemClass}
            >
              <group.icon
                className={cn(
                  "size-4 shrink-0",
                  group.intelligent ? "text-forge" : "text-fg-muted",
                )}
              />
              <span className="flex-1 truncate">{group.label}</span>
              {group.eyebrow ? (
                <span className="font-mono text-[10px] text-fg-subtle">{group.eyebrow}</span>
              ) : null}
            </Command.Item>
          ))}
        </Command.Group>

        <Command.Group heading="Tools" className={groupClass}>
          {ALL_TOOLS.map((tool) => (
            <Command.Item
              key={tool.slug}
              value={`${tool.title} ${tool.groupLabel} ${tool.summary} ${(tool.keywords ?? []).join(" ")}`}
              onSelect={() => run(() => router.push(tool.href))}
              className={itemClass}
            >
              <tool.icon className="size-4 shrink-0 text-fg-subtle" />
              <span className="truncate">{tool.title}</span>
              <span className="ml-auto hidden shrink-0 text-[11px] text-fg-subtle sm:block">
                {tool.groupLabel}
              </span>
            </Command.Item>
          ))}
        </Command.Group>

        <Command.Group heading="Appearance" className={groupClass}>
          <Command.Item
            value="light theme appearance"
            onSelect={() => run(() => setTheme("light"))}
            className={itemClass}
          >
            <SunIcon className="size-4 shrink-0 text-fg-muted" />
            Light theme
          </Command.Item>
          <Command.Item
            value="dark theme appearance"
            onSelect={() => run(() => setTheme("dark"))}
            className={itemClass}
          >
            <MoonIcon className="size-4 shrink-0 text-fg-muted" />
            Dark theme
          </Command.Item>
          <Command.Item
            value="system theme appearance"
            onSelect={() => run(() => setTheme("system"))}
            className={itemClass}
          >
            <LaptopIcon className="size-4 shrink-0 text-fg-muted" />
            Match system
          </Command.Item>
        </Command.Group>
      </Command.List>
    </Command.Dialog>
  );
}

const groupClass = cn(
  "[&_[cmdk-group-heading]]:text-fg-subtle [&_[cmdk-group-heading]]:px-2.5",
  "[&_[cmdk-group-heading]]:pt-2.5 [&_[cmdk-group-heading]]:pb-1.5",
  "[&_[cmdk-group-heading]]:text-[10.5px] [&_[cmdk-group-heading]]:font-medium",
  "[&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-[0.06em]",
);

const itemClass = cn(
  "flex cursor-pointer items-center gap-2.5 rounded-sm px-2.5 py-2 text-[13px]",
  "text-fg select-none",
  "data-[selected=true]:bg-surface-2 data-[selected=true]:text-fg",
);

/** The header's search affordance. Shows the palette exists, which is most of
 *  the battle — an unadvertised ⌘K is used by nobody. */
export function CommandTrigger() {
  const openPalette = () => {
    document.dispatchEvent(
      new KeyboardEvent("keydown", { key: "k", metaKey: true, bubbles: true }),
    );
  };

  return (
    <button
      type="button"
      onClick={openPalette}
      className={cn(
        "border-line bg-surface text-fg-subtle hover:border-line-strong hover:text-fg-muted",
        "flex h-8 w-full max-w-[280px] items-center gap-2 rounded-sm border px-2.5",
        "text-[12.5px] transition-colors",
      )}
    >
      <SearchIcon className="size-3.5 shrink-0" />
      <span className="flex-1 text-left">Search…</span>
      <kbd className="hidden rounded-xs border border-line bg-surface-2 px-1.5 py-px font-mono text-[10px] sm:block">
        ⌘K
      </kbd>
    </button>
  );
}
