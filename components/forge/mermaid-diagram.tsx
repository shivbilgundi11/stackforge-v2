"use client";

import { useTheme } from "next-themes";
import { useEffect, useId, useRef, useState } from "react";

/**
 * A rendered Mermaid diagram.
 *
 * M18 deferred this and shipped the source instead, which was the right call
 * for an export — a fenced block is identical on every PDF backend and still
 * copy-pasteable. On a public blueprint page it is the wrong call: the diagram
 * *is* the content, and five of the library's thirty templates are
 * architecture blueprints whose whole argument is a picture.
 *
 * Three things keep the cost contained:
 *
 * **Dynamically imported.** Mermaid is around half a megabyte. It is fetched
 * only by the pages that contain a diagram, and only after paint.
 *
 * **The source stays in the DOM until the render succeeds**, and comes back if
 * it fails. A diagram that fails to parse leaves a developer something they can
 * paste elsewhere, which an empty frame does not.
 *
 * **`securityLevel: "strict"`.** Mermaid can emit click handlers and inline
 * HTML from diagram source. Template content is trusted today because it comes
 * from the repository, but this component will eventually render a diagram
 * somebody else wrote, and the default is not the one to discover that on.
 *
 * The theme variables are resolved to hex before they are handed over, and
 * this is the part that is easy to get wrong twice. Mermaid runs every colour
 * it is given through a colour library that lightens and darkens it to derive
 * the rest of the palette, and that library parses neither
 * `var(--color-surface)` nor the `lab(...)` those tokens compute to in this
 * design system. Either one throws, the whole render fails, and the component
 * falls back to source — silently, because the failure is caught. So the
 * tokens are read off the document and pushed through a 1×1 canvas, which is
 * the one conversion that works for any colour syntax the browser accepts.
 *
 * Re-reading them when the theme resolves differently is what makes the
 * picture follow the light/dark toggle.
 */

//: The token behind each Mermaid theme variable, and the hex to fall back to
//: when the document has no value for it — a caller outside the app shell, or
//: a browser that cannot convert what the token holds.
const THEME_TOKENS: Record<string, [token: string, fallback: string]> = {
  primaryColor: ["--color-surface-2", "#f4f4f5"],
  primaryTextColor: ["--color-fg", "#18181b"],
  primaryBorderColor: ["--color-line-strong", "#a1a1aa"],
  lineColor: ["--color-fg-subtle", "#71717a"],
  secondaryColor: ["--color-surface", "#ffffff"],
  tertiaryColor: ["--color-surface", "#ffffff"],
};

/** Any CSS colour the browser can paint, as `#rrggbb`. */
function toHex(value: string): string | null {
  const canvas = document.createElement("canvas");
  canvas.width = 1;
  canvas.height = 1;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) return null;

  // An unparseable value leaves `fillStyle` at its previous setting rather
  // than throwing, so the sentinel is what distinguishes "black" from "the
  // browser ignored me".
  context.fillStyle = "#000000";
  context.fillStyle = value;
  if (context.fillStyle === "#000000" && !/^(#000000|black|rgb\(0, 0, 0\))$/i.test(value.trim())) {
    return null;
  }

  context.fillRect(0, 0, 1, 1);
  const [r, g, b] = context.getImageData(0, 0, 1, 1).data;
  return `#${[r, g, b].map((channel) => (channel ?? 0).toString(16).padStart(2, "0")).join("")}`;
}

function resolvedThemeVariables(): Record<string, string> {
  const computed = getComputedStyle(document.documentElement);
  const variables: Record<string, string> = { background: "transparent" };
  for (const [name, [token, fallback]] of Object.entries(THEME_TOKENS)) {
    const value = computed.getPropertyValue(token).trim();
    variables[name] = (value && toHex(value)) || fallback;
  }
  return variables;
}
export function MermaidDiagram({ chart }: { chart: string }) {
  const container = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);
  const [rendered, setRendered] = useState(false);
  // Only as a redraw trigger — the colours come off the document, which
  // next-themes has already updated by the time this changes.
  const { resolvedTheme } = useTheme();
  // Mermaid needs a DOM id that is unique per diagram and stable across
  // renders; two diagrams sharing one id silently render the same picture.
  const id = useId().replace(/:/g, "");

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      // A rerun is a fresh attempt: a theme change after a failed parse
      // should not inherit the failure.
      setFailed(false);
      try {
        const mermaid = (await import("mermaid")).default;
        mermaid.initialize({
          startOnLoad: false,
          securityLevel: "strict",
          fontFamily: "var(--font-inter), sans-serif",
          // `base` plus variables rather than a named theme: the named themes
          // carry their own palette, which fights the accent the user chose.
          theme: "base",
          themeVariables: resolvedThemeVariables(),
        });

        const { svg } = await mermaid.render(`mermaid-${id}`, chart);
        if (cancelled || !container.current) return;
        container.current.innerHTML = svg;
        setRendered(true);
      } catch (error) {
        // Logged, not swallowed. The fallback is good enough that a broken
        // diagram looks deliberate, which is how this component shipped once
        // already without anyone noticing it never rendered.
        console.error("Mermaid render failed", error);
        if (!cancelled) setFailed(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [chart, id, resolvedTheme]);

  return (
    <figure className="my-1 overflow-hidden rounded-md border border-line bg-surface">
      <div
        ref={container}
        className="overflow-x-auto p-4 [&_svg]:mx-auto [&_svg]:h-auto [&_svg]:max-w-full"
        aria-label="Architecture diagram"
        role="img"
      />
      {!rendered ? (
        <pre
          className={`overflow-x-auto p-3 font-mono text-[11px] leading-relaxed text-fg-muted ${
            failed ? "" : "sr-only"
          }`}
        >
          {chart}
        </pre>
      ) : null}
    </figure>
  );
}
