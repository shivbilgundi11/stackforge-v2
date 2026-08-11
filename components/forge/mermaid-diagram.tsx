"use client";

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
 */
export function MermaidDiagram({ chart }: { chart: string }) {
  const container = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);
  const [rendered, setRendered] = useState(false);
  // Mermaid needs a DOM id that is unique per diagram and stable across
  // renders; two diagrams sharing one id silently render the same picture.
  const id = useId().replace(/:/g, "");

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const mermaid = (await import("mermaid")).default;
        mermaid.initialize({
          startOnLoad: false,
          securityLevel: "strict",
          fontFamily: "var(--font-inter), sans-serif",
          // `base` plus variables rather than a named theme: the named themes
          // carry their own palette, which fights the accent the user chose.
          theme: "base",
          themeVariables: {
            background: "transparent",
            primaryColor: "var(--color-surface-2)",
            primaryTextColor: "var(--color-fg)",
            primaryBorderColor: "var(--color-line-strong)",
            lineColor: "var(--color-fg-subtle)",
            secondaryColor: "var(--color-surface)",
            tertiaryColor: "var(--color-surface)",
          },
        });

        const { svg } = await mermaid.render(`mermaid-${id}`, chart);
        if (cancelled || !container.current) return;
        container.current.innerHTML = svg;
        setRendered(true);
      } catch {
        if (!cancelled) setFailed(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [chart, id]);

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
