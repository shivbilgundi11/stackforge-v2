"use client";

import { DownloadIcon, FileCodeIcon, FileIcon, FileTextIcon, PackageIcon } from "lucide-react";
import { useState } from "react";

import { Code, CodeBlock as CodeBlockView } from "@/components/animate-ui/components/animate/code";
import { Panel, PanelBody, PanelHeader } from "@/components/forge/panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { ToolRunResult } from "@/lib/api/tools";
import { cn } from "@/lib/utils";
import { downloadZip } from "@/lib/zip";

/**
 * The MCP bundle result.
 *
 * A six-file server is not a metric strip and not a single code block, so it
 * takes the escape hatch: a file tree on the left, the selected file on the
 * right, and one button that downloads the lot. The tool still keeps the form,
 * the mutation, quota handling, provenance, and the export slot from the
 * shared page.
 *
 * The download is the point. Six files pasted one at a time is a worse
 * experience than a zip, and the zip is what makes this worth coming back to.
 */

type Artifact = NonNullable<ToolRunResult["artifacts"]>[number];

const LANGUAGES: Record<string, string> = {
  python: "python",
  toml: "toml",
  json: "json",
  markdown: "markdown",
};

function iconFor(filename: string) {
  if (filename.endsWith(".py")) return FileCodeIcon;
  if (filename.endsWith(".md")) return FileTextIcon;
  return FileIcon;
}

function languageFor(artifact: Artifact): string {
  if (artifact.language && LANGUAGES[artifact.language]) return LANGUAGES[artifact.language]!;
  if (artifact.filename.endsWith(".toml")) return "toml";
  if (artifact.filename.endsWith(".md")) return "markdown";
  if (artifact.filename.endsWith(".json")) return "json";
  if (artifact.filename.endsWith(".py")) return "python";
  return "text";
}

/** `mcp-server-ops/tests/test_server.py` → `tests/test_server.py`. */
function relativeName(filename: string): string {
  const cut = filename.indexOf("/");
  return cut === -1 ? filename : filename.slice(cut + 1);
}

function packageName(artifacts: Artifact[]): string {
  const first = artifacts[0]?.filename ?? "mcp-server";
  const cut = first.indexOf("/");
  return cut === -1 ? "mcp-server" : first.slice(0, cut);
}

export function McpBundle({ data }: { data: ToolRunResult }) {
  const artifacts = (data.artifacts ?? []) as Artifact[];
  const [selected, setSelected] = useState(0);

  if (artifacts.length === 0) return null;

  const current = artifacts[Math.min(selected, artifacts.length - 1)]!;
  const bundleName = packageName(artifacts);
  const tools = data.tables?.["tools"] ?? [];

  return (
    <div className="flex flex-col gap-4">
      <Panel>
        <PanelHeader
          icon={<PackageIcon className="size-4" aria-hidden />}
          title={bundleName}
          description={
            <>
              {String(data.metrics?.["tools"] ?? 0)} tools ·{" "}
              {String(data.metrics?.["transport"] ?? "stdio")} · targets MCP spec{" "}
              {String(data.metrics?.["spec_version"] ?? "")}
            </>
          }
          actions={
            <Button
              type="button"
              size="sm"
              onClick={() =>
                downloadZip(
                  `${bundleName}.zip`,
                  artifacts.map((artifact) => ({
                    name: artifact.filename,
                    content: artifact.content,
                  })),
                )
              }
            >
              <DownloadIcon className="size-3.5" aria-hidden />
              Download bundle
            </Button>
          }
        />

        <div className="grid md:grid-cols-[minmax(0,15rem)_minmax(0,1fr)] md:divide-x md:divide-line">
          <nav aria-label="Bundle files" className="flex flex-col p-2">
            {artifacts.map((artifact, index) => {
              const Icon = iconFor(artifact.filename);
              const active = index === Math.min(selected, artifacts.length - 1);
              return (
                <button
                  key={artifact.filename}
                  type="button"
                  onClick={() => setSelected(index)}
                  aria-current={active ? "true" : undefined}
                  className={cn(
                    "flex items-center gap-2 rounded-sm px-2 py-1.5 text-left text-xs transition-colors",
                    active
                      ? "bg-surface-2 font-medium text-fg"
                      : "text-fg-muted hover:bg-surface-2/60 hover:text-fg",
                  )}
                >
                  <Icon className="size-3.5 shrink-0" aria-hidden />
                  <span className="truncate font-mono">{relativeName(artifact.filename)}</span>
                </button>
              );
            })}
          </nav>

          <div className="min-w-0">
            <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-2">
              <span className="truncate font-mono text-xs text-fg-muted">{current.filename}</span>
              <span className="shrink-0 text-[11px] text-fg-muted">
                {current.content.split("\n").length} lines
              </span>
            </div>
            <Code
              key={current.filename}
              code={current.content}
              className="rounded-none border-0 bg-transparent"
            >
              <CodeBlockView
                lang={languageFor(current)}
                className="max-h-[560px]"
                writing={false}
                duration={0}
              />
            </Code>
          </div>
        </div>
      </Panel>

      {tools.length > 0 ? (
        <Panel>
          <PanelHeader
            title="Tools"
            description="What each declared tool became on the wire. Names must be identifiers, so some are derived."
          />
          <PanelBody className="flex flex-col gap-2 p-3">
            {tools.map((tool, index) => {
              const declared = String(tool["declared"] ?? "");
              const generated = String(tool["generated"] ?? "");
              return (
                <div
                  key={`${generated}-${index}`}
                  className="flex flex-wrap items-center gap-2 rounded-sm border border-line px-3 py-2"
                >
                  <code className="font-mono text-xs text-fg">{generated}</code>
                  {declared !== generated ? (
                    <span className="text-[11px] text-fg-muted">
                      declared as <code className="font-mono">{declared}</code>
                    </span>
                  ) : null}
                  <span className="ml-auto flex items-center gap-1.5">
                    <Badge variant="outline">{String(tool["parameters"] ?? 0)} params</Badge>
                    <Badge variant="outline">{String(tool["required"] ?? 0)} required</Badge>
                  </span>
                </div>
              );
            })}
          </PanelBody>
        </Panel>
      ) : null}

      <Panel>
        <PanelHeader
          title="Next"
          description="The bundle runs as generated. The tool bodies do not do anything yet."
        />
        <PanelBody className="flex flex-col gap-2 text-xs leading-relaxed text-fg-muted">
          <p>
            <code className="font-mono text-fg">uv sync</code> then{" "}
            <code className="font-mono text-fg">uv run server.py</code> starts it.{" "}
            <code className="font-mono text-fg">uv run pytest</code> runs the generated tests, which
            assert every tool is registered, described, and callable.
          </p>
          <p>
            Each tool body echoes its arguments and reports{" "}
            <code className="font-mono text-fg">not_implemented</code>, so you can connect it to
            Claude Desktop and confirm the plumbing before writing any logic. Paste{" "}
            <code className="font-mono text-fg">claude_desktop_config.json</code> into your own
            config with a real absolute path.
          </p>
        </PanelBody>
      </Panel>
    </div>
  );
}
