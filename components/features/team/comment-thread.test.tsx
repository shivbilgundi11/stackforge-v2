import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { TooltipProvider } from "@/components/ui/tooltip";
import type { OrgComment, OrgRole } from "@/lib/api/team";

const listComments = vi.hoisted(() => vi.fn());
const createComment = vi.hoisted(() => vi.fn());
const deleteComment = vi.hoisted(() => vi.fn());
const resolveComment = vi.hoisted(() => vi.fn());
const listMembers = vi.hoisted(() => vi.fn());
const orgState = vi.hoisted(() => ({ role: "member" as OrgRole | null }));

vi.mock("@/lib/api/team", () => ({
  listComments,
  createComment,
  deleteComment,
  resolveComment,
  listMembers,
}));

vi.mock("@/lib/team/org-provider", () => ({
  useOrg: () => ({
    organizations: [],
    currentOrg:
      orgState.role === null
        ? null
        : {
            id: "org_1",
            name: "Acme",
            role: orgState.role,
          },
    role: orgState.role,
    switchOrg: vi.fn(),
    isLoading: false,
  }),
}));

vi.mock("@/lib/auth/auth-provider", () => ({
  useAuth: () => ({ status: "authenticated", user: { id: "usr_me", email: "me@acme.com" } }),
}));

vi.mock("@/components/toaster", () => ({
  notify: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
    done: vi.fn(),
  },
}));

const { CommentThread } = await import("@/components/features/team/comment-thread");

function comment(overrides: Partial<OrgComment>): OrgComment {
  return {
    id: "cmt_1",
    resource_type: "stack",
    resource_id: "stk_1",
    author_id: "usr_other",
    author_name: "Devon Dev",
    body: "Swap the cache?",
    parent_id: null,
    resolved_at: null,
    deleted: false,
    is_yours: false,
    created_at: "2026-08-10T10:00:00Z",
    updated_at: "2026-08-10T10:00:00Z",
    ...overrides,
  };
}

function renderThread() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <TooltipProvider>
        <CommentThread resourceType="stack" resourceId="stk_1" />
      </TooltipProvider>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  orgState.role = "member";
  listMembers.mockResolvedValue([]);
});

describe("visibility of the thread itself", () => {
  it("renders nothing at all when the resource has no thread", async () => {
    listComments.mockRejectedValue(Object.assign(new Error("Not found"), { status: 404 }));
    const { container } = renderThread();

    await waitFor(() => expect(listComments).toHaveBeenCalled());
    await waitFor(() => expect(container).toBeEmptyDOMElement());
  });

  it("shows the thread with replies nested under their root", async () => {
    listComments.mockResolvedValue([
      comment({}),
      comment({ id: "cmt_2", parent_id: "cmt_1", body: "Yes — Valkey.", author_name: "Ada" }),
    ]);
    renderThread();

    expect(await screen.findByText("Swap the cache?")).toBeInTheDocument();
    expect(screen.getByText("Yes — Valkey.")).toBeInTheDocument();
  });

  it("renders a deleted comment as a tombstone, keeping its replies", async () => {
    listComments.mockResolvedValue([
      comment({ deleted: true, body: "", author_name: null }),
      comment({ id: "cmt_2", parent_id: "cmt_1", body: "Still useful context." }),
    ]);
    renderThread();

    expect(await screen.findByText(/comment deleted/i)).toBeInTheDocument();
    expect(screen.getByText("Still useful context.")).toBeInTheDocument();
  });
});

describe("who can write", () => {
  it("gives a member the composer and posts through it", async () => {
    const user = userEvent.setup();
    listComments.mockResolvedValue([]);
    createComment.mockResolvedValue(comment({ is_yours: true }));
    renderThread();

    const box = await screen.findByLabelText("Comment");
    await user.type(box, "What about latency?");
    await user.click(screen.getByRole("button", { name: /^comment$/i }));

    await waitFor(() =>
      expect(createComment).toHaveBeenCalledWith({
        resource_type: "stack",
        resource_id: "stk_1",
        body: "What about latency?",
        parent_id: undefined,
        mentions: [],
      }),
    );
  });

  it("lets a viewer read but not write", async () => {
    orgState.role = "viewer";
    listComments.mockResolvedValue([comment({})]);
    renderThread();

    expect(await screen.findByText("Swap the cache?")).toBeInTheDocument();
    expect(screen.queryByLabelText("Comment")).not.toBeInTheDocument();
  });
});
