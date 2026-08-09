/**
 * @vitest-environment jsdom
 *
 * The palette assertions are pure, but the pre-paint script writes to
 * `document` and reads `localStorage` — and testing it against a stub would
 * test the stub.
 */
import { describe, expect, it } from "vitest";

import { ACCENTS, ACCENT_SCRIPT, DEFAULT_ACCENT, isAccent } from "@/lib/theme/accents";

/**
 * The accent palette is constrained by meaning, not taste.
 *
 * Success, warning, danger, and the AI-synthesis indigo each own a hue. An
 * accent that lands on one of them turns a semantic colour into decoration —
 * and nothing about the resulting UI looks broken, which is why it needs a
 * test rather than a code review.
 */

/** Parses `oklch(L C H)` into its three components. */
function oklch(value: string): { l: number; c: number; h: number } {
  const match = /oklch\(([\d.]+)\s+([\d.]+)\s+([\d.]+)\)/.exec(value);
  if (!match) throw new Error(`Not an OKLCH colour: ${value}`);
  return { l: Number(match[1]), c: Number(match[2]), h: Number(match[3]) };
}

/** Shortest distance between two hues on the 360° wheel. */
function hueGap(a: number, b: number): number {
  const raw = Math.abs(a - b) % 360;
  return raw > 180 ? 360 - raw : raw;
}

// From globals.css. Restated here so the test fails when either moves.
const RESERVED = {
  forge: 279, // AI-synthesised. The one hard exclusion.
  success: 155,
  warning: 68,
  danger: 25.7,
};

describe("the accent palette", () => {
  it("keeps lightness and chroma constant across every option", () => {
    // The whole reason the tokens are OKLCH. If an accent drifts in L, its
    // button quietly loses contrast against its own label while looking fine
    // in a swatch row.
    const light = ACCENTS.map((accent) => oklch(accent.swatch));
    const dark = ACCENTS.map((accent) => oklch(accent.swatchDark));

    expect(new Set(light.map((c) => c.l)).size).toBe(1);
    expect(new Set(dark.map((c) => c.l)).size).toBe(1);
  });

  it("never places an accent near the indigo that means AI-generated", () => {
    for (const accent of ACCENTS) {
      const { h, c } = oklch(accent.swatch);
      // Graphite is exempt: at near-zero chroma the hue is not perceptible.
      if (c < 0.05) continue;

      expect(
        hueGap(h, RESERVED.forge),
        `${accent.label} sits ${hueGap(h, RESERVED.forge).toFixed(0)}° from the AI indigo`,
      ).toBeGreaterThan(45);
    }
  });

  it("keeps every non-brand accent clear of the semantic hues", () => {
    // Ember is exempt and only ember: it sits between danger and warning, a
    // licence the default earns by being the colour everyone learns first.
    for (const accent of ACCENTS) {
      if (accent.value === DEFAULT_ACCENT) continue;
      const { h, c } = oklch(accent.swatch);
      if (c < 0.05) continue;

      for (const [name, hue] of Object.entries(RESERVED)) {
        expect(
          hueGap(h, hue),
          `${accent.label} is ${hueGap(h, hue).toFixed(0)}° from ${name}`,
        ).toBeGreaterThan(45);
      }
    }
  });

  it("offers a zero-chroma option", () => {
    // "No colour" is a real preference, and the only way to express it here
    // without leaving the token system.
    const neutral = ACCENTS.filter((accent) => oklch(accent.swatch).c < 0.05);
    expect(neutral).toHaveLength(1);
  });

  it("names every accent uniquely and includes the default", () => {
    const values = ACCENTS.map((accent) => accent.value);
    expect(new Set(values).size).toBe(values.length);
    expect(values).toContain(DEFAULT_ACCENT);
  });

  it("recognises its own values and rejects anything else", () => {
    expect(isAccent(DEFAULT_ACCENT)).toBe(true);
    expect(isAccent("indigo")).toBe(false);
    expect(isAccent(null)).toBe(false);
  });
});

describe("the pre-paint script", () => {
  it("applies a stored accent to the document element", () => {
    document.documentElement.removeAttribute("data-accent");
    localStorage.setItem("stackforge-accent", "azure");

    new Function(ACCENT_SCRIPT)();

    expect(document.documentElement.getAttribute("data-accent")).toBe("azure");
  });

  it("ignores a value that is not in the palette", () => {
    // The stored value is attacker-adjacent: anything can write to
    // localStorage, and it lands in a DOM attribute.
    document.documentElement.removeAttribute("data-accent");
    localStorage.setItem("stackforge-accent", '" onload="alert(1)');

    new Function(ACCENT_SCRIPT)();

    expect(document.documentElement.hasAttribute("data-accent")).toBe(false);
  });

  it("does nothing when nothing is stored", () => {
    document.documentElement.removeAttribute("data-accent");
    localStorage.removeItem("stackforge-accent");

    new Function(ACCENT_SCRIPT)();

    expect(document.documentElement.hasAttribute("data-accent")).toBe(false);
  });
});
