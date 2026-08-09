/**
 * Accent themes.
 *
 * Two independent axes, deliberately. `next-themes` owns light/dark/system;
 * this owns the accent hue. Folding them into one setting would mean six
 * accents times three modes as eighteen named themes, and picking "dark" would
 * silently reset your accent.
 *
 * The swatch values here are only for the picker preview. The real colours
 * live in `globals.css` under `[data-accent="…"]`, because a colour defined in
 * two places is a colour that will disagree with itself.
 */

export type AccentValue = "ember" | "azure" | "orchid" | "graphite";

export type Accent = {
  value: AccentValue;
  label: string;
  /** Shown in the tooltip. Only where the name alone is not enough. */
  hint?: string;
  /** Preview only — the applied colour comes from CSS. */
  swatch: string;
  swatchDark: string;
};

export const ACCENTS: readonly Accent[] = [
  {
    value: "ember",
    label: "Ember",
    hint: "Default",
    swatch: "oklch(0.5896 0.1372 42.5)",
    swatchDark: "oklch(0.7024 0.1289 45)",
  },
  {
    value: "azure",
    label: "Azure",
    swatch: "oklch(0.5896 0.1372 217)",
    swatchDark: "oklch(0.7024 0.1289 217)",
  },
  {
    value: "orchid",
    label: "Orchid",
    swatch: "oklch(0.5896 0.1372 332)",
    swatchDark: "oklch(0.7024 0.1289 332)",
  },
  {
    value: "graphite",
    label: "Graphite",
    hint: "No colour",
    swatch: "oklch(0.5896 0.012 80)",
    swatchDark: "oklch(0.7024 0.012 80)",
  },
];

export const DEFAULT_ACCENT: AccentValue = "ember";
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
 * Written as a string rather than a real function because it has to run
 * before React exists. It is wrapped in try/catch: a browser with storage
 * blocked should get the default accent, not a blank page.
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
