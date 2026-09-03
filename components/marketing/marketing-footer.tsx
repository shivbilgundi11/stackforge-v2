import Link from "next/link";

import { BrandLockup } from "@/components/shell/brand";
import * as legal from "@/lib/legal/disclaimers";

/**
 * The marketing footer.
 *
 * Same rule as the header: nothing here points at a page that does not exist.
 * Docs, blog, and the comparison pages join these columns when they ship, not
 * when they are planned (M22).
 */

/**
 * Navigation links to marketing destinations only.
 *
 * The footer used to be a directory of application routes — the five workflow
 * hubs, Compare Center, the tool graveyard, the template library. Every one of
 * them resolved, so nothing was broken, but following one dropped a visitor
 * out of the marketing layout and into the workbench shell mid-browse: sidebar,
 * command palette, breadcrumbs, and no way back to the site they were reading.
 *
 * A person clicking "Cost Planner" in a footer expects to read about the Cost
 * Planner, not to be handed the tool. So browsing links stay inside the
 * marketing site and point at the section of `/features` that describes each
 * surface; the only routes into the application are the explicit calls to
 * action, where being taken to the product is the whole intent.
 *
 * The per-surface landing pages M22 specifies (`/tools/[slug]`, with a live
 * embedded calculator) are the eventual home for the middle column. Until they
 * exist, the anchors on `/features` are the honest destination.
 */
const COLUMNS: { heading: string; links: { href: string; label: string }[] }[] = [
  {
    heading: "Product",
    links: [
      { href: "/features", label: "Features" },
      { href: "/pricing", label: "Pricing" },
      { href: "/faq", label: "FAQ" },
    ],
  },
  {
    heading: "What it does",
    links: [
      { href: "/features#stack-architect", label: "Stack Architect" },
      { href: "/features#llm-pricing", label: "Cost Planner" },
      { href: "/features#compare-models", label: "Compare Center" },
      { href: "/features#rag-architecture", label: "RAG Planner" },
      { href: "/features#mcp-config", label: "Agent & MCP Builder" },
      { href: "/features#vram-estimate", label: "Infra Planner" },
    ],
  },
  {
    heading: "Company",
    links: [
      { href: "/about", label: "About" },
      { href: "/contact", label: "Contact" },
      { href: "/legal/privacy", label: "Privacy" },
      { href: "/legal/terms", label: "Terms" },
    ],
  },
];

export function MarketingFooter() {
  return (
    <footer className="border-t border-line">
      <div className="mx-auto w-full max-w-[1120px] px-5 py-14">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div className="lg:col-span-1">
            <BrandLockup />
            <p className="mt-3 max-w-[28ch] text-[12.5px] leading-relaxed text-fg-muted">
              The planning layer AI engineering teams run before writing a line of code.
            </p>
          </div>

          {COLUMNS.map((column) => (
            <nav key={column.heading} aria-label={column.heading}>
              <h2 className="font-mono text-[10.5px] tracking-[0.12em] text-fg-subtle uppercase">
                {column.heading}
              </h2>
              <ul className="mt-3 flex flex-col gap-2">
                {column.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-[13px] text-fg-muted transition-colors hover:text-fg"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <div className="mt-12 flex flex-col gap-3 border-t border-line pt-6 text-[12px] text-fg-subtle">
          {/* Above the copyright line rather than beside it. This is the one
              disclaimer that has to be on every page including the ones with
              no numbers on them, and a sentence sharing a row with "all rights
              reserved" is a sentence nobody reads. */}
          <p className="max-w-[90ch] leading-relaxed">
            {legal.FOOTER}{" "}
            <Link href="/legal/terms" className="underline underline-offset-2 hover:text-fg-muted">
              See our Terms
            </Link>{" "}
            for the complete disclaimers and limitations of liability.
          </p>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p>© {new Date().getFullYear()} StackForge. All rights reserved.</p>
            <p>
              Prices and specifications are carried from vendor documentation and stamped with the
              date they were last verified.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
