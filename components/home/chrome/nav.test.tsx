import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The marketing nav's mobile menu.
 *
 * Both assertions here are about one bug, reported as "the menu is
 * see-through — it blends into the hero and the nav". It was not
 * transparency. The panel's background has always been opaque ink; two
 * separate things were drawing over it or vanishing into it:
 *
 *   1. The hero paints above it. Its ring of stills carries a z-index of
 *      0–1000 taken from each item's position around the ellipse, and the
 *      copy answers with 1000 of its own to clear them. `relative` opens no
 *      stacking context, so those numbers competed with the whole document
 *      and beat the panel at 55 and the bar at 60. Covered by
 *      `hero.test.tsx`, which asserts the section isolates them.
 *   2. The bar vanishes into it. The header stays above the menu so the
 *      close control sits where the open control was, which means it keeps
 *      the *page's* palette while an ink panel slides up beneath it — and on
 *      a bone page that palette is near-black on near-black. The wordmark and
 *      both bars of the close button were drawn in the panel's own background
 *      colour, leaving no visible way to shut it again.
 *
 * The second is what this file covers, and `data-chapter` is the right thing
 * to assert: it is the whole palette switch, so a test on one colour would
 * pass while the rest of the bar stayed invisible.
 */

vi.mock("@/lib/auth/auth-provider", () => ({
  useAuth: () => ({ status: "signed-out", user: null, isVerified: false }),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/",
}));

const { HomeNav } = await import("@/components/home/chrome/nav");

beforeEach(() => {
  document.documentElement.style.overflow = "";
});

describe("HomeNav", () => {
  it("keeps the page palette while the menu is shut", () => {
    render(<HomeNav />);

    expect(screen.getByRole("banner")).not.toHaveAttribute("data-chapter");
  });

  it("takes the ink palette with it when the menu opens", async () => {
    render(<HomeNav />);

    await userEvent.click(screen.getByRole("button", { name: /open menu/i }));

    // The bar and the panel have to agree, or the bar is a hole in the top of
    // the panel — which is exactly how the bug looked.
    expect(screen.getByRole("banner")).toHaveAttribute("data-chapter", "ink");
    expect(document.getElementById("home-menu")).toHaveAttribute("data-chapter", "ink");
  });

  it("gives the palette back when the menu closes", async () => {
    render(<HomeNav />);

    const toggle = screen.getByRole("button", { name: /open menu/i });
    await userEvent.click(toggle);
    await userEvent.click(screen.getByRole("button", { name: /close menu/i }));

    expect(screen.getByRole("banner")).not.toHaveAttribute("data-chapter");
  });

  it("draws itself light while floating over an ink chapter", async () => {
    // /features opens on footage under a black scrim. The bar has no ground of
    // its own until it turns solid, so drawn in the page's near-black it was
    // invisible there — the mobile menu's bug, on a whole page.
    const ink = document.createElement("section");
    ink.setAttribute("data-chapter", "ink");
    document.body.append(ink);
    const probe = vi.fn(() => [ink]);
    Object.defineProperty(document, "elementsFromPoint", { value: probe, configurable: true });

    render(<HomeNav />);
    await new Promise((resolve) => requestAnimationFrame(resolve));

    expect(await screen.findByRole("banner")).toHaveClass("text-[var(--h-bone)]");
    ink.remove();
  });

  it("keeps the page's colour over a bone chapter", async () => {
    const bone = document.createElement("section");
    document.body.append(bone);
    Object.defineProperty(document, "elementsFromPoint", {
      value: vi.fn(() => [bone]),
      configurable: true,
    });

    render(<HomeNav />);
    await new Promise((resolve) => requestAnimationFrame(resolve));

    expect(screen.getByRole("banner")).not.toHaveClass("text-[var(--h-bone)]");
    bone.remove();
  });

  it("locks the page behind the open menu and releases it after", async () => {
    // A full-screen overlay with the page still scrolling underneath is the
    // classic version of this bug, and it is most obvious on the phone this
    // menu exists for.
    render(<HomeNav />);

    await userEvent.click(screen.getByRole("button", { name: /open menu/i }));
    expect(document.documentElement.style.overflow).toBe("hidden");

    await userEvent.click(screen.getByRole("button", { name: /close menu/i }));
    expect(document.documentElement.style.overflow).toBe("");
  });
});
