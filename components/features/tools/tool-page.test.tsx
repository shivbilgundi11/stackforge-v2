import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NuqsTestingAdapter } from "nuqs/adapters/testing";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";

import { TooltipProvider } from "@/components/ui/tooltip";
import { ApiError } from "@/lib/api/errors";
import { useWorkflowSession } from "@/lib/stores/workflow-session";
import type * as ToolsModule from "@/lib/api/tools";
import type { ToolRunResult } from "@/lib/api/tools";
import type { ToolSpec } from "@/lib/tools/spec";

/**
 * `<ToolPage>` is one component behind 28 tools, so a defect here is a defect
 * in all of them at once. These cover the states the tool contract promises —
 * empty, pending, populated, field errors, quota — rather than any one tool's
 * arithmetic, which is unit-tested on the backend where the numbers live.
 */

const runTool = vi.hoisted(() => vi.fn());
const getRun = vi.hoisted(() => vi.fn());
const toastError = vi.hoisted(() => vi.fn());
const routerPush = vi.hoisted(() => vi.fn());

vi.mock("@/lib/api/tools", async (importOriginal) => ({
  ...(await importOriginal<typeof ToolsModule>()),
  runTool,
  getRun,
}));

vi.mock("react-hot-toast", () => ({
  default: { error: toastError, success: vi.fn() },
}));

// Narrow mocks for the two things this file is not about. `AuthProvider` does
// a token refresh on mount, and the App Router hooks need a router context;
// wiring either up would test the harness rather than the component.
vi.mock("@/lib/auth/auth-provider", () => ({
  useAuth: () => ({ status: "anonymous", user: null, isVerified: false }),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: routerPush, replace: vi.fn(), prefetch: vi.fn(), back: vi.fn() }),
  usePathname: () => "/cost/llm-pricing",
  useSearchParams: () => new URLSearchParams(),
}));

// Imported after the mocks so the component picks them up.
const { ToolPage } = await import("@/components/features/tools/tool-page");

const spec: ToolSpec = {
  slug: "llm-pricing",
  group: "cost",
  title: "Test Calculator",
  summary: "A spec that exists only to exercise the shared machinery.",
  endpoint: "/api/v1/tools/cost/llm-pricing",
  tier: "free",
  input: z.object({
    input_tokens: z.number().int().min(0),
    requests_per_day: z.number().int().min(0),
  }),
  defaults: { input_tokens: 2000, requests_per_day: 1000 },
  fields: [
    { kind: "number", name: "input_tokens", label: "Input tokens" },
    { kind: "number", name: "requests_per_day", label: "Requests per day" },
  ],
  result: {
    blocks: [{ kind: "metrics", keys: ["monthly_cost"], emphasise: "monthly_cost" }],
  },
  relatedTools: ["compare-models"],
};

const RESULT: ToolRunResult = {
  run_id: "run_test",
  tool_slug: "llm-pricing",
  source: "rule_based",
  duration_ms: 12,
  created_at: "2026-08-09T12:00:00Z",
  metrics: { monthly_cost: "56.309375" },
  tables: {},
  series: {},
  artifacts: [],
  warnings: [],
  provenance: {
    oldest_verified_at: "2026-08-09T00:00:00Z",
    variant: "fresh",
    sources: [
      {
        name: "OpenAI - API pricing",
        url: "https://openai.com/api/pricing",
        last_verified_at: "2026-08-09T00:00:00Z",
        age_days: 0,
        variant: "fresh",
      },
    ],
  },
  ai: null,
};

function renderTool(searchParams = "") {
  // `retry: false` so a rejected mutation surfaces immediately instead of
  // being retried past the test's timeout.
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  // The same providers `<Providers>` supplies, minus the two that are mocked.
  // Substituting a stub for TooltipProvider would let a provenance chip that
  // renders nothing pass.
  return render(
    <QueryClientProvider client={client}>
      <TooltipProvider delayDuration={200}>
        <NuqsTestingAdapter searchParams={searchParams}>
          <ToolPage spec={spec} />
        </NuqsTestingAdapter>
      </TooltipProvider>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  // The store is module state, so it outlives a render. Without this, one
  // test's pending handoff prefills the next test's form and the failure
  // points at whichever test happened to run second.
  useWorkflowSession.getState().clear();
});

