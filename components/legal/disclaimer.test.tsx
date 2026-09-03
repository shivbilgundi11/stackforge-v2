import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NuqsTestingAdapter } from "nuqs/adapters/testing";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";

import { TooltipProvider } from "@/components/ui/tooltip";
import type * as ToolsModule from "@/lib/api/tools";
import type { ToolRunResult } from "@/lib/api/tools";
import * as legal from "@/lib/legal/disclaimers";
import type { ToolGroup, ToolSpec } from "@/lib/tools/spec";

/**
 * Disclaimers, per `Stackforge_Disclaimer_Checklist_and_Copy.md`.
 *
 * The checklist's argument is that proximity does the work: a sentence beside
 * the number is worth more than a page of terms nobody opens. So what is
 * asserted here is *which* sentence appears and *where* — not that the
 * component renders, which is the assertion that would let the cost wording
 * silently appear on a business case.
 */

const runTool = vi.hoisted(() => vi.fn());
const getRun = vi.hoisted(() => vi.fn());

vi.mock("@/lib/api/tools", async (importOriginal) => ({
  ...(await importOriginal<typeof ToolsModule>()),
  runTool,
  getRun,
}));

vi.mock("react-hot-toast", () => ({ default: { error: vi.fn(), success: vi.fn() } }));

vi.mock("@/lib/auth/auth-provider", () => ({
  useAuth: () => ({ status: "authenticated", user: null, isVerified: false }),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn(), back: vi.fn() }),
  usePathname: () => "/cost/llm-pricing",
  useSearchParams: () => new URLSearchParams(),
}));

const { ToolPage } = await import("@/components/features/tools/tool-page");
const { FirstRunNotice } = await import("@/components/legal/first-run-notice");

function specFor(group: ToolGroup, keys: string[]): ToolSpec {
  return {
    slug: "test-tool",
    group,
    title: "Test Tool",
    summary: "A spec that exists only to exercise the disclaimer rules.",
    endpoint: "/api/v1/tools/test",
    tier: "free",
    input: z.object({ n: z.number().int().min(0) }),
    defaults: { n: 1 },
    fields: [{ kind: "number", name: "n", label: "N" }],
    result: { blocks: [{ kind: "metrics", keys }] },
  };
}

function resultWith(metrics: Record<string, string>): ToolRunResult {
  return {
    run_id: "run_test",
    tool_slug: "test-tool",
    source: "rule_based",
    duration_ms: 4,
    created_at: "2026-09-03T12:00:00Z",
    metrics,
    tables: {},
    series: {},
    artifacts: [],
    warnings: [],
    provenance: { oldest_verified_at: null, variant: "fresh", sources: [] },
    ai: null,
  };
}

function renderTool(spec: ToolSpec) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <TooltipProvider delayDuration={200}>
        <NuqsTestingAdapter searchParams="">
          <ToolPage spec={spec} />
        </NuqsTestingAdapter>
      </TooltipProvider>
    </QueryClientProvider>,
  );
}

async function run() {
  await userEvent.click(screen.getByRole("button", { name: /calculate/i }));
}

beforeEach(() => {
  vi.clearAllMocks();
  window.localStorage.clear();
});

describe("cost output", () => {
  it("puts the estimate wording beside a figure rendered as money", async () => {
    runTool.mockResolvedValue(resultWith({ monthly_cost: "56.30" }));
    renderTool(specFor("cost", ["monthly_cost"]));

    await run();

    await waitFor(() => expect(screen.getByText(legal.ESTIMATE)).toBeInTheDocument());
  });

  it("says nothing on a result with no money in it", async () => {
    // A chunking strategy or a token count is not a cost claim, and a cost
    // disclaimer under one is noise that teaches people to skip the real ones.
    runTool.mockResolvedValue(resultWith({ chunk_size: "512" }));
    renderTool(specFor("rag", ["chunk_size"]));

    await run();

    await waitFor(() => expect(screen.getByText("512")).toBeInTheDocument());
    expect(screen.queryByText(legal.ESTIMATE)).not.toBeInTheDocument();
  });
});

describe("the ROI calculator", () => {
  it("warns on the form before anything is calculated", () => {
    // The checklist asks for this specifically: saying it once the payback
    // period is on screen is late.
    renderTool(specFor("roi", ["annual_saving"]));

    expect(screen.getByText(legal.ROI_INPUT)).toBeInTheDocument();
  });

  it("uses the strict wording on the output, not the cost wording", async () => {
    // Its output is money too, so the rule that picks the sentence has to put
    // ROI first — a payback period in a board deck is a different claim from a
    // token price.
    runTool.mockResolvedValue(resultWith({ annual_saving: "120000" }));
    renderTool(specFor("roi", ["annual_saving"]));

    await run();

    await waitFor(() => expect(screen.getByText(legal.ROI_OUTPUT)).toBeInTheDocument());
    expect(screen.queryByText(legal.ESTIMATE)).not.toBeInTheDocument();
  });
});

describe("comparisons", () => {
  it("carries the comparison wording even with no money on screen", async () => {
    // A stack comparison's output is a recommendation rather than a figure,
    // and the claim being disclaimed is about the vendor data behind it.
    runTool.mockResolvedValue(resultWith({ winner: "qdrant" }));
    renderTool(specFor("compare", ["winner"]));

    await run();

    await waitFor(() => expect(screen.getByText(legal.COMPARISON)).toBeInTheDocument());
  });
});

describe("the first-run notice", () => {
  it("shows once and stays dismissed", async () => {
    const { unmount } = render(<FirstRunNotice tool="roi" />);
    expect(screen.getByText(legal.FIRST_RUN)).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /dismiss/i }));
    expect(screen.queryByText(legal.FIRST_RUN)).not.toBeInTheDocument();

    unmount();
    render(<FirstRunNotice tool="roi" />);
    expect(screen.queryByText(legal.FIRST_RUN)).not.toBeInTheDocument();
  });

  it("is dismissed per tool, not once for all of them", () => {
    // The checklist asks for two separate triggers. Dismissing it on the ROI
    // calculator must not silently dismiss it on a tool nobody has opened.
    window.localStorage.setItem("stackforge.first-run.roi", "1");

    render(<FirstRunNotice tool="architect" />);

    expect(screen.getByText(legal.FIRST_RUN)).toBeInTheDocument();
  });

  it("shows the notice when storage cannot be read", () => {
    // A private window throws on access. Showing a sentence somebody may have
    // read before beats breaking the page it sits on.
    const getItem = vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });

    render(<FirstRunNotice tool="roi" />);

    expect(screen.getByText(legal.FIRST_RUN)).toBeInTheDocument();
    getItem.mockRestore();
  });
});
