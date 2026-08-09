/**
 * Accent themes.
 *
 * Two independent axes, deliberately. `next-themes` owns light/dark/system;
 * this owns the accent hue. Folding them into one setting would mean every
 * accent times three modes as a list of named themes, and picking "dark"
 * would silently reset your accent.
 *
 * The swatch values here are only for the picker preview — the applied colours
 * live in `globals.css`. They are restated rather than imported because CSS
 * cannot be imported as data, so `accents.test.ts` parses the stylesheet and
 * asserts the two agree. A colour defined in two places is a colour that will
 * disagree with itself.
 *
 * ## Why some accents move a semantic colour
 *
 * Four hues already carry meaning: danger, warning, success, and the indigo
 * that marks AI-generated content. An accent landing on one of them makes two
 * different things look alike — and nothing about the result looks broken,
 * which is what makes it worth encoding rather than trusting to review.
 *
 * The fix is not to refuse the accent. The rule is "these two must not look
 * alike", and either side can satisfy it, so the semantic token moves instead.
 * Each shift keeps the semantic reading correctly on its own: danger becomes
 * crimson, success becomes teal-green, the AI indigo becomes blue.
 */

export type AccentValue = "orange" | "purple" | "blue" | "green" | "yellow";

/** Semantic tokens an accent is allowed to displace. */
export type SemanticToken = "danger" | "warning" | "success" | "forge";

export type Accent = {
  value: AccentValue;
  label: string;
  /** Shown in the tooltip. Only where the name alone is not enough. */
  hint?: string;
  /** The colour as specified. The swatch renders this directly. */
  hex: string;
  /** The same colour in OKLCH, for the separation assertions. */
  swatch: string;
  /**
   * Label colour, chosen by contrast rather than assumed.
   *
   * These are given colours, not a generated ramp, so they do not share a
   * lightness. White on yellow is 1.6:1 and unreadable; on purple it is
   * 4.7:1 and fine. Assuming one answer for all five would ship the other.
   */
  labelOn: "white" | "near-black";
  /**
   * Semantic hues this accent displaces, and where they move to.
   *
   * Declared rather than left implicit in the stylesheet so the separation can
   * be asserted: an accent added later that collides without a shift fails the
   * test instead of shipping.
   */
  shifts?: Partial<Record<SemanticToken, number>>;
};

/** Base hues of the reserved tokens, from `:root` in `globals.css`. */
export const SEMANTIC_HUES: Record<SemanticToken | "warning", number> = {
  danger: 25.7,
  warning: 68,
  success: 155,
  forge: 279,
};

/** Below this, two colours read as the same thing. */
export const MIN_SEMANTIC_GAP = 20;

export const ACCENTS: readonly Accent[] = [
  {
    value: "orange",
    label: "Orange",
    hint: "Default",
    hex: "#ee7c37",
    swatch: "oklch(0.7048 0.1617 48.55)",
    labelOn: "near-black",
    shifts: { warning: 80 },
  },
  {
    value: "purple",
    label: "Purple",
    hex: "#8952ee",
    swatch: "oklch(0.5839 0.2221 294.75)",
    labelOn: "white",
    shifts: { forge: 240 },
  },
  {
    value: "blue",
    label: "Blue",
    hex: "#3a83f7",
    swatch: "oklch(0.6255 0.1884 259.46)",
    labelOn: "near-black",
    shifts: { forge: 310 },
  },
  {
    value: "green",
    label: "Green",
    hex: "#53b559",
    swatch: "oklch(0.6925 0.1592 144.75)",
    labelOn: "near-black",
    shifts: { success: 175 },
  },
  {
    value: "yellow",
    label: "Yellow",
    hex: "#f6c543",
    swatch: "oklch(0.845 0.151 87.33)",
    labelOn: "near-black",
    shifts: { warning: 55 },
  },
];

export const DEFAULT_ACCENT: AccentValue = "orange";
export const ACCENT_STORAGE_KEY = "stackforge-accent";

export function isAccent(value: unknown): value is AccentValue {
  return ACCENTS.some((accent) => accent.value === value);
}

/**
 * Applied before first paint by an inline script in `<head>`.
 *
 * Without it the page renders in ember and then repaints in the chosen
 * accent, which is the same flash-of-wrong-theme that `next-themes` exists to
 * avoid — and it is worse here, because the accent is on every button and
 * every focus ring at once.
 *
 * Written as a string rather than a real function because it has to run before
 * React exists. The stored value is checked against the palette before it
 * reaches a DOM attribute: anything can write to localStorage, and this writes
 * to the document element.
 */
export const ACCENT_SCRIPT = `
(function () {
  try {
    var stored = localStorage.getItem(${JSON.stringify(ACCENT_STORAGE_KEY)});
    var allowed = ${JSON.stringify(ACCENTS.map((accent) => accent.value))};
    if (stored && allowed.indexOf(stored) !== -1) {
      document.documentElement.setAttribute("data-accent", stored);
    }
  } catch (e) {}
})();
`.trim();