describe("the four result states", () => {
  it("starts empty, and says what to do about it", () => {
    renderTool();
    expect(screen.getByText("No result yet")).toBeInTheDocument();
  });

  it("shows a pending state while the run is in flight", async () => {
    let release: (value: ToolRunResult) => void = () => {};
    runTool.mockReturnValue(
      new Promise<ToolRunResult>((resolve) => {
        release = resolve;
      }),
    );

    const user = userEvent.setup();
    renderTool();
    await user.click(screen.getByRole("button", { name: /calculate/i }));

    expect(await screen.findByRole("button", { name: /calculating/i })).toBeDisabled();
    expect(screen.queryByText("No result yet")).not.toBeInTheDocument();

    release(RESULT);
  });

  it("renders the computed figure once it lands", async () => {
    runTool.mockResolvedValue(RESULT);

    const user = userEvent.setup();
    renderTool();
    await user.click(screen.getByRole("button", { name: /calculate/i }));

    // The formatted value, not the raw decimal string — the point of the
    // metric block is that `"56.309375"` reaches the user as money.
    expect(await screen.findByText("$56.31")).toBeInTheDocument();
  });

  it("shows a toast, not a broken page, when the request fails outright", async () => {
    runTool.mockRejectedValue(new Error("network down"));

    const user = userEvent.setup();
    renderTool();
    await user.click(screen.getByRole("button", { name: /calculate/i }));

    await waitFor(() => expect(toastError).toHaveBeenCalled());
    expect(screen.getByText("No result yet")).toBeInTheDocument();
  });
});

describe("error mapping", () => {
  it("puts a 422 on the offending field rather than in a toast", async () => {
    // A toast for a field error makes the user hunt for which input was wrong.
    runTool.mockRejectedValue(
      new ApiError({
        status: 422,
        code: "VALIDATION_ERROR",
        message: "Validation failed.",
        details: { fields: [{ path: "requests_per_day", message: "Too many requests." }] },
      }),
    );

    const user = userEvent.setup();
    renderTool();
    await user.click(screen.getByRole("button", { name: /calculate/i }));

    expect(await screen.findByText("Too many requests.")).toBeInTheDocument();
    expect(toastError).not.toHaveBeenCalled();
  });

  it("opens the quota dialog on a 402, with the real figures in it", async () => {
    runTool.mockRejectedValue(
      new ApiError({
        status: 402,
        code: "QUOTA_EXCEEDED",
        message: "You have used all 5 runs for today.",
        details: {
          quota: {
            metric: "tool_runs",
            limit: 5,
            used: 5,
            remaining: 0,
            period: "day",
            resets_at: "2026-08-10T00:00:00Z",
            plan: "anonymous",
          },
        },
      }),
    );

    const user = userEvent.setup();
    renderTool();
    await user.click(screen.getByRole("button", { name: /calculate/i }));

    const dialog = await screen.findByRole("dialog");

    // "You have hit your limit" with no figures is a dead end — the numbers
    // are what tell the user whether to upgrade or just wait.
    expect(
      within(dialog).getByText(/used all 5 runs available on the anonymous plan/i),
    ).toBeInTheDocument();

    const used = within(dialog).getByText("Used").closest("div");
    expect(within(used as HTMLElement).getByText("5")).toBeInTheDocument();

    // An anonymous caller is offered an account, not a billing page.
    expect(within(dialog).getByRole("link", { name: /create a free account/i })).toHaveAttribute(
      "href",
      "/signup",
    );
    expect(toastError).not.toHaveBeenCalled();
  });
});

describe("provenance", () => {
  it("shows the verification date of the row the run actually read", async () => {
    runTool.mockResolvedValue(RESULT);

    const user = userEvent.setup();
    renderTool();
    await user.click(screen.getByRole("button", { name: /calculate/i }));

    await screen.findByText("$56.31");
    expect(screen.getByText(/OpenAI/)).toBeInTheDocument();
  });
});

