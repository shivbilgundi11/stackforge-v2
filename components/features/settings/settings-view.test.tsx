import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { TooltipProvider } from "@/components/ui/tooltip";
import type { User } from "@/lib/api/auth";

const updateProfile = vi.hoisted(() => vi.fn());
const changePassword = vi.hoisted(() => vi.fn());
const deleteAccount = vi.hoisted(() => vi.fn());
const resendVerification = vi.hoisted(() => vi.fn());
const refreshUser = vi.hoisted(() => vi.fn());
const signOut = vi.hoisted(() => vi.fn());
const authStatus = vi.hoisted(() => ({ current: "authenticated", user: null as User | null }));

vi.mock("@/lib/api/auth", () => ({
  authApi: {
    updateProfile,
    changePassword,
    deleteAccount,
    resendVerification,
    logoutAll: vi.fn(),
  },
}));

vi.mock("@/lib/auth/auth-provider", () => ({
  useAuth: () => ({
    status: authStatus.current,
    user: authStatus.user,
    refreshUser,
    signOut,
  }),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => "/settings",
}));

vi.mock("react-hot-toast", () => ({
  default: { success: vi.fn(), error: vi.fn() },
}));

const { SettingsView } = await import("@/components/features/settings/settings-view");

const USER: User = {
  id: "usr_1",
  email: "engineer@example.com",
  name: "Sam Rivers",
  avatar_url: null,
  timezone: "Europe/London",
  role: "user",
  plan: "free",
  email_verified: true,
  must_set_password: false,
  created_at: "2026-01-01T00:00:00Z",
};

function renderView() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <TooltipProvider>
        <SettingsView />
      </TooltipProvider>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  authStatus.current = "authenticated";
  authStatus.user = USER;
  document.documentElement.removeAttribute("data-accent");
  localStorage.clear();
});

describe("appearance", () => {
  it("is available signed out, because a theme is not account data", () => {
    authStatus.current = "anonymous";
    authStatus.user = null;
    renderView();

    expect(screen.getByRole("radiogroup", { name: /accent colour/i })).toBeInTheDocument();
    expect(screen.getByRole("radiogroup", { name: /colour mode/i })).toBeInTheDocument();
    // …and the account sections simply are not there.
    expect(screen.queryByLabelText(/^name$/i)).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /sign in/i })).toBeInTheDocument();
  });

  it("writes the chosen accent to the document and to storage", async () => {
    const user = userEvent.setup();
    renderView();

    await user.click(screen.getByRole("radio", { name: "Orchid" }));

    expect(document.documentElement.getAttribute("data-accent")).toBe("orchid");
    expect(localStorage.getItem("stackforge-accent")).toBe("orchid");
  });

  it("removes the attribute for the default rather than naming it", async () => {
    // The default is the absence of an override. Setting data-accent="ember"
    // would mean the CSS carries a block restating what :root already says.
    const user = userEvent.setup();
    renderView();

    await user.click(screen.getByRole("radio", { name: "Orchid" }));
    await user.click(screen.getByRole("radio", { name: "Ember" }));

    expect(document.documentElement.hasAttribute("data-accent")).toBe(false);
    expect(localStorage.getItem("stackforge-accent")).toBe("ember");
  });
});

describe("profile", () => {
  it("shows the signed-in user's details", () => {
    renderView();

    expect(screen.getByLabelText(/^name$/i)).toHaveValue("Sam Rivers");
    expect(screen.getByText("engineer@example.com")).toBeInTheDocument();
    expect(screen.getByText(/verified/i)).toBeInTheDocument();
  });

  it("cannot be saved until something changes", async () => {
    renderView();
    expect(screen.getByRole("button", { name: /^save$/i })).toBeDisabled();

    await userEvent.setup().type(screen.getByLabelText(/^name$/i), "!");
    await waitFor(() => expect(screen.getByRole("button", { name: /^save$/i })).toBeEnabled());
  });

  it("saves the name and re-reads the user", async () => {
    updateProfile.mockResolvedValue({ ...USER, name: "Sam R" });
    const user = userEvent.setup();
    renderView();

    const name = screen.getByLabelText(/^name$/i);
    await user.clear(name);
    await user.type(name, "Sam R");
    await user.click(screen.getByRole("button", { name: /^save$/i }));

    await waitFor(() =>
      expect(updateProfile).toHaveBeenCalledWith(
        expect.objectContaining({ name: "Sam R", timezone: "Europe/London" }),
      ),
    );
    await waitFor(() => expect(refreshUser).toHaveBeenCalled());
  });

  it("offers to resend verification only when the address is unverified", () => {
    authStatus.user = { ...USER, email_verified: false };
    renderView();

    expect(screen.getByRole("button", { name: /resend verification/i })).toBeInTheDocument();
  });
});

describe("security", () => {
  it("rejects a mismatched confirmation before calling the API", async () => {
    const user = userEvent.setup();
    renderView();

    await user.type(screen.getByLabelText(/current password/i), "old-password-1");
    await user.type(screen.getByLabelText(/^new password$/i), "a-long-new-password");
    await user.type(screen.getByLabelText(/confirm new password/i), "a-different-one");
    await user.click(screen.getByRole("button", { name: /change password/i }));

    expect(await screen.findByText(/do not match/i)).toBeInTheDocument();
    expect(changePassword).not.toHaveBeenCalled();
  });

  it("does not ask for a current password when the account has none", () => {
    // OAuth signups have no password to confirm, and asking for one is an
    // unanswerable question.
    authStatus.user = { ...USER, must_set_password: true };
    renderView();

    expect(screen.queryByLabelText(/current password/i)).not.toBeInTheDocument();
    expect(screen.getByLabelText(/^new password$/i)).toBeInTheDocument();
  });
});

describe("deleting the account", () => {
  it("requires the email typed exactly before the button works", async () => {
    const user = userEvent.setup();
    renderView();

    await user.click(screen.getByRole("button", { name: /^delete account$/i }));
    const dialog = await screen.findByRole("dialog");
    const confirm = within(dialog).getByRole("button", { name: /delete permanently/i });

    expect(confirm).toBeDisabled();

    await user.type(
      within(dialog).getByPlaceholderText(/type your email/i),
      "engineer@example.com",
    );
    expect(confirm).toBeEnabled();

    await user.click(confirm);
    await waitFor(() => expect(deleteAccount).toHaveBeenCalled());
  });

  it("stays disabled for a near-miss", async () => {
    const user = userEvent.setup();
    renderView();

    await user.click(screen.getByRole("button", { name: /^delete account$/i }));
    const dialog = await screen.findByRole("dialog");

    await user.type(within(dialog).getByPlaceholderText(/type your email/i), "engineer@example.co");

    expect(within(dialog).getByRole("button", { name: /delete permanently/i })).toBeDisabled();
    expect(deleteAccount).not.toHaveBeenCalled();
  });
});
