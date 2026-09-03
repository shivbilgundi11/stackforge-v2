import { describe, expect, it } from "vitest";

import { badgeColours, contrast, nodeKey, readBrands } from "@/lib/brand/badges";

/**
 * The badge rules, which are the part of this that can be wrong without
 * looking wrong — a logo that renders in the wrong colour still renders.
 *
 * Pure functions only, so this runs in `node`. The painting itself needs a
 * DOM and lives in `badges.test.tsx`.
 */

describe("readBrands", () => {
  it("reads the metadata the backend appends and ignores the diagram", () => {
    const source = [
      "graph LR",
      '    database["Database<br/>PostgreSQL"]',
      "    classDef sf-database stroke:#2563eb,stroke-width:2px",
      "",
      "    %% brand:database:postgresql:4169E1",
      "    %% brand:cache::0d9488",
    ].join("\n");

    expect(readBrands(source)).toEqual(
      new Map([
        ["database", { icon: "postgresql", hex: "4169E1" }],
        // An empty icon is the normal case for the half of the catalog no
        // icon set carries. The colour still arrives, so the monogram is not
        // a grey circle.
        ["cache", { icon: "", hex: "0d9488" }],
      ]),
    );
  });

  it("is empty for a diagram carrying no metadata", () => {
    expect(readBrands("graph LR\n  a --> b").size).toBe(0);
  });
});

describe("nodeKey", () => {
  it("pulls the node name out of a mermaid id", () => {
    expect(nodeKey("mermaid-r1-flowchart-vector_db-3")).toBe("vector_db");
  });

  it("returns null for anything that is not a flowchart node", () => {
    // A diagram type this has never met leaves the SVG untouched rather than
    // guessing at ids it does not understand.
    expect(nodeKey("mermaid-r1-sequence-actor-0")).toBeNull();
  });
});

describe("badgeColours", () => {
  it("uses the brand colour when it stands out from the page", () => {
    const { disc, ink } = badgeColours("4169E1", "#ffffff");

    expect(disc).toBe("#4169E1");
    expect(ink).toBe("#ffffff");
  });

  it("puts a dark glyph on a light brand", () => {
    // Hugging Face's yellow against the dark app surface: the disc stands out
    // from the page perfectly well, and a white glyph on it would not.
    const { disc, ink } = badgeColours("FFD21E", "#0b0b0e");

    expect(disc).toBe("#FFD21E");
    expect(ink).toBe("#18181b");
  });

  it("inverts a light brand on a light page rather than leaving a pale disc", () => {
    // DuckDB's yellow on white. Keeping the brand colour would be a badge
    // nobody can see, so the disc takes the page's ink and the brand moves to
    // the glyph.
    const { disc, ink } = badgeColours("FFF000", "#ffffff");

    expect(disc).toBe("#18181b");
    expect(ink).toBe("#FFF000");
  });

  it("inverts a brand that would disappear into the page", () => {
    // Anthropic is #191919 and the app's dark surface is near-black, so the
    // disc would vanish and leave a glyph floating in space.
    const { disc, ink } = badgeColours("191919", "#0b0b0e");

    expect(disc).toBe("#e4e4e7");
    expect(ink).toBe("#191919");
    expect(contrast(disc, "#0b0b0e")).toBeGreaterThan(1.6);
  });

  it("inverts the other way on a light page", () => {
    // The mirror case: a near-white brand on the printed page.
    expect(badgeColours("FFFFFF", "#ffffff").disc).toBe("#18181b");
  });
});
