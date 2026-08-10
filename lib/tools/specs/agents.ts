import { z } from "zod";

import { McpBundle } from "@/components/features/agents/mcp-bundle";
import { WorkflowDag } from "@/components/features/agents/workflow-dag";
import type { ToolSpec } from "@/lib/tools/spec";

/**
 * WF3 — Agent & MCP Builder.
 *
 * Two of these five take the escape hatch. A six-file server bundle and a
 * clickable agent topology are not a metric strip, a table, or a chart, and
 * forcing them into one would produce something worse than all three.
 *
 * The other three are ordinary specs, and the interesting part of them is the
 * inputs rather than the output: schema overhead and retry rate on `agent-cost`,
 * and per-request latency on `rate-limits`. Those fields exist because the
 * answer is wrong without them, not because they were available.
 */

const parameterSchema = z.object({
  name: z.string().min(1, "Name the parameter.").max(64),
  type: z.enum(["string", "number", "integer", "boolean", "array", "object"]),
  description: z.string().max(500).optional(),
  required: z.boolean().optional(),
});

const toolDefinitionSchema = z.object({
  name: z.string().min(1, "Name the tool.").max(80),
  description: z.string().max(1000).optional(),
  parameters: z.array(parameterSchema).max(30).optional(),
});

/**
 * Tools, each with its own parameter rows — two levels deep.
 *
 * Its own field kind rather than a nested `repeater`, because the form engine
 * allows exactly one level of repetition and that rule is worth keeping: two
 * levels of generic labelled rows is a data model rendered as a form. See
 * `tool-definitions` in `spec.ts`.
 */
const toolDefinitionsField = {
  kind: "tool-definitions" as const,
  name: "tools",
  label: "Tools",
  max: 30,
  description:
    "What the model can call. The description is what it selects on — write it for a reader who has no other context.",
};

export const mcpConfigSpec: ToolSpec = {
  slug: "mcp-config",
  group: "agents",
  eyebrow: "WF3",
  title: "MCP Config Generator",
  summary:
    "A complete MCP server that runs — six files, a handshake test, and a paste-ready client config.",
  keywords: ["mcp", "server", "claude desktop", "stdio", "tools", "model context protocol"],
  endpoint: "/api/v1/tools/agents/mcp-config",
  tier: "free",
  input: z.object({
    server_name: z.string().min(1, "Name the server.").max(80),
    description: z.string().max(1000).optional(),
    transport: z.enum(["stdio", "sse", "streamable-http"]),
    auth: z.enum(["none", "api-key", "bearer"]),
    tools: z.array(toolDefinitionSchema).min(1, "Define at least one tool.").max(30),
  }),
  defaults: {
    server_name: "Ops Toolkit",
    description: "Tools for the on-call rotation.",
    transport: "stdio",
    auth: "none",
    tools: [
      {
        name: "search_docs",
        description: "Search the internal handbook and return matching passages.",
        parameters: [
          { name: "query", type: "string", description: "What to look for.", required: true },
          { name: "limit", type: "integer", description: "Maximum results.", required: false },
        ],
      },
    ],
  },
  presets: [
    {
      label: "Local server for Claude Desktop",
      description: "stdio, no credentials — the shape that just works",
      values: { transport: "stdio", auth: "none" },
    },
    {
      label: "Wraps an authenticated API",
      description: "Reads a key from the environment at call time",
      values: { transport: "stdio", auth: "api-key" },
    },
    {
      label: "Served over HTTP",
      description: "Needs real auth in front of it — the SDK provides none",
      values: { transport: "streamable-http", auth: "bearer" },
    },
  ],
  fields: [
    {
      kind: "text",
      name: "server_name",
      label: "Server name",
      span: 6,
      placeholder: "Ops Toolkit",
    },
    {
      kind: "select",
      name: "transport",
      label: "Transport",
      span: 6,
      options: [
        { value: "stdio", label: "stdio", hint: "Claude Desktop launches it" },
        { value: "streamable-http", label: "Streamable HTTP", hint: "long-running service" },
        { value: "sse", label: "SSE", hint: "long-running service" },
      ],
    },
    {
      kind: "textarea",
      name: "description",
      label: "What it does",
      rows: 2,
      description: "Goes in the README and the module docstring.",
    },
    {
      kind: "radio-group",
      name: "auth",
      label: "Credentials",
      options: [
        { value: "none", label: "None" },
        { value: "api-key", label: "API key", hint: "MCP_API_KEY" },
        { value: "bearer", label: "Bearer token", hint: "MCP_BEARER_TOKEN" },
      ],
      description:
        "Protects the service this server calls. Over stdio it is not client authentication — the client is the process that launched it.",
    },
    toolDefinitionsField,
  ],
  submitLabel: "Generate server",
  result: { blocks: [], component: McpBundle },
  handoffs: [
    {
      to: "function-schema",
      label: "Export these tools as provider schemas",
      description: "The same definitions, in OpenAI, Anthropic, or JSON Schema form.",
      values: ({ input }) => ({ tools: input.tools, target: "anthropic" }),
    },
    {
      to: "agent-cost",
      label: "Price an agent that carries these tools",
      values: ({ input }) => ({
        tool_count: Array.isArray(input.tools) ? input.tools.length : undefined,
      }),
    },
  ],
  relatedTools: ["function-schema", "agent-cost", "workflow-plan"],
};

