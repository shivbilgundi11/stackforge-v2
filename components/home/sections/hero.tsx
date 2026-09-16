"use client";

import Link from "next/link";
import { motion } from "motion/react";

import { useReducedMotion } from "@/components/home/fx/use-client-fact";

import { Counter, MaskLines, Reveal } from "@/components/home/fx/type";
import { Magnetic } from "@/components/home/fx/ui";

/**
 * The hero.
 *
 * ## The shape
 *
 * One screen, three bands: a label row at the top, the headline filling the
 * middle, and a footer row carrying the lede, the figures and the buttons.
 * Nothing is centred and nothing is boxed — the type runs to the page's own
 * margins and the four column rules behind it are the measure everything below
 * is set to, made visible.
 *
 * The headline is set to fill the width at every size, which is why the lines
 * are written out by hand rather than left to wrap. At `clamp(…, 10.5vw, …)`
 * the break points are a design decision: "Plan your AI / stack before / you
 * build it." is three balanced lines, and the same sentence left to the
 * browser is three ragged ones.
 *
 * ## The figures are the social proof
 *
 * There are no logos and no testimonials here, because there are no customers
 * to quote and inventing some is how the previous build of this site ended up
 * claiming fifty thousand users against none. What sits in their place is the
 * catalog: counts read live from the API by the server component above, which
 * a visitor can check against the product in one click. They server-render at
 * their final values and count up only as decoration.
 */

export function Hero({
  models,
  tools,
  gpus,
  pairs,
}: {
  models: number;
  tools: number;
  gpus: number;
  pairs: number;
}) {
  const reduced = useReducedMotion();

  const stats: [string, number][] = [
    ["Models", models],
    ["Tools", tools],
    ["GPUs", gpus],
    ["Verified pairs", pairs],
  ];

  return (
    <section className="grain-layer relative flex min-h-[100svh] flex-col justify-between overflow-hidden pt-28 pb-8 sm:pt-32">
      {/* The grid, made visible. Four columns on the page's own measure. */}
      <div
        aria-hidden
        className="col-rules mx-auto w-full max-w-[110rem] px-5 sm:px-8"
        style={{ ["--cols" as string]: 4 }}
      >
        <span />
        <span />
        <span />
        <span />
      </div>

      {/* ── Label row ────────────────────────────────────────────────────── */}
      <div className="relative mx-auto flex w-full max-w-[110rem] items-start justify-between gap-6 px-5 sm:px-8">
        <Reveal from="none" duration={0.7}>
          <p className="t-mono flex items-center gap-2.5 text-[var(--h-fg-45)]">
            <span className="relative flex size-1.5">
              <span className="absolute inset-0 animate-ping rounded-full bg-[var(--h-acc)]" />
              <span className="relative size-1.5 rounded-full bg-[var(--h-acc)]" />
            </span>
            Catalog live
          </p>
        </Reveal>
        <Reveal from="none" duration={0.7} delay={0.08}>
          <p className="t-mono max-w-[22ch] text-right text-[var(--h-fg-45)] sm:max-w-none">
            An engineering workbench for AI systems
          </p>
        </Reveal>
      </div>

      {/* ── Headline ─────────────────────────────────────────────────────── */}
      <div className="relative mx-auto w-full max-w-[110rem] px-5 py-14 sm:px-8">
        <MaskLines
          as="h1"
          lines={[
            "Plan your AI",
            "stack before",
            <>
              you build it<span className="text-[var(--h-acc)]">.</span>
            </>,
          ]}
          className="t-display text-[clamp(3rem,10.5vw,10rem)]"
          delay={0.15}
          step={0.08}
        />
      </div>

      {/* ── Footer row ───────────────────────────────────────────────────── */}
      <div className="relative mx-auto w-full max-w-[110rem] px-5 sm:px-8">
        <Reveal from="none" delay={0.5}>
          <span className="rule block" />
        </Reveal>

        <div className="grid gap-10 pt-7 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1.2fr)_auto] lg:gap-14">
          <Reveal delay={0.55}>
            <p className="t-body max-w-[46ch]">
              Cost a stack, compare the options with the tradeoffs in front of you, size the
              infrastructure, and leave with the architecture document and the numbers to justify it
              — before writing code.
            </p>
          </Reveal>

          {/* The catalog counts, at the point where a visitor is deciding
              whether the rest of the page is worth reading. */}
          <Reveal delay={0.62}>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-4">
              {stats.map(([label, value]) => (
                <div key={label}>
                  <dd className="t-head text-[clamp(1.6rem,2.6vw,2.4rem)]">
                    <Counter value={value} />
                  </dd>
                  <dt className="t-mono mt-2 text-[9px] text-[var(--h-fg-45)]">{label}</dt>
                </div>
              ))}
            </dl>
          </Reveal>

          <Reveal
            delay={0.68}
            className="flex flex-col items-start gap-3 sm:flex-row lg:items-center"
          >
            <Magnetic strength={14}>
              <Link href="/signup" data-cursor="Start" className="btn btn-acc">
                Get started free
                <Arrow />
              </Link>
            </Magnetic>
            <Magnetic strength={10}>
              <Link href="/features" data-cursor="Watch" className="btn">
                See what it does
              </Link>
            </Magnetic>
          </Reveal>
        </div>

        <div className="mt-8 flex items-center justify-between gap-6">
          <p className="t-mono text-[var(--h-fg-45)]">Free tier · no card · 25 runs a day</p>
          <motion.p
            aria-hidden
            className="t-mono hidden items-center gap-2 text-[var(--h-fg-45)] sm:flex"
            animate={reduced ? undefined : { y: [0, 5, 0] }}
            transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
          >
            Scroll
            <span className="block h-px w-8 bg-current" />
          </motion.p>
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
