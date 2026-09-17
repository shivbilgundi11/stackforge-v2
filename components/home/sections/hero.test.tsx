import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type * as MotionModule from "motion/react";

/**
 * The hero's stacking context.
 *
 * This is a one-class assertion with a real bug behind it. The ring of stills
 * gives every item a z-index of 0–1000 read off its position around the
 * ellipse — that is how a still at the front overlaps one at the back — and
 * the copy and the footer rail answer with 1000 of their own to clear the
 * ring. All of it is correct *as long as those numbers stay inside the hero*.
 *
 * `relative` does not open a stacking context, so they did not. They competed
 * with the whole document and beat the fixed header at 60 and the mobile menu
 * at 55, which made an opaque menu look half-transparent: the hero was
 * painting straight through it. The reported symptom was "the mobile menu is
 * see-through" and the cause was in this file.
 *
 * jsdom computes no layout and resolves no stacking, so there is nothing to
 * assert about what covers what. What can be asserted is the property that
 * makes it impossible — and since `isolate` is invisible in every screenshot,
 * it is exactly the kind of class someone removes while tidying.
 */

vi.mock("motion/react", async () => {
  const actual = await vi.importActual<typeof MotionModule>("motion/react");
  return {
    ...actual,
    useScroll: () => ({ scrollYProgress: { get: () => 0, on: () => () => {} } }),
  };
});

const { Hero } = await import("@/components/home/sections/hero");

describe("Hero", () => {
  it("keeps its z-indexes to itself", () => {
    const { container } = render(<Hero />);
    const section = container.querySelector("section");

    expect(section, "the hero should render a section").toBeTruthy();
    expect(
      section!.className,
      "without `isolate` the hero's z-1000s outrank the fixed nav and the mobile menu",
    ).toContain("isolate");
  });

  it("does not raise the section itself above the page", () => {
    // The fix is to scope the numbers, not to add one. A z-index here would
    // put the whole hero into the page's stacking order and re-create the
    // problem one level up.
    const { container } = render(<Hero />);
    const section = container.querySelector("section")!;

    expect(section.className).not.toMatch(/(^|\s)z-\[/);
  });
});
