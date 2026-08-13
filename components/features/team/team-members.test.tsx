import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { TooltipProvider } from "@/components/ui/tooltip";
import type { Organization, OrgMember, OrgRole } from "@/lib/api/team";

const listMembers = vi.hoisted(() => vi.fn());
const updateMemberRole = vi.hoisted(() => vi.fn());
const removeMember = vi.hoisted(() => vi.fn());
const transferOwnership = vi.hoisted(() => vi.fn());
const orgState = vi.hoisted(() => ({
  role: "owner" as OrgRole,
  org: null as Organization | null,
}));

vi.mock("@/lib/api/team", () => ({
  listMembers,
  updateMemberRole,
  removeMember,
  transferOwnership,
  createOrganization: vi.fn(),
}));

vi.mock("@/lib/team/org-provider", () => ({
  useOrg: () => ({
    organizations: orgState.org ? [orgState.org] : [],
    currentOrg: orgState.org,
    role: orgState.org?.role ?? null,
    switchOrg: vi.fn(),
    isLoading: false,
  }),
}));

vi.mock("@/lib/auth/auth-provider", () => ({
  useAuth: () => ({ status: "authenticated", user: { plan: "team" } }),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
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

const { TeamMembers } = await import("@/components/features/team/team-members");

function org(role: OrgRole): Organization {
  return {
    id: "org_1",
    name: "Acme",
    slug: "acme",
    plan: "team",
    role,
    seats: { used: 2, limit: 5, purchased: 5 },
    settings: { approved_tools: [], require_approval: false, default_visibility: "private" },
    created_at: "2026-08-01T00:00:00Z",
  };
}

const MEMBERS: OrgMember[] = [
  {
    id: "mem_owner",
    user_id: "usr_owner",
    name: "Olive Owner",
    email: "olive@acme.com",
    avatar_url: null,
    role: "owner",
    is_current_user: true,
    joined_at: "2026-08-01T00:00:00Z",
  },
  {
    id: "mem_dev",
    user_id: "usr_dev",
    name: "Devon Dev",
    email: "devon@acme.com",
    avatar_url: null,
    role: "member",
    is_current_user: false,
    joined_at: "2026-08-02T00:00:00Z",
  },
];

function renderView() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <TooltipProvider>
        <TeamMembers />
      </TooltipProvider>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  listMembers.mockResolvedValue(MEMBERS);
});

describe("the member list by role", () => {
  it("gives the owner role controls, transfer, and remove", async () => {
    orgState.org = org("owner");
    renderView();

    expect(await screen.findByText("Devon Dev")).toBeInTheDocument();
    // The owner row is never editable — ownership moves only by transfer.
    expect(screen.queryByLabelText(/role for olive owner/i)).not.toBeInTheDocument();
    expect(screen.getByLabelText(/role for devon dev/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /make owner/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /remove/i })).toBeInTheDocument();
  });

  it("shows a viewer the roster, read-only", async () => {
    orgState.org = org("viewer");
    renderView();

    expect(await screen.findByText("Devon Dev")).toBeInTheDocument();
    expect(screen.queryByLabelText(/role for devon dev/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /remove/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /make owner/i })).not.toBeInTheDocument();
  });

  it("an admin manages roles but cannot transfer ownership", async () => {
    orgState.org = org("admin");
    renderView();

    expect(await screen.findByText("Devon Dev")).toBeInTheDocument();
    expect(screen.getByLabelText(/role for devon dev/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /remove/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /make owner/i })).not.toBeInTheDocument();
  });
});

describe("destructive flows", () => {
  it("removal confirms in a dialog before calling the API", async () => {
    const user = userEvent.setup();
    orgState.org = org("owner");
    removeMember.mockResolvedValue(undefined);
    renderView();

    await user.click(await screen.findByRole("button", { name: /remove/i }));
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText(/remove devon dev/i)).toBeInTheDocument();

    await user.click(within(dialog).getByRole("button", { name: /remove member/i }));
    await waitFor(() => expect(removeMember).toHaveBeenCalledWith("org_1", "mem_dev"));
  });

  it("ownership transfer stays disarmed until the org name is typed back", async () => {
    const user = userEvent.setup();
    orgState.org = org("owner");
    transferOwnership.mockResolvedValue({ ...MEMBERS[1], role: "owner" });
    renderView();

    await user.click(await screen.findByRole("button", { name: /make owner/i }));
    const dialog = await screen.findByRole("dialog");

    const confirm = within(dialog).getByRole("button", { name: /transfer ownership/i });
    expect(confirm).toBeDisabled();

    await user.type(within(dialog).getByLabelText(/type/i), "Acme");
    expect(confirm).toBeEnabled();

    await user.click(confirm);
    await waitFor(() => expect(transferOwnership).toHaveBeenCalledWith("org_1", "mem_dev"));
  });
});