export const agentCostSpec: ToolSpec = {
  slug: "agent-cost",
  group: "agents",
  eyebrow: "WF3",
  title: "Agent Cost Calculator",
  summary:
    "Loop cost including the two lines that get left out — tool schemas re-sent every turn, and retries.",
  keywords: ["agent", "loop", "steps", "retries", "schema overhead", "tokens", "cost"],
  endpoint: "/api/v1/tools/agents/agent-cost",
  tier: "free",
  input: z.object({
    agents: z
      .array(
        z.object({
          role: z.string().min(1, "Name the role.").max(60),
          model_id: z.string().min(1, "Pick a model."),
          count: z.number().int().min(1).max(50).optional(),
          steps_per_task: z.number().int().min(1).max(200),
        }),
      )
      .min(1, "Add at least one agent.")
      .max(8),
    tasks_per_day: z.number().int().min(1).max(10_000_000),
    input_tokens_per_step: z.number().int().min(0).max(2_000_000),
    output_tokens_per_step: z.number().int().min(0).max(200_000),
    tool_count: z.number().int().min(0).max(200),
    tokens_per_tool_schema: z.number().int().min(0).max(10_000),
    tool_calls_per_step: z.number().int().min(0).max(50),
    tokens_per_tool_result: z.number().int().min(0).max(200_000),
    memory_read_tokens: z.number().int().min(0).max(2_000_000).optional(),
    memory_write_tokens: z.number().int().min(0).max(200_000).optional(),
    retry_rate_pct: z.number().min(0).max(500),
    cached_input_ratio: z.number().min(0).max(1).optional(),
  }),
  defaults: {
    agents: [
      { role: "Planner", model_id: "claude-sonnet-5", count: 1, steps_per_task: 2 },
      { role: "Worker", model_id: "gpt-4o-mini", count: 1, steps_per_task: 6 },
    ],
    tasks_per_day: 200,
    input_tokens_per_step: 1200,
    output_tokens_per_step: 400,
    tool_count: 10,
    tokens_per_tool_schema: 120,
    tool_calls_per_step: 1,
    tokens_per_tool_result: 400,
    memory_read_tokens: 0,
    memory_write_tokens: 0,
    retry_rate_pct: 15,
    cached_input_ratio: 0,
  },
  presets: [
    {
      label: "Coding agent",
      description: "Long loops, large tool results",
      values: {
        steps_per_task: 20,
        tool_count: 12,
        tokens_per_tool_result: 2000,
        retry_rate_pct: 20,
      },
    },
    {
      label: "Support triage",
      description: "Short loops, small roster",
      values: { tool_count: 4, tool_calls_per_step: 1, retry_rate_pct: 10 },
    },
    {
      label: "Research fan-out",
      description: "Many memory reads",
      values: { memory_read_tokens: 4000, tool_count: 6, retry_rate_pct: 15 },
    },
  ],
  fields: [
    {
      kind: "repeater",
      name: "agents",
      label: "Agents",
      itemLabel: "Agent",
      min: 1,
      max: 8,
      description:
        "One row per role. Routing every role to a frontier model is the usual reason an agent design costs three times what it needs to.",
      newItem: () => ({ role: "", model_id: "gpt-4o-mini", count: 1, steps_per_task: 4 }),
      fields: [
        { kind: "text", name: "role", label: "Role", span: 6 },
        { kind: "model-select", name: "model_id", label: "Model", family: "chat", span: 6 },
        { kind: "number", name: "steps_per_task", label: "Steps per task", span: 6, min: 1 },
        { kind: "number", name: "count", label: "Instances", span: 6, min: 1 },
      ],
    },
    { kind: "number", name: "tasks_per_day", label: "Tasks per day", span: 6, min: 1 },
    {
      kind: "slider",
      name: "retry_rate_pct",
      label: "Retry rate",
      span: 6,
      min: 0,
      max: 60,
      step: 5,
      unit: "%",
      description:
        "A retried step re-sends the same context. 10–20% is normal on a loop with real tools.",
    },
    {
      kind: "number",
      name: "tool_count",
      label: "Tools available",
      span: 6,
      min: 0,
      description: "Every definition is re-sent on every turn.",
    },
    {
      kind: "number",
      name: "tokens_per_tool_schema",
      label: "Tokens per definition",
      span: 6,
      min: 0,
      description: "~120 for a simple tool; several times that with nested objects.",
    },
    {
      kind: "number",
      name: "input_tokens_per_step",
      label: "Prompt tokens / step",
      span: 6,
      min: 0,
    },
    {
      kind: "number",
      name: "output_tokens_per_step",
      label: "Output tokens / step",
      span: 6,
      min: 0,
    },
    { kind: "number", name: "tool_calls_per_step", label: "Tool calls / step", span: 6, min: 0 },
    {
      kind: "number",
      name: "tokens_per_tool_result",
      label: "Tokens per result",
      span: 6,
      min: 0,
      description:
        "Tool output re-enters context. A 4,000-token API response usually has 200 useful tokens.",
    },
    { kind: "number", name: "memory_read_tokens", label: "Memory read / step", span: 6, min: 0 },
    { kind: "number", name: "memory_write_tokens", label: "Memory write / step", span: 6, min: 0 },
    {
      kind: "slider",
      name: "cached_input_ratio",
      label: "Cached input",
      min: 0,
      max: 1,
      step: 0.05,
      format: (value) => `${Math.round(value * 100)}%`,
      description:
        "Applies to the prompt and the tool definitions only — the lines that repeat verbatim.",
    },
  ],
  result: {
    blocks: [
      {
        kind: "metrics",
        keys: ["cost_per_month", "cost_per_task", "schema_overhead_pct", "biggest_contributor"],
        emphasise: "cost_per_month",
        labels: {
          cost_per_month: "Per month",
          cost_per_task: "Per task",
          schema_overhead_pct: "Tool schemas",
          biggest_contributor: "Largest line",
        },
      },
      { kind: "callout" },
      {
        kind: "table",
        key: "breakdown",
        title: "Where the tokens go",
        description:
          "Tool definitions and retries are separate lines because they are the ones a naive estimate omits.",
      },
      { kind: "table", key: "agents", title: "Per agent" },
      { kind: "json" },
    ],
  },
  handoffs: [
    {
      to: "model-roi",
      label: "Build the ROI case",
      values: ({ metrics }) => ({ ai_monthly_cost: Number(metrics.cost_per_month ?? 0) }),
    },
    {
      /**
       * The roster as one budget workload line.
       *
       * An agent step *is* a request, so the mapping is honest: steps per day
       * become requests per day, and the per-step input carries the tool
       * definitions and tool results with it. Sending the monthly figure alone
       * would arrive in the budget as a number with no workload behind it,
       * which is exactly the handoff the spec says not to build.
       */
      to: "budget-estimator",
      label: "Add as a budget workload",
      values: ({ input }) => {
        const agents = Array.isArray(input.agents)
          ? (input.agents as Record<string, unknown>[])
          : [];
        const steps = agents.reduce(
          (total, agent) => total + Number(agent.steps_per_task ?? 0) * Number(agent.count ?? 1),
          0,
        );
        if (steps === 0 || agents.length === 0) return {};

        return {
          lines: [
            {
              name: "Agent loop",
              model_id: String(agents[0]?.model_id ?? ""),
              requests_per_day: Math.round(Number(input.tasks_per_day ?? 0) * steps),
              input_tokens: Math.round(
                Number(input.input_tokens_per_step ?? 0) +
                  Number(input.tool_count ?? 0) * Number(input.tokens_per_tool_schema ?? 0) +
                  Number(input.tool_calls_per_step ?? 0) *
                    Number(input.tokens_per_tool_result ?? 0) +
                  Number(input.memory_read_tokens ?? 0),
              ),
              output_tokens: Math.round(
                Number(input.output_tokens_per_step ?? 0) + Number(input.memory_write_tokens ?? 0),
              ),
            },
          ],
        };
      },
    },
  ],
  relatedTools: ["workflow-plan", "rate-limits", "llm-pricing"],
};

