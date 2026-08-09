import Link from "next/link";
import { ArrowRightIcon } from "lucide-react";

import { PageHeader } from "@/components/forge/page-header";
import { Panel } from "@/components/forge/panel";
import type { NavGroup } from "@/lib/navigation";
import { cn } from "@/lib/utils";

/**
 * One component, seven hub pages. Reads the navigation registry, so a tool
 * added there appears on its hub with no further work.
 */
export function ToolHub({ group }: { group: NavGroup }) {
  return (
    <>
      <PageHeader eyebrow={group.eyebrow} title={group.label} description={group.summary} />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {group.tools.map((tool) => {
          const ready = tool.status !== "planned";

          const body = (
            <>
              <div className="flex items-start justify-between gap-3">
                <h2 className="text-[13.5px] font-semibold text-fg">{tool.title}</h2>
                {ready ? (
                  <ArrowRightIcon className="size-4 shrink-0 text-fg-subtle transition-colors group-hover:text-ember" />
                ) : (
                  <span className="shrink-0 rounded-xs border border-line px-1.5 py-px text-[9.5px] font-medium tracking-wide text-fg-subtle uppercase">
                    Soon
                  </span>
                )}
              </div>
              <p className="mt-1.5 text-[12.5px] leading-relaxed text-pretty text-fg-muted">
                {tool.summary}
              </p>
            </>
          );

          const shell = cn(
            "group border-line bg-surface flex flex-col rounded-md border p-4 transition-colors",
          );

          return ready ? (
            <Link
              key={tool.slug}
              href={tool.href}
              className={cn(shell, "hover:border-line-strong hover:bg-surface-2")}
            >
              {body}
            </Link>
          ) : (
            <div key={tool.slug} className={cn(shell, "opacity-70")}>
              {body}
            </div>
          );
        })}
      </div>

      <Panel className="mt-5">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 px-4 py-3 text-[12.5px] text-fg-muted">
          <span className="font-medium text-fg">Tip</span>
          <span className="text-fg-subtle">·</span>
          <span>
            Press{" "}
            <kbd className="rounded-xs border border-line bg-surface-2 px-1.5 py-px font-mono text-[10.5px]">
              ⌘K
            </kbd>{" "}
            to jump to any tool without leaving the keyboard.
          </span>
        </div>
      </Panel>
    </>
  );
}
