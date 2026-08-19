import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";

const verifyEmail = vi.hoisted(() => vi.fn());
const auth = vi.hoisted(() => ({
  status: "loading" as "loading" | "authenticated" | "anonymous",
  refreshUser: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams("token=verification-token-1234"),
}));

vi.mock("@/lib/api/auth", () => ({ authApi: { verifyEmail } }));
vi.mock("@/lib/auth/auth-provider", () => ({ useAuth: () => auth }));

const { default: VerifyEmailPage } = await import("./page");

beforeEach(() => {
  vi.clearAllMocks();
  auth.status = "loading";
  verifyEmail.mockResolvedValue(undefined);
  auth.refreshUser.mockResolvedValue(undefined);
});

it("refreshes the authenticated user after auth bootstrap settles", async () => {
  const page = render(<VerifyEmailPage />);

  await waitFor(() =>
    expect(verifyEmail).toHaveBeenCalledWith({ token: "verification-token-1234" }),
  );
  expect(auth.refreshUser).not.toHaveBeenCalled();

  auth.status = "authenticated";
  page.rerender(<VerifyEmailPage />);

  await waitFor(() => expect(auth.refreshUser).toHaveBeenCalledOnce());
  expect(screen.getByRole("heading", { name: "Email verified" })).toBeInTheDocument();
});
