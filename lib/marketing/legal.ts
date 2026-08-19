import { readFile } from "node:fs/promises";
import path from "node:path";

/**
 * The legal documents, read from disk at build time (M22).
 *
 * Kept as Markdown in `content/legal/` rather than transcribed into TSX. These
 * are ~450 lines each of numbered clauses that counsel will revise as a
 * document, and a lawyer's redline against a file of JSX arrays is a
 * translation exercise where a dropped clause looks like a formatting change.
 * The file on disk is the artefact under review; the page renders it.
 *
 * `readFile` at module scope of a server component keeps `/legal/*` in the
 * statically prerendered set — no request, no API, which is what the group's
 * rule requires. It is also why this is not `import`ed: a bundler would inline
 * the text into the client chunk for no benefit.
 */

const DIR = path.join(process.cwd(), "content", "legal");

export type LegalDocument = "privacy" | "terms";

export async function readLegalDocument(name: LegalDocument): Promise<string> {
  return readFile(path.join(DIR, `${name}.md`), "utf8");
}

/**
 * The dates the document states, so the page can show them in its header
 * rather than burying them in the body.
 *
 * Parsed out rather than duplicated in the page: the document is what counsel
 * edits, and a date maintained separately from it is the one that goes stale.
 * Returns `null` for either field the document does not carry, because a
 * missing date must render as absent, never as today.
 */
export function readDates(markdown: string): {
  effective: string | null;
  updated: string | null;
  body: string;
} {
  const effective = /^\*\*Effective Date:\*\*\s*(.+?)\s*$/m.exec(markdown)?.[1] ?? null;
  const updated = /^\*\*Last Updated:\*\*\s*(.+?)\s*$/m.exec(markdown)?.[1] ?? null;

  // The two date lines and the rule under them are lifted into the page
  // header, so they are stripped from the body to avoid printing them twice.
  const body = markdown
    .replace(/^\*\*Effective Date:\*\*.*$/m, "")
    .replace(/^\*\*Last Updated:\*\*.*$/m, "")
    .replace(/^\s*---\s*$/m, "")
    .trimStart();

  return { effective, updated, body };
}
