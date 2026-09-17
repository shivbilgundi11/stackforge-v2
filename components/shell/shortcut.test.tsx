import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { Shortcut } from "@/components/shell/shortcut";

/**
 * The shortcut label.
 *
 * The bug being guarded is narrow and was live for the whole product: the
 * bindings accept `metaKey || ctrlKey` and always did, so Ctrl+K worked on
 * Windows the entire time — but every label said `⌘K`, naming a key that
 * machine does not have. What matters here is therefore not that a `<kbd>`
 * renders, it is that the *modifier named* follows the platform.
 */

/**
 * jsdom's `navigator.platform` is an empty string and not writable, so each
 * case installs its own. Configurable, so `afterEach` can put it back — a
 * leaked Mac platform would make every later test in the file pass for the
 * wrong reason.
 */
function setPlatform(value: string) {
  Object.defineProperty(window.navigator, "platform", { value, configurable: true });
}

afterEach(() => setPlatform(""));

describe("Shortcut", () => {
  it("names Ctrl on a platform that has one", () => {
    setPlatform("Win32");
    render(<Shortcut keyName="K" />);

    expect(screen.getByText("Ctrl K")).toBeInTheDocument();
    expect(screen.queryByText(/⌘/)).not.toBeInTheDocument();
  });

  it("names the Command key on a Mac", () => {
    setPlatform("MacIntel");
    render(<Shortcut keyName="K" />);

    expect(screen.getByText("⌘K")).toBeInTheDocument();
  });

  it("falls back to Ctrl when the platform is unreadable", () => {
    // A browser that reports "" must not be assumed to be a Mac: Ctrl is the
    // majority answer, and it is the one that is merely unidiomatic rather
    // than impossible if it is wrong.
    setPlatform("");
    render(<Shortcut keyName="K" />);

    expect(screen.getByText("Ctrl K")).toBeInTheDocument();
  });

  it("reads the whole chord out, whichever modifier it used", () => {
    // "⌘K" is announced as a glyph name or skipped outright, and neither is an
    // instruction anybody can follow.
    setPlatform("MacIntel");
    const { unmount } = render(<Shortcut keyName="K" />);
    expect(screen.getByLabelText("Command K")).toBeInTheDocument();
    unmount();

    setPlatform("Win32");
    render(<Shortcut keyName="K" />);
    expect(screen.getByLabelText("Control K")).toBeInTheDocument();
  });

  it("keeps the caller's styling", () => {
    // The three call sites each size the key to their own surface, so the
    // component has to stay a <kbd> that takes a className rather than one
    // that imposes a look.
    setPlatform("Win32");
    render(<Shortcut keyName="K" className="border-line font-mono" />);

    const kbd = screen.getByText("Ctrl K");
    expect(kbd.tagName).toBe("KBD");
    expect(kbd).toHaveClass("border-line", "font-mono");
  });
});
