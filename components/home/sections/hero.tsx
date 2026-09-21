"use client";

import Link from "next/link";
import { motion } from "motion/react";

import { useReducedMotion } from "@/components/home/fx/use-client-fact";

import { Orbit, type OrbitItem } from "@/components/home/fx/orbit";
import { EASE, MaskLines, Reveal } from "@/components/home/fx/type";
import { Magnetic } from "@/components/home/fx/ui";

/**
 * The hero.
 *
 * ## The shape
 *
 * One screen, centred: a ring of product stills revolving around a headline, a
 * lede, and two buttons. The ring is decorative and says one thing before a
 * word is read — that there is a lot in here — while the stills themselves
 * carry the specifics for anyone who looks. See `fx/orbit.tsx` for how the
 * revolution works; every item is one angle and five functions of it.
 *
 * The headline lines are written out by hand rather than left to wrap, for the
 * same reason they always were: where a two-line headline breaks is a design
 * decision, and the browser does not know the copy.
 *
 * ## The ring is `aria-hidden`, and the geometry keeps it out of the way
 *
 * The images are ornament. Every feature in the ring is named and linked in
 * `Workflows` further down, so announcing seven unlabelled stills here would
 * add noise and no information — the ring is hidden from assistive technology
 * and the section reads as heading, lede, two links.
 *
 * Visually the text never fights the images either, and not by luck: the
 * ellipse is 80% of the viewport wide against a `max-w-3xl` column, so the
 * ring passes to the left and right of the copy rather than across it. The
 * content still sits in its own stacking context above the ring, because the
 * near items legitimately paint at `z-index: 973` and would otherwise cross in
 * front of the buttons at the bottom of their arc.
 *
 * ## The figures moved out
 *
 * The catalog counts used to sit in this section. They are now the band
 * immediately below it — see `sections/metrics.tsx` — because this layout is
 * centred on one claim and four figures alongside it made two focal points out
 * of a screen that should have one. They are still the first thing under the
 * fold, which is where they were doing their work.
 */

/**
 * What revolves.
 *
 * Seven composed stills, each one a circle already rendered onto a square
 * white field — which is why the ring wants no frame of its own and why
 * `Orbit` overscans them slightly. They replace the product screenshots that
 * were here first: a 16:10 dashboard cropped to a 90px circle is a texture,
 * not a picture of anything, and these were made for the shape.
 *
 * They are ordered so that the two pairs which share a subject — cost
 * (`feature1`, `feature6`) and choice (`feature2`, `feature4`) — sit opposite
 * each other rather than adjacent. Items three apart in this list are roughly
 * across the ellipse from one another, so the near arc never shows the same
 * idea twice.
 */
const FEATURES: OrbitItem[] = [
  { src: "/home/feature1.jpeg", label: "Unclear costs and budgeting" },
  { src: "/home/feature2.jpeg", label: "Overwhelming technology choices" },
  { src: "/home/feature3.jpeg", label: "Time-consuming evaluation and setup" },
  { src: "/home/feature6.jpeg", label: "Uncertain costs and ROI" },
  { src: "/home/feature4.jpeg", label: "Confusing technology choices" },
  { src: "/home/feature5.jpeg", label: "Too much manual planning" },
  { src: "/home/feature7.jpeg", label: "Data security and compliance concerns" },
];

export function Hero() {
  const reduced = useReducedMotion();

  return (
    // The vertical padding is symmetric on purpose. `pt-28 pb-10` would clear
    // the fixed nav but also push the centred column 36px below the section's
    // true middle, and the ring is centred on that middle — which put the
    // bottom of the copy straight through the front of the ellipse.
    // `isolate` on the section is what keeps the numbers below from being the
    // page's business. Everything in here sorts against the ring, whose items
    // carry a z-index of 0–1000 read off their position around the ellipse, so
    // the copy and the footer rail answer with 1000 of their own. `relative`
    // alone opens no stacking context, so those 1000s were competing with the
    // whole document — and beating the fixed header at 60 and the mobile menu
    // at 55. The menu's background was opaque the entire time; the hero was
    // simply painting on top of it, which reads as a transparent overlay.
    <section className="grain-layer relative isolate flex min-h-svh flex-col items-center justify-center overflow-hidden px-5 py-28 sm:px-8 sm:py-32">
      <Orbit items={FEATURES} />

      {/* `isolate` gives the copy its own stacking context, so it clears the
          ring whatever z-index the near items are carrying this frame. */}
      <div className="relative isolate z-1000 flex w-full max-w-3xl flex-col items-center text-center">
        <Reveal from="none" duration={0.7}>
          <p className="t-mono flex items-center gap-2.5 text-(--h-fg-45)">
            <span className="relative flex size-1.5">
              <span className="absolute inset-0 animate-ping rounded-full bg-(--h-acc)" />
              <span className="relative size-1.5 rounded-full bg-(--h-acc)" />
            </span>
            Catalog live
          </p>
        </Reveal>

        <MaskLines
          as="h1"
          lines={[
            "Plan your AI stack",
            <>
              before you build it<span className="text-(--h-acc)">.</span>
            </>,
          ]}
          className="t-display mt-7 text-[clamp(2.25rem,6.4vw,5rem)]"
          delay={0.15}
          step={0.08}
        />

        <Reveal delay={0.5}>
          <p className="t-body mt-6 max-w-[68ch]">
            Cost a stack, compare the options with the tradeoffs in front of you, size the
            infrastructure, and leave with the architecture document and the numbers to justify it,
            before writing code.
          </p>
        </Reveal>

        <Reveal delay={0.58} className="mt-8 flex flex-col items-center gap-3 sm:flex-row">
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

      {/* Both sit in the bottom margin rather than at the end of the centred
          column. Anything added below the buttons grows the column downwards
          into the front of the ring, and this line is the one piece of copy
          here that does not need to be read in sequence with the rest. */}
      <div className="absolute inset-x-0 bottom-8 z-1000 flex items-end justify-between gap-6 px-5 sm:px-8">
        {/* Deliberately not a `Reveal`. Reveal fires on `whileInView` with a
            -10% viewport margin, and this line sits inside that excluded band
            at the very bottom of the screen — it would never enter view, and
            so would never animate out of `opacity: 0`. Anything anchored to
            the bottom margin of a full-height section has to animate on mount
            rather than on intersection. */}
        <motion.p
          className="t-mono text-(--h-fg-45)"
          initial={reduced ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={reduced ? { duration: 0 } : { duration: 0.9, delay: 0.66, ease: EASE }}
        >
          Free tier · no card · 25 runs a day
        </motion.p>

        <motion.p
          aria-hidden
          className="t-mono hidden items-center gap-2 text-(--h-fg-45) sm:flex"
          animate={reduced ? undefined : { y: [0, 5, 0] }}
          transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
        >
          Scroll
          <span className="block h-px w-8 bg-current" />
        </motion.p>
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
