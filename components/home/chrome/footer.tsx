"use client";

import * as React from "react";
import Link from "next/link";

import { MaskLines, Reveal } from "@/components/home/fx/type";

/**
 * The footer.
 *
 * Built as the page's last chapter rather than as a utility strip: an ink
 * ground, a wordmark set at the largest size on the page, and the navigation
 * underneath it. The oversized mark is doing a real job — it is the visual
 * full stop that tells a reader the scroll has ended, which a page this long
 * genuinely needs.
 *
 * The clock is the one piece of live content. It is rendered empty on the
 * server and filled after mount, because the server's timezone is not the
 * reader's and rendering a guess would be a hydration mismatch that React
 * would then quietly correct on screen.
 */

const COLUMNS: { title: string; links: { href: string; label: string }[] }[] = [
  {
    title: "Product",
    links: [
      { href: "/features", label: "Features" },
      { href: "/pricing", label: "Pricing" },
      { href: "/features#rag-architecture", label: "RAG Planner" },
      { href: "/features#llm-pricing", label: "Cost Planner" },
      { href: "/features#vram-estimate", label: "Infra Planner" },
    ],
  },
  {
    title: "Company",
    links: [
      { href: "/about", label: "About" },
      { href: "/contact", label: "Contact" },
      { href: "/faq", label: "FAQ" },
    ],
  },
  {
    title: "Legal",
    links: [
      { href: "/legal/privacy", label: "Privacy" },
      { href: "/legal/terms", label: "Terms" },
    ],
  },
];

export function HomeFooter() {
  const [now, setNow] = React.useState<string | null>(null);

  React.useEffect(() => {
    const format = () =>
      new Date().toLocaleTimeString("en-GB", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });

    // The first value comes from a frame callback rather than from the effect
    // body. Setting it synchronously here is the cascading-render pattern
    // `react-hooks/set-state-in-effect` exists to catch, and the frame's delay
    // is invisible on a clock whose next tick is a second away anyway.
    const first = requestAnimationFrame(() => setNow(format()));
    const id = window.setInterval(() => setNow(format()), 1000);

    return () => {
      cancelAnimationFrame(first);
      window.clearInterval(id);
    };
  }, []);

  return (
    <footer data-chapter="ink" className="relative overflow-hidden">
      <div className="mx-auto w-full max-w-[110rem] px-5 pt-24 pb-10 sm:px-8">
        <div className="grid gap-14 lg:grid-cols-[minmax(0,1fr)_auto]">
          <div>
            <p className="t-mono text-[var(--h-fg-45)]">Get in touch</p>
            <MaskLines
              as="p"
              lines={["Plan the stack", "before you build it."]}
              className="t-head mt-6 max-w-[16ch] text-[clamp(2.2rem,5.5vw,4.5rem)]"
            />
            <Reveal delay={0.2} className="mt-9 flex flex-wrap items-center gap-3">
              <Link href="/signup" data-cursor="Start" className="btn btn-acc">
                Get started free
              </Link>
              <Link href="/contact" className="btn">
                Talk to us
              </Link>
            </Reveal>
          </div>

          <nav aria-label="Footer" className="grid grid-cols-2 gap-10 sm:grid-cols-3 lg:gap-16">
            {COLUMNS.map((column) => (
              <div key={column.title}>
                <p className="t-mono text-[var(--h-fg-45)]">{column.title}</p>
                <ul className="mt-5 flex flex-col gap-2.5">
                  {column.links.map((link) => (
                    <li key={link.href + link.label}>
                      <Link href={link.href} className="u-link text-[14px] text-[var(--h-fg-70)]">
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </div>

        {/* The full stop. Decorative — the wordmark is already in the nav and
            in the page title, so announcing it a third time adds nothing. */}
        <div aria-hidden className="mt-20 overflow-hidden">
          <p className="t-display -mb-[0.13em] text-[clamp(4rem,19.5vw,17rem)] whitespace-nowrap text-[var(--h-fg)]">
            AIVeda<span className="text-[var(--h-acc)]">.</span>
          </p>
        </div>

        <div className="mt-8 flex flex-wrap items-center justify-between gap-4 border-t border-[var(--h-line)] pt-6">
          <p className="t-mono text-[var(--h-fg-45)]">
            © {new Date().getFullYear()} AIVeda — plan before you build
          </p>
          <p className="t-mono text-[var(--h-fg-45)]">
            <span className="tabular-nums">{now ?? "--:--:--"}</span> local
          </p>
        </div>
      </div>
    </footer>
  );
}
