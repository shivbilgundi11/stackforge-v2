/**
 * Regenerate the brand mark data both renderers draw from.
 *
 *   npx simple-icons@latest --version   # whatever version you want pinned
 *   npm run brand:marks
 *
 * ## Why a generated file and not a dependency
 *
 * `simple-icons` is three thousand icons and about two megabytes. The diagrams
 * use forty-seven catalog slugs across thirty-odd distinct marks, and a
 * runtime lookup by slug defeats tree-shaking — importing the package and
 * indexing it dynamically ships the whole set to every visitor who opens a
 * page with a diagram on it. Extracting the marks that are actually used is a
 * fortieth of the size and has no dependency at runtime at all.
 *
 * ## Why it is written twice
 *
 * The web renders diagrams in the browser and the PDF backend renders them in
 * headless Chromium, and the two live in different repositories. Both need the
 * same paths. Rather than have one fetch from the other at runtime — a network
 * call in the middle of an export — the same file is written to both, from
 * here, in one step. It is generated data: if the copies drift, re-run this.
 *
 * The source of truth for *which* marks are needed is the backend's
 * `app/data/brands.py`, because that is where a slug is mapped to an icon.
 * This script reads it rather than keeping a second list.
 */

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const BRANDS_PY = resolve(here, "../../backend/app/data/brands.py");
const TARGETS = [
  resolve(here, "../lib/brand/marks.json"),
  resolve(here, "../../backend/app/data/brand_marks.json"),
];

const icons = await import("simple-icons").catch(() => {
  console.error(
    "simple-icons is not installed. It is not a dependency — install it just to run this:\n" +
      "  npm install --no-save simple-icons && npm run brand:marks",
  );
  process.exit(1);
});

const bySlug = new Map();
for (const key of Object.keys(icons)) {
  const icon = icons[key];
  if (icon && icon.slug) bySlug.set(icon.slug, icon);
}

const source = readFileSync(BRANDS_PY, "utf8");
const wanted = [...new Set([...source.matchAll(/Mark\("([a-z0-9]+)",/g)].map((m) => m[1]))].sort();

if (wanted.length === 0) {
  console.error(`No Mark(...) entries found in ${BRANDS_PY}. Has the format changed?`);
  process.exit(1);
}

const marks = {};
const missing = [];
for (const slug of wanted) {
  const icon = bySlug.get(slug);
  // A brand that has been delisted since the map was written. Loud, because
  // the alternative is a diagram that silently loses a logo.
  if (!icon) {
    missing.push(slug);
    continue;
  }
  marks[slug] = { title: icon.title, hex: icon.hex, path: icon.path };
}

if (missing.length) {
  console.error(
    `Not in simple-icons any more: ${missing.join(", ")}\n` +
      `Remove them from ${BRANDS_PY} — those tools fall back to a monogram.`,
  );
  process.exit(1);
}

const json = `${JSON.stringify(marks, null, 0)}\n`;
for (const target of TARGETS) {
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, json, "utf8");
  console.log(`wrote ${Object.keys(marks).length} marks -> ${target}`);
}
