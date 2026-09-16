"use client";

import Link from "next/link";

import { MaskLines, Reveal } from "@/components/home/fx/type";
import { Magnetic } from "@/components/home/fx/ui";

/**
 * The last thing on an interior page.
 *
 * Set on ink, which is doing a job rather than decorating: it is the only
 * full-ground colour change at the end of these pages, so the reader knows the
 * argument has finished and this is the ask. `data-chapter="ink"` flips the
 * whole token set for the section — see `home.css` — so the type, the rules
 * and the buttons inside it invert without any of them knowing about it.
 *
 * Both links are real destinations rather than a single button and a
 * decorative second one. Someone who has read to the bottom of `/features` is
 * either ready to try it or has a question, and sending the second group to a
 * page that repeats the first CTA wastes the one click they were willing to
 * spend.
 */

export function CtaBand({
  title,
  lede,
  primary = { href: "/signup", label: "Get started free" },
  secondary = { href: "/contact", label: "Get in touch" },
}: {
  /** Display lines, broken by hand. */
  title: React.ReactNode[];
  lede: string;
  primary?: { href: string; label: string };
  secondary?: { href: string; label: string };
}) {
  return (
    <section data-chapter="ink" className="relative">
      <div className="mx-auto w-full max-w-[110rem] px-5 py-24 sm:px-8 sm:py-32">
        <div className="grid gap-12 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] lg:items-end lg:gap-16">
          <MaskLines
            as="h2"
            lines={title}
            className="t-head max-w-[16ch] text-[clamp(2rem,5.6vw,4.4rem)]"
          />

          <div>
            <Reveal delay={0.18}>
              <p className="t-body max-w-[46ch]">{lede}</p>
            </Reveal>

            <Reveal delay={0.26} className="mt-9 flex flex-col items-start gap-3 sm:flex-row">
              <Magnetic strength={14}>
                <Link href={primary.href} data-cursor="Start" className="btn btn-acc">
                  {primary.label}
                  <Arrow />
                </Link>
              </Magnetic>
              <Magnetic strength={10}>
                <Link href={secondary.href} data-cursor="Ask" className="btn">
                  {secondary.label}
                </Link>
              </Magnetic>
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  );
}

function Arrow() {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden className="size-3.5">
      <path
        d="M3 13L13 3M13 3H5.5M13 3v7.5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
