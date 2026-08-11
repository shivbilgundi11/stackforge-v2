import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { MermaidDiagram } from "@/components/forge/mermaid-diagram";
import { cn } from "@/lib/utils";

/**
 * Rendered Markdown, in Forge Console.
 *
 * A **server** component. `react-markdown` runs during the render, so the
 * prose is in the HTML a crawler receives rather than assembled by a client
 * bundle after hydration — which is the whole reason the template library can
 * be an acquisition surface. The only thing that ships JavaScript is a Mermaid
 * diagram, and that is lazily imported by the pages that contain one.
 *
 * Styled with explicit element overrides rather than a typography plugin. The
 * design system has one type scale and one set of line colours; a prose plugin
 * brings a second, and the two disagree everywhere they meet.
 */
export function Markdown({ content, className }: { content: string; className?: string }) {
  return (
    <div className={cn("flex flex-col gap-4 text-[13.5px] leading-relaxed text-fg", className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => (
            <h1 className="mt-4 border-b border-line pb-2 text-2xl font-semibold text-fg first:mt-0">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="mt-5 text-lg font-semibold text-fg first:mt-0">{children}</h2>
          ),
          h3: ({ children }) => (
            <h3 className="mt-4 text-[15px] font-semibold text-fg first:mt-0">{children}</h3>
          ),
          p: ({ children }) => <p className="text-pretty">{children}</p>,
          a: ({ href, children }) => (
            <a
              href={href}
              className="text-forge underline underline-offset-2"
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
            <ul className="flex list-disc flex-col gap-1.5 pl-5 marker:text-fg-subtle">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="flex list-decimal flex-col gap-1.5 pl-5 marker:text-fg-subtle">
              {children}
            </ol>
          ),
          li: ({ children }) => <li className="pl-1">{children}</li>,
          blockquote: ({ children }) => (
            <blockquote className="border-l-2 border-forge-line pl-3 text-fg-muted">
              {children}
            </blockquote>
          ),
          hr: () => <hr className="border-line" />,
          strong: ({ children }) => <strong className="font-semibold text-fg">{children}</strong>,
          table: ({ children }) => (
            // Scrolls inside its own container. A wide comparison table must
            // not make the whole page scroll sideways on a phone.
            <div className="overflow-x-auto rounded-md border border-line">
              <table className="w-full border-collapse text-xs">{children}</table>
            </div>
          ),
          thead: ({ children }) => <thead className="bg-surface-2/60">{children}</thead>,
          th: ({ children }) => (
            <th className="border-b border-line px-3 py-2 text-left font-semibold text-fg">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="border-b border-line px-3 py-2 align-top text-fg-muted">{children}</td>
          ),
          code: ({ className: language, children }) => {
            const match = /language-(\w+)/.exec(language ?? "");

            // No language class means an inline span, not a block.
            if (!match) {
              return (
                <code className="rounded-xs border border-line bg-surface-2 px-1 py-px font-mono text-[0.9em] text-fg">
                  {children}
                </code>
              );
            }

            const source = String(children).replace(/\n$/, "");
            if (match[1] === "mermaid") return <MermaidDiagram chart={source} />;

            return <code className="block font-mono text-[11.5px] leading-relaxed">{source}</code>;
          },
          pre: ({ children }) => (
            <pre className="overflow-x-auto rounded-md border border-line bg-surface-2/50 p-3">
              {children}
            </pre>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
