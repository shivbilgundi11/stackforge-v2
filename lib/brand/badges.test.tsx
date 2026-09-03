import { describe, expect, it } from "vitest";

import { paintBadges } from "@/lib/brand/badges";
import marks from "@/lib/brand/marks.json";

/**
 * Painting, which needs a DOM.
 *
 * The rules these assert are the two that produced a diagram of identical
 * grey discs and a diagram of blank coloured discs respectively — both of
 * which render without error and look like a styling choice.
 */

describe("paintBadges", () => {
  function diagram(nodes: string[]): SVGElement {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    for (const [index, name] of nodes.entries()) {
      const node = document.createElementNS("http://www.w3.org/2000/svg", "g");
      node.setAttribute("class", "node");
      node.id = `mermaid-x-flowchart-${name}-${index}`;
      const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
      rect.setAttribute("class", "basic label-container");
      rect.setAttribute("x", "-50");
      rect.setAttribute("y", "-20");
      node.appendChild(rect);
      svg.appendChild(node);
    }
    return svg;
  }

  const SOURCE = ["    %% brand:database:postgresql:4169E1", "    %% brand:cache::0d9488"].join(
    "\n",
  );

  it("draws a logo for a known brand and a monogram for an unknown one", () => {
    const svg = diagram(["database", "cache"]);

    expect(paintBadges(svg, SOURCE, marks, { surface: "#ffffff" })).toBe(2);

    const [withLogo, withLetter] = Array.from(svg.querySelectorAll("g.sf-brand-badge"));
    expect(withLogo!.querySelector("path")).not.toBeNull();
    expect(withLogo!.querySelector("title")?.textContent).toBe("PostgreSQL");
    expect(withLetter!.querySelector("path")).toBeNull();
    expect(withLetter!.querySelector("text")?.textContent).toBe("C");
  });

  it("clears the stroke mermaid puts on text and paths", () => {
    // The regression this exists for: mermaid's own stylesheet strokes both,
    // and at eleven pixels that stroke is wider than the glyph — the letter is
    // painted out entirely and the badge looks like a plain coloured disc.
    const svg = diagram(["database", "cache"]);
    paintBadges(svg, SOURCE, marks, { surface: "#ffffff" });

    expect(svg.querySelector<SVGPathElement>(".sf-brand-badge path")!.style.stroke).toBe("none");
    expect(svg.querySelector<SVGTextElement>(".sf-brand-badge text")!.style.stroke).toBe("none");
  });

  it("paints through style, never the fill attribute", () => {
    // Same reason: a presentation attribute loses to mermaid's stylesheet,
    // which paints `.node circle` and would turn every badge grey.
    const svg = diagram(["database"]);
    paintBadges(svg, SOURCE, marks, { surface: "#ffffff" });

    const disc = svg.querySelector<SVGCircleElement>(".sf-brand-badge circle")!;
    expect(disc.getAttribute("fill")).toBeNull();
    expect(disc.style.fill).toBe("rgb(65, 105, 225)");
  });

  it("leaves a node the metadata does not name alone", () => {
    const svg = diagram(["database", "llm"]);

    expect(paintBadges(svg, SOURCE, marks, { surface: "#ffffff" })).toBe(1);
  });

  it("does nothing to a diagram with no metadata", () => {
    const svg = diagram(["database"]);

    expect(paintBadges(svg, "graph LR\n  a --> b", marks, {})).toBe(0);
    expect(svg.querySelector(".sf-brand-badge")).toBeNull();
  });
});
