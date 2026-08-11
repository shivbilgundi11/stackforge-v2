import { FilesIcon, LockIcon, WandSparklesIcon } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import type { TemplateSummary } from "@/lib/api/templates";

/**
 * One template in a grid.
 *
 * A server component with no interactivity — the whole card is a link, which
 * is what makes the grid crawlable and keyboard-navigable without any work.
 *
 * The premium badge says `Pro`, not `Locked`. The body is gated, not the page,
 * and a card that reads as a closed door discourages the click that is the
 * whole point of listing it.
 */
export function TemplateCard({ template }: { template: TemplateSummary }) {
  return (
    <Link
      href={`/resources/templates/${template.slug}`}
      className="group flex flex-col gap-2 rounded-md border border-line bg-surface px-4 py-3.5 transition-colors hover:border-line-strong"
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-[13.5px] font-medium text-fg group-hover:text-forge">
          {template.title}
        </h3>
        {template.is_premium ? (
          <Badge
            variant="outline"
            className="shrink-0 gap-1 border-forge-line px-1.5 py-0 text-[10px] text-forge"
          >
            <LockIcon className="size-2.5" aria-hidden />
            Pro
          </Badge>
        ) : null}
      </div>

      <p className="line-clamp-3 text-xs leading-relaxed text-fg-muted">{template.summary}</p>

      <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 pt-1 text-[11px] text-fg-subtle">
        <span className="capitalize">{template.difficulty}</span>

        {template.is_stack_template ? (
          <span className="flex items-center gap-1 text-forge">
            <WandSparklesIcon className="size-3" aria-hidden />
            Opens the Architect
          </span>
        ) : null}

        {template.file_count > 0 ? (
          <span className="flex items-center gap-1">
            <FilesIcon className="size-3" aria-hidden />
            {template.file_count} {template.file_count === 1 ? "file" : "files"}
          </span>
        ) : null}

        {template.copy_count > 0 ? (
          <span className="ml-auto tabular-nums">{template.copy_count} copies</span>
        ) : null}
      </div>
    </Link>
  );
}