export const workflowPlanSpec: ToolSpec = {
  slug: "workflow-plan",
  group: "agents",
  eyebrow: "WF3",
  title: "Multi-Agent Workflow Planner",
  summary:
    "A topology with written handoff contracts, per-node cost, and the failure modes that shape brings.",
  keywords: ["multi-agent", "dag", "orchestration", "supervisor", "handoff", "topology"],
  endpoint: "/api/v1/tools/agents/workflow-plan",
  tier: "free",
  synthesises: true,
  input: z.object({
    goal: z.string().min(10, "Describe the goal in a sentence or two.").max(2000),
    coordination: z.enum(["sequential", "parallel", "hierarchical", "handoff"]),
    available_tools: z.array(z.string()).max(20),
    constraints: z.array(z.string()).max(10).optional(),
    tasks_per_day: z.number().int().min(1).max(10_000_000),
    frontier_model_id: z.string().min(1, "Pick a model."),
    fast_model_id: z.string().optional(),
  }),
  defaults: {
    goal: "Triage inbound support tickets, look up the customer's order, and draft a reply.",
    coordination: "handoff",
    available_tools: ["search_docs", "lookup_order", "issue_refund"],
    constraints: ["No customer data leaves our network."],
    tasks_per_day: 200,
    frontier_model_id: "claude-sonnet-5",
    fast_model_id: "gpt-4o-mini",
  },
  fields: [
    {
      kind: "textarea",
      name: "goal",
      label: "Goal",
      rows: 3,
      placeholder: "What the system should accomplish, end to end.",
    },
    {
      kind: "radio-group",
      name: "coordination",
      label: "Coordination",
      options: [
        { value: "sequential", label: "Sequential", hint: "a chain, each step gated on the last" },
        { value: "parallel", label: "Parallel", hint: "fan out, then aggregate" },
        { value: "hierarchical", label: "Hierarchical", hint: "a supervisor delegating" },
        { value: "handoff", label: "Handoff", hint: "triage routes to one specialist" },
      ],
    },
    {
      kind: "tag-input",
      name: "available_tools",
      label: "Tools the agents can call",
      max: 20,
      description: "Agent count follows this list — an agent exists to own a set of capabilities.",
    },
    { kind: "tag-input", name: "constraints", label: "Constraints", max: 10 },
    {
      kind: "model-select",
      name: "frontier_model_id",
      label: "Reasoning model",
      family: "chat",
      span: 6,
    },
    {
      kind: "model-select",
      name: "fast_model_id",
      label: "Worker model",
      family: "chat",
      span: 6,
      description:
        "Routing worker roles to a smaller model is usually the largest saving available.",
    },
    { kind: "number", name: "tasks_per_day", label: "Tasks per day", span: 6, min: 1 },
  ],
  submitLabel: "Plan the workflow",
  result: { blocks: [], component: WorkflowDag },
  handoffs: [
    {
      to: "agent-cost",
      label: "Cost this roster properly",
      description: "The plan prices nodes on default token profiles. Enter measured ones here.",
      values: ({ input, metrics }) => ({
        tasks_per_day: Number(input.tasks_per_day ?? 100),
        tool_count: Array.isArray(input.available_tools) ? input.available_tools.length : undefined,
        agents: [
          {
            role: `${String(metrics.topology ?? "agent")} roster`,
            model_id: String(input.frontier_model_id ?? "gpt-4o-mini"),
            count: Number(metrics.agents ?? 1),
            steps_per_task: 4,
          },
        ],
      }),
    },
  ],
  relatedTools: ["agent-cost", "mcp-config", "rate-limits"],
};

