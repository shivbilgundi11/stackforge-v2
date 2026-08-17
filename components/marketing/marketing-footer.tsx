import Link from "next/link";

import { BrandLockup } from "@/components/shell/brand";

/**
 * The marketing footer.
 *
 * Same rule as the header: nothing here points at a page that does not exist.
 * Docs, blog, and the comparison pages join these columns when they ship, not
 * when they are planned (M22).
 */

const COLUMNS: { heading: string; links: { href: string; label: string }[] }[] = [
  {
    heading: "Product",
    links: [
      { href: "/features", label: "Features" },
      { href: "/pricing", label: "Pricing" },
      { href: "/stack-architect/new", label: "Stack Architect" },
      { href: "/compare", label: "Compare Center" },
    ],
  },
  {
    heading: "Workflows",
    links: [
      { href: "/cost", label: "Cost Planner" },
      { href: "/rag", label: "RAG Planner" },
      { href: "/agents", label: "Agent & MCP Builder" },
      { href: "/infra", label: "Infra Planner" },
      { href: "/roi", label: "ROI Calculator" },
    ],
  },
  {
    heading: "Resources",
    links: [
      { href: "/resources/templates", label: "Templates" },
      { href: "/stack-architect/graveyard", label: "Tool graveyard" },
      { href: "/faq", label: "FAQ" },
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
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-5">
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

        <div className="mt-12 flex flex-col gap-2 border-t border-line pt-6 text-[12px] text-fg-subtle sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} StackForge. All rights reserved.</p>
          <p>
            Prices and specifications are carried from vendor documentation and stamped with the
            date they were last verified.
          </p>
        </div>
      </div>
    </footer>
  );
}
