import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { cn } from "@/lib/utils";

/**
 * A long document, set in this surface's type.
 *
 * A **server** component, like the console's `Markdown` it is modelled on:
 * `react-markdown` runs during the render, so the policy is in the HTML a
 * crawler and a regulator receive rather than assembled after hydration, and
 * `/legal/*` stays in the statically prerendered set.
 *
 * ## Why this is not `components/forge/markdown.tsx`
 *
 * That component gives every element an explicit class from the *product's*
 * token set — `text-fg`, `border-line`, `text-forge` for links. This surface
 * has its own, fixed, and unrelated to the theme toggle: `--h-fg`, `--h-line`,
 * `--h-acc`. Rendering console-styled prose inside a bone-and-ink page puts an
 * indigo link and a product hairline into a page that has neither.
 *
 * Restyling by overriding those classes from the outside is the version that
 * looks like less duplication and is worse: it means a specificity fight with
 * `!important` against a component nobody would think to check before editing.
 * The override map below is the same shape as the console's, against a
 * different set of variables — which is the honest amount of duplication for
 * two type systems that genuinely differ.
 *
 * Mermaid is deliberately absent. The console's renderer supports diagrams
 * because templates contain them; a privacy policy does not, and leaving it
 * out keeps that client bundle off these pages entirely.
 *
 * ## Why the type does not scale up here
 *
 * The rest of this surface is set at a display scale. A document of numbered
 * clauses is not, and enlarging one does not make it more readable — it makes
 * it longer. What carries the design here is the ground, the palette, the mono
 * headings and the hairlines; the body stays at a reading size.
 */
export function Prose({ content, className }: { content: string; className?: string }) {
  return (
    <div
      className={cn(
        "flex flex-col gap-4 text-[15px] leading-relaxed text-[var(--h-fg-70)]",
        className,
      )}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // `h1` is the document's own title line. The page already renders one
          // in its header, so this is set as a section break rather than as a
          // second page title — two `h1`s in one document is the outline bug
          // this avoids.
          h1: ({ children }) => (
            <h2 className="t-head mt-10 border-b border-[var(--h-line)] pb-3 text-[clamp(1.4rem,2.6vw,2rem)] text-[var(--h-fg)] first:mt-0">
              {children}
            </h2>
          ),
          h2: ({ children }) => (
            <h2 className="t-head mt-9 text-[clamp(1.2rem,2.2vw,1.6rem)] text-[var(--h-fg)] first:mt-0">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="mt-7 text-[15px] font-semibold text-[var(--h-fg)] first:mt-0">
              {children}
            </h3>
          ),
          p: ({ children }) => <p className="text-pretty">{children}</p>,
          strong: ({ children }) => (
            <strong className="font-semibold text-[var(--h-fg)]">{children}</strong>
          ),
          a: ({ href, children }) => (
            <a
              href={href}
              className="u-link text-[var(--h-acc)]"
              // Only external links get this. An internal one opening a tab is
              // an internal one that loses the back button.
              {...(href?.startsWith("http")
                ? { target: "_blank", rel: "noopener noreferrer" }
                : {})}
            >
              {children}
            </a>
          ),
          ul: ({ children }) => (
            <ul className="flex list-disc flex-col gap-2 pl-5 marker:text-[var(--h-acc)]">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="flex list-decimal flex-col gap-2 pl-5 marker:text-[var(--h-fg-45)]">
              {children}
            </ol>
          ),
          li: ({ children }) => <li className="text-pretty">{children}</li>,
          blockquote: ({ children }) => (
            <blockquote className="border-l-2 border-[var(--h-acc)] pl-4 text-[var(--h-fg-45)]">
              {children}
            </blockquote>
          ),
          hr: () => <hr className="my-6 border-[var(--h-line)]" />,
          code: ({ children }) => (
            <code className="rounded bg-[var(--h-panel)] px-1.5 py-0.5 font-mono text-[13px] text-[var(--h-fg)]">
              {children}
            </code>
          ),
          table: ({ children }) => (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-[14px]">{children}</table>
            </div>
          ),
          th: ({ children }) => (
            <th className="t-mono border-b border-[var(--h-line-2)] py-2.5 pr-4 align-top text-[var(--h-fg)]">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="border-b border-[var(--h-line)] py-2.5 pr-4 align-top">{children}</td>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