export const functionSchemaSpec: ToolSpec = {
  slug: "function-schema",
  group: "agents",
  eyebrow: "WF3",
  title: "Function Schema Generator",
  summary:
    "Tool schemas for OpenAI, Anthropic, MCP, or plain JSON Schema — validated against the format, not eyeballed.",
  keywords: ["json schema", "tool calling", "function calling", "openai", "anthropic", "mcp"],
  endpoint: "/api/v1/tools/agents/function-schema",
  tier: "free",
  input: z.object({
    tools: z.array(toolDefinitionSchema).min(1, "Define at least one tool.").max(30),
    target: z.enum(["openai", "anthropic", "json-schema", "mcp"]),
  }),
  defaults: {
    target: "anthropic",
    tools: [
      {
        name: "search_orders",
        description: "Find orders for a customer within a date range.",
        parameters: [
          {
            name: "customer_id",
            type: "string",
            description: "The customer's id, as returned by list_customers.",
            required: true,
          },
          {
            name: "status",
            type: "string",
            description: "One of: open, shipped, cancelled.",
            required: true,
          },
        ],
      },
    ],
  },
  fields: [
    {
      kind: "radio-group",
      name: "target",
      label: "Target format",
      options: [
        { value: "anthropic", label: "Anthropic", hint: "input_schema" },
        { value: "openai", label: "OpenAI", hint: "type: function" },
        { value: "mcp", label: "MCP", hint: "inputSchema" },
        { value: "json-schema", label: "JSON Schema", hint: "bare, draft 2020-12" },
      ],
    },
    toolDefinitionsField,
  ],
  submitLabel: "Generate schemas",
  result: {
    blocks: [
      {
        kind: "metrics",
        keys: ["tools", "parameters", "valid", "target"],
        columns: 4,
        labels: { valid: "Validates" },
      },
      { kind: "callout" },
      { kind: "code", artifact: "schema", title: "Schemas" },
      {
        kind: "table",
        key: "tools",
        title: "Per tool",
        description:
          "A schema can be valid and still be a bad tool definition. The warnings above cover the difference.",
      },
      { kind: "json" },
    ],
  },
  handoffs: [
    {
      to: "mcp-config",
      label: "Turn these into a running server",
      values: ({ input }) => ({ tools: input.tools }),
    },
  ],
  relatedTools: ["mcp-config", "agent-cost"],
};

