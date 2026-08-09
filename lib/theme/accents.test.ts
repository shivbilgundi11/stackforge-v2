/**
 * @vitest-environment jsdom
 *
 * The palette assertions are pure, but the pre-paint script writes to
 * `document` and reads `localStorage` — and testing it against a stub would
 * test the stub.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  ACCENTS,
  ACCENT_SCRIPT,
  DEFAULT_ACCENT,
  SEMANTIC_HUES,
  isAccent,
  type Accent,
} from "@/lib/theme/accents";

/**
 * What this file protects.
 *
 * Danger, warning, success, and the indigo that means AI-generated each own a
 * hue. An accent landing on one of them makes two different things look alike,
 * and the result looks entirely fine — a green primary button beside a green
 * success badge is not a rendering bug, it is a lost distinction. So the
 * separation is asserted rather than reviewed.
 *
 * The rule is symmetric: either the accent moves or the semantic moves. Every
 * accent declares which semantics it displaces, and this checks the *effective*
 * palette that results.
 */

/** Minimum hue separation between an accent and any semantic colour. */
const MIN_SEMANTIC_GAP = 25;

/** Minimum separation between two accents, so they read as different choices. */
const MIN_ACCENT_GAP = 22;

/**
 * Ember predates the rule and sits 17° from danger.
 *
 * It keeps the licence by being the default everyone learns first: moving
 * danger under the default theme would change a colour that has already
 * shipped, to fix a collision nobody has reported.
 */
const GRANDFATHERED = new Set(["ember"]);

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

/** The semantic hues in effect once this accent's shifts are applied. */
function effectiveSemantics(accent: Accent): Record<string, number> {
  return { ...SEMANTIC_HUES, ...(accent.shifts ?? {}) };
}

/** Chromatic accents only — graphite has no perceptible hue to collide with. */
function isChromatic(accent: Accent): boolean {
  return oklch(accent.swatch).c >= 0.05;
}

function lightBlock(value: string): string {
  const match = new RegExp(`\\[data-accent="${value}"\\] \\{([^}]*)\\}`).exec(CSS);
  if (!match) throw new Error(`globals.css has no light block for ${value}`);
  return match[1]!;
}

const CSS = readFileSync(join(process.cwd(), "app", "globals.css"), "utf8");