describe("related tools", () => {
  it("links across groups, at the route the tool actually lives on", () => {
    // Both halves of a real bug: `compare-models` sits in the compare group
    // and is served from /compare/models, so a group-scoped lookup dropped it
    // and a `/${group}/${slug}` href sent it to /compare/compare-models.
    renderTool();

    const link = screen.getByRole("link", { name: /model compare/i });
    expect(link).toHaveAttribute("href", "/compare/models");
  });
});

describe("cross-workflow handoff", () => {
  const withHandoff: ToolSpec = {
    ...spec,
    handoffs: [
      {
        to: "budget-estimator",
        label: "Add as a workload",
        values: ({ metrics, input }) => ({
          lines: [
            {
              name: String(metrics.monthly_cost),
              model_id: "gpt-4o-mini",
              requests_per_day: input.requests_per_day,
              input_tokens: input.input_tokens,
              output_tokens: 300,
            },
          ],
        }),
      },
    ],
  };

  it("offers nothing until there is a result to carry", () => {
    renderTool();
    expect(screen.queryByText("Use this result")).not.toBeInTheDocument();
  });

  it("stores the values against the destination and navigates there", async () => {
    runTool.mockResolvedValue(RESULT);

    const client = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    const user = userEvent.setup();

    render(
      <QueryClientProvider client={client}>
        <TooltipProvider>
          <NuqsTestingAdapter searchParams="">
            <ToolPage spec={withHandoff} />
          </NuqsTestingAdapter>
        </TooltipProvider>
      </QueryClientProvider>,
    );

    await user.click(screen.getByRole("button", { name: /calculate/i }));
    await screen.findByText("$56.31");
    await user.click(screen.getByRole("button", { name: /add as a workload/i }));

    // Built from both halves: the run's metrics and the inputs that produced
    // them. A handoff that could only see one would have to guess the other.
    expect(useWorkflowSession.getState().pending["budget-estimator"]?.values).toEqual({
      lines: [
        {
          name: "56.309375",
          model_id: "gpt-4o-mini",
          requests_per_day: 1000,
          input_tokens: 2000,
          output_tokens: 300,
        },
      ],
    });

    // Routed via `toolHref`, not `/${group}/${slug}`.
    expect(routerPush).toHaveBeenCalledWith("/cost/budget-estimator");
  });

  it("consumes a pending handoff into the form, exactly once", async () => {
    useWorkflowSession.getState().send("llm-pricing", {
      from: "compare-models",
      fromTitle: "Model Compare",
      values: { input_tokens: 9000, requests_per_day: 42 },
    });

    renderTool();

    expect(screen.getByLabelText(/input tokens/i)).toHaveValue(9000);
    expect(screen.getByLabelText(/requests per day/i)).toHaveValue(42);

    // Consumed, not observed: leaving it in the store would re-apply it and
    // silently discard the user's edits on the next mount.
    await waitFor(() =>
      expect(useWorkflowSession.getState().pending["llm-pricing"]).toBeUndefined(),
    );
  });
});

describe("reopening a stored run", () => {
  it("restores the inputs and the result from ?run=", async () => {
    getRun.mockResolvedValue({
      id: "run_test",
      tool_slug: "llm-pricing",
      workflow: "cost",
      source: "rule_based",
      duration_ms: 12,
      saved: false,
      created_at: "2026-08-09T12:00:00Z",
      input: { input_tokens: 4000, requests_per_day: 250 },
      output: RESULT,
    });

    renderTool("?run=run_test");

    expect(await screen.findByText("$56.31")).toBeInTheDocument();
    // The inputs come back too: a reopened run is editable, not a receipt.
    await waitFor(() => expect(screen.getByLabelText(/input tokens/i)).toHaveValue(4000));
    expect(screen.getByLabelText(/requests per day/i)).toHaveValue(250);
  });

  it("does not sit on a skeleton when there is no run to reopen", () => {
    // A disabled TanStack query reports `isPending` forever; reading that as
    // "loading" would pin the skeleton on every tool nobody arrived at
    // through history.
    renderTool();

    expect(screen.getByText("No result yet")).toBeInTheDocument();
    expect(getRun).not.toHaveBeenCalled();
  });
});