export const rateLimitsSpec: ToolSpec = {
  slug: "rate-limits",
  group: "agents",
  eyebrow: "WF3",
  title: "API Rate Limit Calculator",
  summary:
    "Which ceiling binds first — usually not requests per minute, and often not the provider's at all.",
  keywords: ["rpm", "tpm", "throttle", "backoff", "429", "quota", "concurrency"],
  endpoint: "/api/v1/tools/agents/rate-limits",
  tier: "free",
  input: z.object({
    provider: z.enum(["anthropic", "openai", "google"]),
    tier: z.string().min(1),
    requests_per_min: z.number().int().min(1).max(10_000_000),
    input_tokens_per_request: z.number().int().min(0).max(2_000_000),
    output_tokens_per_request: z.number().int().min(0).max(200_000),
    concurrency: z.number().int().min(1).max(100_000),
    avg_request_seconds: z.number().min(0.1).max(600),
    burst_multiplier: z.number().min(1).max(100).optional(),
    burst_duration_seconds: z.number().int().min(1).max(3600).optional(),
  }),
  defaults: {
    provider: "anthropic",
    tier: "tier-1",
    requests_per_min: 60,
    input_tokens_per_request: 4000,
    output_tokens_per_request: 800,
    concurrency: 8,
    avg_request_seconds: 4,
    burst_multiplier: 3,
    burst_duration_seconds: 60,
  },
  fields: [
    {
      kind: "radio-group",
      name: "provider",
      label: "Provider",
      options: [
        { value: "anthropic", label: "Anthropic", hint: "input and output metered separately" },
        { value: "openai", label: "OpenAI", hint: "one combined token budget" },
        { value: "google", label: "Google Gemini", hint: "one combined token budget" },
      ],
    },
    {
      kind: "select",
      name: "tier",
      label: "Tier",
      span: 6,
      options: [
        { value: "free", label: "Free", hint: "OpenAI and Google only" },
        { value: "tier-1", label: "Tier 1" },
        { value: "tier-2", label: "Tier 2" },
        { value: "tier-3", label: "Tier 3" },
        { value: "tier-4", label: "Tier 4", hint: "not published by Google" },
        { value: "tier-5", label: "Tier 5", hint: "OpenAI only" },
      ],
    },
    { kind: "number", name: "requests_per_min", label: "Requests per minute", span: 6, min: 1 },
    {
      kind: "number",
      name: "input_tokens_per_request",
      label: "Input tokens / request",
      span: 6,
      min: 0,
    },
    {
      kind: "number",
      name: "output_tokens_per_request",
      label: "Output tokens / request",
      span: 6,
      min: 0,
      description: "Agent loops emit far more of these per minute than chat does.",
    },
    {
      kind: "number",
      name: "concurrency",
      label: "Requests in flight",
      span: 6,
      min: 1,
      description: "Your own ceiling. It binds before the provider's more often than not.",
    },
    {
      kind: "number",
      name: "avg_request_seconds",
      label: "Seconds per request",
      span: 6,
      min: 0.1,
      step: 0.5,
      unit: "s",
    },
    {
      kind: "slider",
      name: "burst_multiplier",
      label: "Peak vs average",
      span: 6,
      min: 1,
      max: 10,
      step: 0.5,
      format: (value) => `${value}x`,
    },
    {
      kind: "number",
      name: "burst_duration_seconds",
      label: "Burst lasts",
      span: 6,
      min: 1,
      unit: "s",
    },
  ],
  submitLabel: "Check headroom",
  result: {
    blocks: [
      {
        kind: "metrics",
        keys: ["binding_constraint", "headroom_pct", "max_sustainable_rpm", "recommended_tier"],
        emphasise: "binding_constraint",
        labels: {
          binding_constraint: "Binds first",
          headroom_pct: "Headroom",
          max_sustainable_rpm: "Sustainable RPM",
          recommended_tier: "Tier needed",
        },
      },
      { kind: "callout" },
      {
        kind: "table",
        key: "constraints",
        title: "Every ceiling, scored",
        description: "Including your own concurrency, which no tier upgrade moves.",
      },
      {
        kind: "table",
        key: "backoff",
        title: "Backoff",
        description:
          "Chosen for what is actually binding — retrying a token-bound 429 re-spends a budget you do not have.",
      },
      { kind: "table", key: "tiers", title: "Published tiers" },
      { kind: "json" },
    ],
  },
  handoffs: [
    {
      to: "agent-cost",
      label: "Cost this volume",
      values: ({ input }) => ({
        input_tokens_per_step: Number(input.input_tokens_per_request ?? 0),
        output_tokens_per_step: Number(input.output_tokens_per_request ?? 0),
      }),
    },
  ],
  relatedTools: ["agent-cost", "workflow-plan"],
};

export const AGENT_SPECS = [
  mcpConfigSpec,
  agentCostSpec,
  workflowPlanSpec,
  functionSchemaSpec,
  rateLimitsSpec,
];
