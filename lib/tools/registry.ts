import { NAV_GROUPS } from "@/lib/navigation";
import { AGENT_SPECS } from "@/lib/tools/specs/agents";
import { ARCHITECT_SPECS } from "@/lib/tools/specs/architect";
import { COMPARE_SPECS } from "@/lib/tools/specs/compare";
import { COST_SPECS } from "@/lib/tools/specs/cost";
import { INFRA_SPECS } from "@/lib/tools/specs/infra";
import { RAG_SPECS } from "@/lib/tools/specs/rag";
import { ROI_SPECS } from "@/lib/tools/specs/roi";
import type { ToolGroup, ToolSpec } from "@/lib/tools/spec";

/**
 * Every tool, keyed by slug.
 *
 * The sidebar, the command palette, hub pages, breadcrumbs, related-tool
 * links, and the sitemap all read from here. Adding a tool is adding a spec —
 * it then appears everywhere, which is the property the old build lacked and
 * paid for in six places per tool.
 */

const ALL: ToolSpec[] = [
  ...COST_SPECS,
  ...COMPARE_SPECS,
  ...RAG_SPECS,
  ...AGENT_SPECS,
  ...INFRA_SPECS,
  ...ROI_SPECS,
  ...ARCHITECT_SPECS,
];

export const TOOL_REGISTRY: Record<string, ToolSpec> = Object.fromEntries(
  ALL.map((spec) => [spec.slug, spec]),
);

export const ALL_SPECS: ToolSpec[] = ALL;

export function getTool(slug: string): ToolSpec | undefined {
  return TOOL_REGISTRY[slug];
}

export function getToolsByGroup(group: ToolGroup): ToolSpec[] {
  return ALL.filter((spec) => spec.group === group);
}

/**
 * A tool's route.
 *
 * The group's base path comes from `navigation.ts` rather than from the group
 * id, because one of them differs: the architect group is `architect` and
 * lives at `/stack-architect`. Deriving `/${group}/…` worked only while every
 * id happened to equal its path, and `spec.test.ts` was pinning the two
 * together by hand to catch the day that stopped being true.
 */
export function toolHref(spec: ToolSpec): string {
  const base = NAV_GROUPS.find((group) => group.id === spec.group)?.href ?? `/${spec.group}`;
  return `${base}/${spec.path ?? spec.slug}`;
}

/** Powers ⌘K: title, slug, summary, and any extra keywords all match. */
export function searchTools(query: string): ToolSpec[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return ALL;

  return ALL.filter((spec) =>
    [spec.title, spec.slug, spec.summary, ...(spec.keywords ?? [])]
      .join(" ")
      .toLowerCase()
      .includes(needle),
  );
}

/** Every tool route, for `sitemap.ts`. */
export function toolRoutes(): string[] {
  return ALL.map(toolHref);
}
