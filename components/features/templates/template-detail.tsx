"use client";

import { CheckIcon, CopyIcon, DownloadIcon, LockIcon, WandSparklesIcon } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import toast from "react-hot-toast";

import { Button } from "@/components/ui/button";
import { recordCopy, type TemplateDetail, type TemplateFile } from "@/lib/api/templates";
import { downloadZip } from "@/lib/zip";
import { cn } from "@/lib/utils";

/**
 * The interactive half of a template page (M19).
 *
 * Deliberately small. The prose is server-rendered above this so it is in the
 * HTML a crawler sees; only the things that need a click live here.
 */

/**
 * "Use this stack" is a plain link, not a POST.
 *
 * The Architect reads its inputs from the query string already, and the
 * template's `stack_input` uses the same key names as the form — so the whole
 * handoff is a URL. That makes it linkable, shareable, and crawlable, and it
 * means a stack template's constraints show up in the address bar where
 * someone can edit one before running.
 */
export function useStackHref(stackInput: Record<string, unknown>): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(stackInput)) {
    if (value === undefined || value === null || value === "") continue;
    params.set(key, Array.isArray(value) ? value.join(",") : String(value));
  }
  return `/stack-architect/new?${params.toString()}`;
}

export function UseThisStack({ template }: { template: TemplateDetail }) {
  return (
    <Button asChild size="sm">
      <Link href={useStackHref(template.stack_input ?? {})}>
        <WandSparklesIcon className="size-3.5" aria-hidden />
        Use this stack
      </Link>
    </Button>
  );
}

export function CopyBody({ template }: { template: TemplateDetail }) {
  const [copied, setCopied] = useState(false);

  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      onClick={async () => {
        await navigator.clipboard.writeText(template.content_markdown);
        recordCopy(template.slug);
        setCopied(true);
        setTimeout(() => setCopied(false), 1600);
        toast.success(
          template.locked ? "Preview copied — the rest needs Pro" : "Copied as Markdown",
        );
      }}
    >
      {copied ? (
        <CheckIcon className="size-3.5" aria-hidden />
      ) : (
        <CopyIcon className="size-3.5" aria-hidden />
      )}
      Copy
    </Button>
  );
}

export function DownloadTemplate({ template }: { template: TemplateDetail }) {
  const files = template.files ?? [];

  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      onClick={() => {
        recordCopy(template.slug);
        if (files.length === 0) {
          downloadText(`${template.slug}.md`, template.content_markdown);
          return;
        }
        // A multi-file starter downloads as an archive with its directory
        // structure intact. Flattening it into one file would hand someone a
        // starter they have to take apart before they can run it.
        downloadZip(`${template.slug}.zip`, [
          { name: "README.md", content: template.content_markdown },
          ...files.map((file) => ({ name: file.path, content: file.content })),
        ]);
      }}
    >
      <DownloadIcon className="size-3.5" aria-hidden />
      {files.length > 0 ? "Download .zip" : "Download .md"}
    </Button>
  );
}

function downloadText(filename: string, body: string): void {
  const url = URL.createObjectURL(new Blob([body], { type: "text/markdown" }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

/**
 * The file tree for a multi-file starter, with per-file copy.
 *
 * One file shown at a time rather than every file expanded: a four-file
 * starter is several hundred lines, and a page that opens with all of it
 * buries the prose explaining what any of it is for.
 */
export function FileTree({ files, slug }: { files: TemplateFile[]; slug: string }) {
  const [active, setActive] = useState(0);
  const [copied, setCopied] = useState(false);
  const file = files[active];

  if (!file) return null;

  return (
    <div className="overflow-hidden rounded-md border border-line">
      <nav
        aria-label="Files in this starter"
        className="flex flex-wrap gap-1 border-b border-line bg-surface-2/60 px-2 py-1.5"
      >
        {files.map((entry, index) => (
          <button
            key={entry.path}
            type="button"
            aria-current={index === active}
            onClick={() => setActive(index)}
            className={cn(
              "rounded-xs px-2 py-1 font-mono text-[11px] transition-colors",
              index === active
                ? "bg-surface text-fg"
                : "text-fg-muted hover:bg-surface hover:text-fg",
            )}
          >
            {entry.path}
          </button>
        ))}
      </nav>

      <div className="flex items-center justify-between gap-2 border-b border-line px-3 py-1.5">
        <span className="font-mono text-[11px] text-fg-subtle">{file.language}</span>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={async () => {
            await navigator.clipboard.writeText(file.content);
            recordCopy(slug);
            setCopied(true);
            setTimeout(() => setCopied(false), 1600);
            toast.success(`${file.path} copied`);
          }}
        >
          {copied ? (
            <CheckIcon className="size-3.5" aria-hidden />
          ) : (
            <CopyIcon className="size-3.5" aria-hidden />
          )}
          Copy file
        </Button>
      </div>

      <pre className="max-h-[32rem] overflow-auto bg-surface p-3 font-mono text-[11.5px] leading-relaxed text-fg">
        {file.content}
      </pre>
    </div>
  );
}

/**
 * What a locked body shows instead of the rest.
 *
 * Placed *after* the preview rather than replacing it, so the reader has
 * already seen the quality of the thing before being asked to pay for it.
 */
export function UpgradeCard({ template }: { template: TemplateDetail }) {
  return (
    <aside className="flex flex-col items-start gap-3 rounded-md border border-forge-line bg-forge-quiet/40 px-5 py-5">
      <div className="flex items-center gap-2 text-forge">
        <LockIcon className="size-4" aria-hidden />
        <h2 className="text-[15px] font-semibold">The rest of this template is on Pro</h2>
      </div>
      <p className="max-w-prose text-sm leading-relaxed text-fg-muted">
        {template.file_count > 0
          ? `The remaining sections and all ${template.file_count} files — ready to download as an archive with the directory structure intact.`
          : "The remaining sections, and the download."}
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <Button asChild size="sm">
          <Link href="/settings/billing">Upgrade to Pro</Link>
        </Button>
        <Link
          href="/resources/templates?plan=free"
          className="text-xs text-fg-muted underline underline-offset-2 hover:text-fg"
        >
          Browse the free templates
        </Link>
      </div>
    </aside>
  );
}
