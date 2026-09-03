/**
 * Brand badges on a rendered Mermaid diagram.
 *
 * The backend emits `%% brand:<node>:<icon>:<hex>` comments alongside the
 * diagram — see `app/services/diagram_theme.py`. Comments are invisible to
 * every Mermaid renderer, so the `.mmd` artefact stays portable and readable;
 * this is the renderer that knows what they mean and draws the logo.
 *
 * The badge is a disc on the box's top-left corner rather than an icon inside
 * the label. Mermaid has already sized every node by the time we see the SVG,
 * so anything placed *inside* either overlaps the text or needs a relayout;
 * a corner sticker needs neither and reads as deliberate.
 *
 * ## Two things that look like bugs and are not
 *
 * **Everything is painted through `style`, never the `fill` attribute.**
 * Mermaid ships a stylesheet inside the SVG that paints `.node circle` and
 * `.node path`, and a presentation attribute loses to any CSS rule. The first
 * version of this drew a row of identical grey discs.
 *
 * **The monogram clears its stroke.** That same stylesheet strokes text inside
 * a node. At eleven pixels the stroke is wider than the glyph, so the letter
 * is painted out completely and the badge looks like a plain coloured disc.
 */

export type Mark = { title: string; hex: string; path: string };
export type Marks = Record<string, Mark>;

export type Brand = { icon: string; hex: string };

const BRAND_LINE = /^\s*%%\s*brand:([A-Za-z0-9_]+):([a-z0-9]*):([0-9a-fA-F]{6})\s*$/;

/** The `%% brand:` metadata, keyed by node id. */
export function readBrands(source: string): Map<string, Brand> {
  const out = new Map<string, Brand>();
  for (const line of source.split("\n")) {
    const match = BRAND_LINE.exec(line);
    if (match) out.set(match[1]!, { icon: match[2]!, hex: match[3]! });
  }
  return out;
}

function channels(hex: string): [number, number, number] {
  const value = Number.parseInt(hex.replace("#", ""), 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}

/** WCAG relative luminance. */
export function luminance(hex: string): number {
  const [r, g, b] = channels(hex).map((channel) => {
    const scaled = channel / 255;
    return scaled <= 0.03928 ? scaled / 12.92 : ((scaled + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrast(a: string, b: string): number {
  const [lighter, darker] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * How a badge should be painted against a given page colour.
 *
 * A brand colour is chosen against the vendor's own background, not ours.
 * Anthropic is near-black and Temporal is black, so on the dark app surface
 * the disc disappears and the badge reads as a glyph floating in space. Below
 * the threshold the badge inverts — disc in the page's ink, glyph in the brand
 * — which keeps it legible without inventing a colour the brand does not own.
 */
export function badgeColours(brandHex: string, surface: string): { disc: string; ink: string } {
  const brand = brandHex.startsWith("#") ? brandHex : `#${brandHex}`;
  if (contrast(brand, surface) < 1.6) {
    return { disc: luminance(surface) > 0.5 ? "#18181b" : "#e4e4e7", ink: brand };
  }
  return { disc: brand, ink: contrast(brand, "#ffffff") >= 2.4 ? "#ffffff" : "#18181b" };
}

/**
 * The node name a Mermaid node id refers to.
 *
 * Ids look like `<svgId>-flowchart-<node>-<n>`, and the node name is the only
 * part this cares about. Returns null for anything that is not a flowchart
 * node, so a diagram type we have not met leaves the SVG untouched.
 */
export function nodeKey(id: string): string | null {
  const marker = "-flowchart-";
  const index = id.indexOf(marker);
  if (index === -1) return null;
  return id.slice(index + marker.length).replace(/-\d+$/, "");
}

const SVG_NS = "http://www.w3.org/2000/svg";
const RADIUS = 11;
//: simple-icons draw on a 24×24 grid; this is the size that grid maps onto.
const GLYPH = 13;

/** Draw a badge on every node the source names. Returns how many it drew. */
export function paintBadges(
  svg: SVGElement,
  source: string,
  marks: Marks,
  { surface = "#ffffff" }: { surface?: string } = {},
): number {
  const brands = readBrands(source);
  if (brands.size === 0) return 0;

  let painted = 0;
  for (const node of Array.from(svg.querySelectorAll("g.node"))) {
    const key = nodeKey(node.id || "");
    const brand = key ? brands.get(key) : undefined;
    if (!key || !brand) continue;

    const box = node.querySelector("rect.label-container, rect.basic");
    if (!box) continue;

    const x = Number(box.getAttribute("x"));
    const y = Number(box.getAttribute("y"));
    if (!Number.isFinite(x) || !Number.isFinite(y)) continue;

    const mark = marks[brand.icon];
    const { disc: discColour, ink } = badgeColours(mark ? mark.hex : brand.hex, surface);

    const badge = document.createElementNS(SVG_NS, "g");
    badge.setAttribute("class", "sf-brand-badge");
    badge.setAttribute("transform", `translate(${x}, ${y})`);
    badge.setAttribute("pointer-events", "none");

    const disc = document.createElementNS(SVG_NS, "circle");
    disc.setAttribute("r", String(RADIUS));
    disc.style.fill = discColour;
    // A ring in the page colour, so the badge reads as sitting on top of the
    // box rather than as part of its border.
    disc.style.stroke = surface;
    disc.style.strokeWidth = "2px";
    badge.appendChild(disc);

    if (mark) {
      const glyph = document.createElementNS(SVG_NS, "path");
      glyph.setAttribute("d", mark.path);
      glyph.setAttribute(
        "transform",
        `translate(${-GLYPH / 2}, ${-GLYPH / 2}) scale(${GLYPH / 24})`,
      );
      glyph.style.fill = ink;
      glyph.style.stroke = "none";
      badge.appendChild(glyph);

      const title = document.createElementNS(SVG_NS, "title");
      title.textContent = mark.title;
      badge.appendChild(title);
    } else {
      const letter = document.createElementNS(SVG_NS, "text");
      letter.setAttribute("x", "0");
      letter.setAttribute("y", "0");
      // `dy` in ems rather than `dominant-baseline: central`, which is
      // honoured inconsistently — headless Chromium printing to PDF is one of
      // the places it is not, and an off-centre letter is worse than none.
      letter.setAttribute("dy", "0.36em");
      letter.setAttribute("text-anchor", "middle");
      letter.style.fill = ink;
      letter.style.stroke = "none";
      letter.style.fontSize = "11px";
      letter.style.fontWeight = "700";
      letter.style.fontFamily = "system-ui, sans-serif";
      letter.textContent = (key[0] ?? "?").toUpperCase();
      badge.appendChild(letter);
    }

    node.appendChild(badge);
    painted += 1;
  }
  return painted;
}
