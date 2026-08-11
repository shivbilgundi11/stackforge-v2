import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, expect, it, vi } from "vitest";

import { TooltipProvider } from "@/components/ui/tooltip";
import type * as ExportsModule from "@/lib/api/exports";
import type { ExportOptions, ExportRecord } from "@/lib/api/exports";

/**
 * The tray's two load-bearing behaviours (M18).
 *
 * Both are commercial rather than technical, which is why they get a test:
 * a locked format that renders as nothing loses the conversion the whole
 * module exists for, and a Markdown button that ever locks breaks the promise
 * that the free answer is complete.
 */

const getExportOptions = vi.hoisted(() => vi.fn());
const createExport = vi.hoisted(() => vi.fn());
const downloadExport = vi.hoisted(() => vi.fn());

vi.mock("@/lib/api/exports", async (importOriginal) => ({
  ...(await importOriginal<typeof ExportsModule>()),
  getExportOptions,
  createExport,
  downloadExport,
  readExport: vi.fn(),
}));

vi.mock("react-hot-toast", () => ({
  default: { error: vi.fn(), success: vi.fn() },
}));

vi.mock("@/lib/auth/auth-provider", () => ({
  useAuth: () => ({ status: "authenticated", user: { id: "usr_1" }, isVerified: true }),
}));

vi.mock("@/lib/api/workspace", () => ({
  listProjects: vi.fn().mockResolvedValue([]),
  addProjectItem: vi.fn(),
}));

const { ArtifactTray } = await import("@/components/features/exports/artifact-tray");

const OPTIONS: ExportOptions = {
  source_type: "stack",
  source_id: "stk_1",
  title: "Client X RAG rollout",
  artifacts: [
    {
      type: "architecture",
      label: "Architecture document",
      description: "The whole plan in one file.",
      filename: "architecture.md",
      format: "markdown",
      emitted: false,
    },
  ],
  formats: [
    {
      format: "markdown",
      label: "Markdown",
      extension: "md",
      required_plan: "free",
      available: true,
    },
    { format: "pdf", label: "PDF", extension: "pdf", required_plan: "pro", available: false },
  ],
  tables: ["components"],
};

const READY: ExportRecord = {
  id: "exp_1",
  source_type: "stack",
  source_id: "stk_1",
  artifact_type: null,
  format: "markdown",
  status: "ready",
  filename: "client-x-rag-rollout.md",
  content_type: "text/markdown; charset=utf-8",
  size_bytes: 4096,
  error: null,
  expires_at: "2026-08-18T00:00:00Z",
  created_at: "2026-08-11T00:00:00Z",
  completed_at: "2026-08-11T00:00:00Z",
  download_url: "/api/v1/exports/exp_1/download",
};

function renderTray() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <TooltipProvider>
        <ArtifactTray sourceType="stack" sourceId="stk_1" />
      </TooltipProvider>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  getExportOptions.mockResolvedValue(OPTIONS);
  createExport.mockResolvedValue(READY);
});

it("shows a locked format rather than hiding it", async () => {
  renderTray();

  const locked = await screen.findByRole("button", {
    name: /Export as PDF — requires the pro plan/i,
  });
  expect(locked).toBeInTheDocument();
  // The plan is on the button, not only in the label a screen reader reads.
  expect(locked).toHaveTextContent(/pro/i);
});

it("opens the upgrade dialog instead of failing silently", async () => {
  const user = userEvent.setup();
  renderTray();

  await user.click(await screen.findByRole("button", { name: /Export as PDF/i }));

  expect(await screen.findByRole("dialog")).toHaveTextContent(/PDF export is on pro/i);
  // Nothing was requested — the gate is client-side *as well as* server-side,
  // so a locked click costs no round trip.
  expect(createExport).not.toHaveBeenCalled();
});

it("exports and downloads Markdown without a plan check", async () => {
  const user = userEvent.setup();
  renderTray();

  await user.click(await screen.findByRole("button", { name: /Export as Markdown/i }));

  await waitFor(() => expect(createExport).toHaveBeenCalledTimes(1));
  expect(createExport).toHaveBeenCalledWith(
    expect.objectContaining({ format: "markdown", source_id: "stk_1" }),
  );
  await waitFor(() => expect(downloadExport).toHaveBeenCalledWith(READY));
});

it("renders nothing when the source cannot be exported", async () => {
  getExportOptions.mockRejectedValue(new Error("not found"));
  const { container } = renderTray();

  // A result the caller does not own, or one not yet saved, is a normal state
  // — an error banner under every result would be noise.
  await waitFor(() => expect(container).toBeEmptyDOMElement());
});
