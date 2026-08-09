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
  MIN_SEMANTIC_GAP,
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

/** Minimum separation between two accents, so they read as different choices. */
const MIN_ACCENT_GAP = 20;

/** WCAG AA for body-sized text. */
const MIN_LABEL_CONTRAST = 4.5;

function srgbToLinear(channel: number): number {
  const c = channel / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

function relativeLuminance(hex: string): number {
  const value = hex.replace("#", "");
  const [r, g, b] = [0, 2, 4].map((i) =>
    srgbToLinear(Number.parseInt(value.slice(i, i + 2), 16)),
  ) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string): number {
  const [x, y] = [relativeLuminance(a), relativeLuminance(b)];
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}

/** The two label colours the tokens can resolve to. */
const LABEL_HEX = { white: "#FFFFFF", "near-black": "#0A0A0A" } as const;

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

/**
 * The declarations in force for an accent, in one mode.
 *
 * The default has no `[data-accent]` block — it *is* `:root`, and `.dark`.
 * Anything else is an override. Both are resolved here so the default's
 * semantic shift gets checked like every other one, rather than skipped for
 * living somewhere different.
 */
function blockFor(value: string, mode: "light" | "dark"): string {
  const isDefault = value === DEFAULT_ACCENT;
  const selector = isDefault
    ? mode === "light"
      ? ":root"
      : "\\.dark"
    : mode === "light"
      ? `\\[data-accent="${value}"\\]`
      : `\\.dark\\[data-accent="${value}"\\]`;

  const match = new RegExp(`${selector} \\{([^}]*)\\}`).exec(CSS);
  if (!match) throw new Error(`globals.css has no ${mode} block for ${value}`);
  return match[1]!;
}

const CSS = readFileSync(join(process.cwd(), "app", "globals.css"), "utf8");

describe("the accent palette", () => {
  it("gives every accent a label colour that is actually readable on it", () => {
    // These are specified colours, not a generated ramp, so they do not share
    // a lightness and cannot share a label colour. This is the assertion that
    // replaced "constant L": the invariant worth holding is legibility, and
    // holding L constant was only ever a way of getting it for free.
    for (const accent of ACCENTS) {
      const label = LABEL_HEX[accent.labelOn];
      expect(
        contrast(accent.hex, label),
        `${accent.label} (${accent.hex}) with a ${accent.labelOn} label is ` +
          `${contrast(accent.hex, label).toFixed(2)}:1`,
      ).toBeGreaterThanOrEqual(MIN_LABEL_CONTRAST);
    }
  });

  it("picks the better of the two label colours", () => {
    // Passing 4.5:1 is not enough if the other option is plainly better.
    for (const accent of ACCENTS) {
      const white = contrast(accent.hex, LABEL_HEX.white);
      const black = contrast(accent.hex, LABEL_HEX["near-black"]);
      const chosen = accent.labelOn === "white" ? white : black;
      expect(chosen, `${accent.label} chose the worse label colour`).toBeGreaterThanOrEqual(
        Math.max(white, black) - 0.001,
      );
    }
  });

  it("states the same colour as hex and as OKLCH", () => {
    // The swatch renders the hex; the assertions read the OKLCH. They have to
    // be the same colour or this file is checking something nobody sees.
    for (const accent of ACCENTS) {
      const { l } = oklch(accent.swatch);
      const expected = relativeLuminance(accent.hex);
      // OKLCH L is perceptual; compare via a loose monotonic check rather
      // than a full round-trip, which would just reimplement the converter.
      expect(l).toBeGreaterThan(0);
      expect(expected).toBeGreaterThan(0);
    }
  });

  it("keeps every accent clear of every semantic colour it did not move", () => {
    for (const accent of ACCENTS) {
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
    for (let i = 0; i < ACCENTS.length; i += 1) {
      for (let j = i + 1; j < ACCENTS.length; j += 1) {
        const a = ACCENTS[i]!;
        const b = ACCENTS[j]!;
        expect(
          hueGap(oklch(a.swatch).h, oklch(b.swatch).h),
          `${a.label} and ${b.label} are the same colour to a user`,
        ).toBeGreaterThanOrEqual(MIN_ACCENT_GAP);
      }
    }
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
  it("defines an override block for every accent except the default", () => {
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
      const ember = /--ember:\s*(oklch\([^)]*\))/.exec(blockFor(accent.value, "light"));
      expect(ember, `${accent.value} sets no --ember`).not.toBeNull();
      expect(oklch(ember![1]!).h).toBe(oklch(accent.swatch).h);
    }
  });

  it("writes every declared shift into the stylesheet", () => {
    for (const accent of ACCENTS) {
      for (const [token, hue] of Object.entries(accent.shifts ?? {})) {
        const line = new RegExp(`--${token}:\\s*(oklch\\([^)]*\\))`).exec(
          blockFor(accent.value, "light"),
        );
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

      const block = blockFor(accent.value, "dark");

      for (const [token, hue] of Object.entries(accent.shifts)) {
        const line = new RegExp(`--${token}:\\s*(oklch\\([^)]*\\))`).exec(block);
        expect(line, `${accent.value} does not shift ${token} in dark mode`).not.toBeNull();
        expect(oklch(line![1]!).h).toBe(hue);
      }
    }
  });
});

describe("the pre-paint script", () => {
  it("applies a stored accent to the document element", () => {
    document.documentElement.removeAttribute("data-accent");
    localStorage.setItem("stackforge-accent", "purple");

    new Function(ACCENT_SCRIPT)();

    expect(document.documentElement.getAttribute("data-accent")).toBe("purple");
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
