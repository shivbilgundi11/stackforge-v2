import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { McpBundle } from "@/components/features/agents/mcp-bundle";
import { WorkflowDag } from "@/components/features/agents/workflow-dag";
import type { ToolRunResult } from "@/lib/api/tools";

/**
 * The two WF3 escape-hatch results.
 *
 * Both replace the block renderer entirely, so nothing in `result-blocks`
 * covers them. What is asserted here is what the escape hatch was taken for:
 * that a six-file bundle is navigable and downloadable as one archive, and
 * that a topology's nodes open the contracts on their edges — the part of an
 * agent design that actually fails.
 */

// Shiki highlights asynchronously and pulls a WASM grammar in. The code view
// is not what these tests are about, so it renders as plain text.
vi.mock("@/components/animate-ui/components/animate/code", () => ({
  Code: ({ code, children }: { code: string; children: React.ReactNode }) => (
    <div data-testid="code" data-code={code}>
      {children}
      <pre>{code}</pre>
    </div>
  ),
  CodeBlock: () => null,
}));

function bundleResult(): ToolRunResult {
  return {
    run_id: "run_1",
    tool_slug: "mcp-config",
    source: "rule_based",
    duration_ms: 4,
    created_at: "2026-08-10T00:00:00Z",
    metrics: { tools: 2, files: 6, transport: "stdio", spec_version: "2025-06-18" },
    tables: {
      tools: [
        { declared: "search docs", generated: "search_docs", parameters: 2, required: 1 },
        { declared: "page_oncall", generated: "page_oncall", parameters: 1, required: 1 },
      ],
    },
    series: {},
    artifacts: [
      {
        type: "mcp-server",
        format: "code",
        filename: "mcp-server-ops/server.py",
        content: "server = MCPServer('Ops')\n",
        language: "python",
      },
      {
        type: "mcp-readme",
        format: "markdown",
        filename: "mcp-server-ops/README.md",
        content: "# Ops\n",
        language: null,
      },
    ],
    warnings: [],
    provenance: { oldest_verified_at: null, variant: "fresh", sources: [] },
    ai: null,
  } as unknown as ToolRunResult;
}

function planResult(): ToolRunResult {
  return {
    run_id: "run_2",
    tool_slug: "workflow-plan",
    source: "rule_based",
    duration_ms: 6,
    created_at: "2026-08-10T00:00:00Z",
    metrics: { topology: "sequential", agents: 3, handoffs: 2, cost_per_task: "0.021500" },
    tables: {
      nodes: [
        {
          node: "Planner",
          role: "planner",
          model: "Claude Sonnet 5",
          steps: 1,
          tools: "—",
          cost_per_task: "$0.009",
          responsibility: "Turns the goal into an ordered list of steps.",
        },
        {
          node: "Step 1",
          role: "worker",
          model: "GPT-4o mini",
          steps: 3,
          tools: "search_docs",
          cost_per_task: "$0.004",
          responsibility: "Executes step 1 and reports whether it succeeded.",
        },
        {
          node: "Reviewer",
          role: "reviewer",
          model: "Claude Sonnet 5",
          steps: 1,
          tools: "—",
          cost_per_task: "$0.008",
          responsibility: "Checks the output against the original goal.",
        },
      ],
      contracts: [
        { from: "Planner", to: "Step 1", contract: "Step definition and the result so far." },
        { from: "Step 1", to: "Reviewer", contract: "Final output plus the full step log." },
      ],
      failure_modes: [
        {
          mode: "Error propagation down the chain",
          likelihood: "high",
          mitigation: "Every step returns success explicitly.",
        },
      ],
    },
    series: {},
    artifacts: [
      {
        type: "diagram",
        format: "mermaid",
        filename: "agent-topology.mmd",
        content: "graph TD\n    planner --> step_1",
        language: null,
      },
    ],
    warnings: [],
    provenance: { oldest_verified_at: null, variant: "fresh", sources: [] },
    ai: null,
  } as unknown as ToolRunResult;
}