describe("the accent palette", () => {
  it("holds lightness and chroma constant across every option", () => {
    // The whole reason the tokens are OKLCH. If an accent drifts in L, its
    // button quietly loses contrast against its own label while looking
    // perfectly fine in a swatch row.
    const light = ACCENTS.map((accent) => oklch(accent.swatch));
    const dark = ACCENTS.map((accent) => oklch(accent.swatchDark));

    expect(new Set(light.map((colour) => colour.l)).size).toBe(1);
    expect(new Set(dark.map((colour) => colour.l)).size).toBe(1);
  });

  it("keeps every accent clear of every semantic colour it did not move", () => {
    for (const accent of ACCENTS) {
      if (!isChromatic(accent) || GRANDFATHERED.has(accent.value)) continue;
      const { h } = oklch(accent.swatch);

      for (const [name, hue] of Object.entries(effectiveSemantics(accent))) {
        expect(
          hueGap(h, hue),
          `${accent.label} sits ${hueGap(h, hue).toFixed(0)}° from ${name}. ` +
            `Either move the accent or declare a shift for ${name}.`,
        ).toBeGreaterThanOrEqual(MIN_SEMANTIC_GAP);
      }
    }
  });

  it("moves a semantic somewhere it does not collide with another semantic", () => {
    // Solving one collision by creating another is not solving it.
    for (const accent of ACCENTS) {
      for (const [token, hue] of Object.entries(accent.shifts ?? {})) {
        const others = Object.entries(effectiveSemantics(accent)).filter(
          ([name]) => name !== token,
        );
        for (const [name, otherHue] of others) {
          expect(
            hueGap(hue, otherHue),
            `under ${accent.label}, ${token} moved to ${hue}° and is now ` +
              `${hueGap(hue, otherHue).toFixed(0)}° from ${name}`,
          ).toBeGreaterThanOrEqual(MIN_SEMANTIC_GAP);
        }
      }
    }
  });

  it("only ever shifts a semantic that the accent actually collides with", () => {
    // A shift changes a meaning-carrying colour. Doing it where it is not
    // needed is churn dressed as caution.
    for (const accent of ACCENTS) {
      const { h } = oklch(accent.swatch);
      for (const token of Object.keys(accent.shifts ?? {})) {
        expect(
          hueGap(h, SEMANTIC_HUES[token as keyof typeof SEMANTIC_HUES]),
          `${accent.label} shifts ${token} but does not collide with it`,
        ).toBeLessThan(MIN_SEMANTIC_GAP);
      }
    }
  });

  it("keeps the accents distinguishable from each other", () => {
    // Two swatches 10° apart are one choice presented twice.
    const chromatic = ACCENTS.filter(isChromatic);
    for (let i = 0; i < chromatic.length; i += 1) {
      for (let j = i + 1; j < chromatic.length; j += 1) {
        const a = chromatic[i]!;
        const b = chromatic[j]!;
        expect(
          hueGap(oklch(a.swatch).h, oklch(b.swatch).h),
          `${a.label} and ${b.label} are the same colour to a user`,
        ).toBeGreaterThanOrEqual(MIN_ACCENT_GAP);
      }
    }
  });

  it("offers exactly one zero-chroma option", () => {
    expect(ACCENTS.filter((accent) => !isChromatic(accent))).toHaveLength(1);
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

describe("the stylesheet and the declarations", () => {
  it("defines a block for every accent except the default", () => {
    // The default is the absence of an override — `:root` already says it.
    for (const accent of ACCENTS) {
      const present = CSS.includes(`[data-accent="${accent.value}"]`);
      expect(present, `block mismatch for ${accent.value}`).toBe(accent.value !== DEFAULT_ACCENT);
    }
  });

  it("applies the hue the picker previews", () => {
    // The swatch is duplicated in TypeScript because CSS cannot be imported as
    // data. This is what stops the two drifting: a picker showing green while
    // the page turns purple is worse than either alone.
    for (const accent of ACCENTS) {
      if (accent.value === DEFAULT_ACCENT) continue;

      const ember = /--ember:\s*(oklch\([^)]*\))/.exec(lightBlock(accent.value));
      expect(ember, `${accent.value} sets no --ember`).not.toBeNull();
      expect(oklch(ember![1]!).h).toBe(oklch(accent.swatch).h);
    }
  });

  it("writes every declared shift into the stylesheet", () => {
    for (const accent of ACCENTS) {
      for (const [token, hue] of Object.entries(accent.shifts ?? {})) {
        const line = new RegExp(`--${token}:\\s*(oklch\\([^)]*\\))`).exec(lightBlock(accent.value));
        expect(
          line,
          `${accent.value} declares a ${token} shift the CSS does not apply`,
        ).not.toBeNull();
        expect(oklch(line![1]!).h).toBe(hue);
      }
    }
  });

  it("applies each shift in dark mode too", () => {
    // A shift that only exists in light mode restores the collision the moment
    // someone switches theme.
    for (const accent of ACCENTS) {
      if (!accent.shifts) continue;

      const match = new RegExp(`\\.dark\\[data-accent="${accent.value}"\\] \\{([^}]*)\\}`).exec(
        CSS,
      );
      expect(match, `no dark block for ${accent.value}`).not.toBeNull();

      for (const [token, hue] of Object.entries(accent.shifts)) {
        const line = new RegExp(`--${token}:\\s*(oklch\\([^)]*\\))`).exec(match![1]!);
        expect(line, `${accent.value} does not shift ${token} in dark mode`).not.toBeNull();
        expect(oklch(line![1]!).h).toBe(hue);
      }
    }
  });
});

describe("the pre-paint script", () => {
  it("applies a stored accent to the document element", () => {
    document.documentElement.removeAttribute("data-accent");
    localStorage.setItem("stackforge-accent", "violet");

    new Function(ACCENT_SCRIPT)();

    expect(document.documentElement.getAttribute("data-accent")).toBe("violet");
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