describe("McpBundle", () => {
  it("lists every file and shows the selected one", async () => {
    const user = userEvent.setup();
    render(<McpBundle data={bundleResult()} />);

    const files = screen.getByRole("navigation", { name: /bundle files/i });
    expect(within(files).getByText("server.py")).toBeInTheDocument();
    expect(within(files).getByText("README.md")).toBeInTheDocument();

    // The first file is shown without a click — an empty pane would read as a
    // generator that produced nothing.
    expect(screen.getByTestId("code")).toHaveAttribute("data-code", "server = MCPServer('Ops')\n");

    await user.click(within(files).getByText("README.md"));
    expect(screen.getByTestId("code")).toHaveAttribute("data-code", "# Ops\n");
  });

  it("downloads all files as one archive", async () => {
    const user = userEvent.setup();
    const created = vi.fn((_blob: Blob) => "blob:zip");
    vi.stubGlobal("URL", { createObjectURL: created, revokeObjectURL: vi.fn() });
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(() => undefined);

    render(<McpBundle data={bundleResult()} />);
    await user.click(screen.getByRole("button", { name: /download bundle/i }));

    expect(click).toHaveBeenCalled();
    const blob = created.mock.calls[0]?.[0] as Blob;
    expect(blob.type).toBe("application/zip");
    // Both files, not just the one on screen.
    expect(blob.size).toBeGreaterThan("server = MCPServer('Ops')\n".length + "# Ops\n".length);

    click.mockRestore();
    vi.unstubAllGlobals();
  });

  it("shows what a declared tool name became on the wire", () => {
    render(<McpBundle data={bundleResult()} />);

    expect(screen.getByText("search_docs")).toBeInTheDocument();
    expect(screen.getByText(/declared as/i)).toBeInTheDocument();
  });
});

describe("WorkflowDag", () => {
  it("renders every agent in the topology", () => {
    render(<WorkflowDag data={planResult()} />);

    for (const name of ["Planner", "Step 1", "Reviewer"]) {
      expect(screen.getByRole("button", { name: new RegExp(name) })).toBeInTheDocument();
    }
  });

  it("opens role, cost, and both edge contracts when a node is selected", async () => {
    const user = userEvent.setup();
    render(<WorkflowDag data={planResult()} />);

    await user.click(screen.getByRole("button", { name: /Step 1/ }));

    expect(screen.getByText(/Executes step 1 and reports/)).toBeInTheDocument();
    expect(screen.getByText("GPT-4o mini")).toBeInTheDocument();
    // The contracts on both edges — the part of a plan people skip.
    expect(screen.getByText(/Step definition and the result so far/)).toBeInTheDocument();
    expect(screen.getByText(/Final output plus the full step log/)).toBeInTheDocument();
  });

  it("closes the detail again when the same node is clicked", async () => {
    const user = userEvent.setup();
    render(<WorkflowDag data={planResult()} />);

    const node = screen.getByRole("button", { name: /Reviewer/ });
    await user.click(node);
    expect(screen.getByText(/Checks the output against the original goal/)).toBeInTheDocument();

    await user.click(node);
    expect(screen.queryByText(/Checks the output against the original goal/)).toBeNull();
  });

  it("always shows the failure modes, selection or not", () => {
    render(<WorkflowDag data={planResult()} />);

    expect(screen.getByText("Error propagation down the chain")).toBeInTheDocument();
    expect(screen.getByText(/Every step returns success explicitly/)).toBeInTheDocument();
  });

  it("renders nothing rather than an empty frame when there are no nodes", () => {
    const empty = { ...planResult(), tables: {} } as unknown as ToolRunResult;
    const { container } = render(<WorkflowDag data={empty} />);

    expect(container).toBeEmptyDOMElement();
  });
});
