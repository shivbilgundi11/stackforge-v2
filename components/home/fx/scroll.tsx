"use client";

import * as React from "react";
import Lenis from "lenis";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

import { cn } from "@/lib/utils";

import { RESPECT_REDUCED_MOTION, motionQuery } from "./use-client-fact";

/**
 * The scroll engine.
 *
 * ## One clock, not three
 *
 * Smooth scrolling, scroll-linked animation and the browser's own scroll
 * position are three things that must agree to within a frame, or the page
 * tears: pinned sections drift off their triggers, parallax lags behind the
 * thing it is parallaxing against, and the progress rail arrives at 100% while
 * there is still page left. The fix is that nothing here runs its own loop.
 * Lenis is driven by GSAP's ticker, and `ScrollTrigger.update` is driven by
 * Lenis, so there is exactly one clock and everything downstream of it is in
 * phase by construction.
 *
 * ## Smooth scroll is a real accessibility decision
 *
 * Hijacking the wheel is the single most common way an award-winning page
 * becomes unusable, so the interpolation here is deliberately light (`lerp`
 * 0.09, roughly two frames of catch-up rather than the half-second glide that
 * makes a page feel underwater), it never touches keyboard scrolling, and it
 * is switched off entirely — not merely shortened — under
 * `prefers-reduced-motion`. With it off the page is an ordinary document that
 * scrolls at the system speed, and every scroll-linked effect still works
 * because they all read `ScrollTrigger`, which reads the real scroll position.
 */

let registered = false;

function ensurePlugin() {
  if (typeof window !== "undefined" && !registered) {
    gsap.registerPlugin(ScrollTrigger);
    registered = true;
  }
}

/** Mounted once, in the home layout, above everything that scrolls. */
export function SmoothScroll({ children }: { children: React.ReactNode }) {
  ensurePlugin();

  React.useEffect(() => {
    if (RESPECT_REDUCED_MOTION && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }

    const lenis = new Lenis({ lerp: 0.09, wheelMultiplier: 1, touchMultiplier: 1.6 });

    lenis.on("scroll", ScrollTrigger.update);
    const tick = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(tick);
    // GSAP's lag smoothing skips ticks after a long frame, which is right for
    // a standalone tween and wrong here: a skipped tick is a frame where Lenis
    // does not advance and the page visibly stalls.
    gsap.ticker.lagSmoothing(0);

    // Fonts and images change the document height after first paint, and a
    // stale height is what makes a pinned section end early.
    const refresh = () => ScrollTrigger.refresh();
    document.fonts?.ready.then(refresh);
    window.addEventListener("load", refresh);

    return () => {
      gsap.ticker.remove(tick);
      window.removeEventListener("load", refresh);
      lenis.destroy();
    };
  }, []);

  return <>{children}</>;
}

/* ────────────────────────────────────────────────────────────────────────── */

/**
 * The reading-progress rail down the left edge.
 *
 * A vertical hairline rather than the usual bar across the top, because the
 * top of this page is a full-bleed hero with type running into the corners and
 * a horizontal bar would cut it. It also doubles as a chapter counter.
 *
 * ## Why it is `mix-blend-difference` and not a colour
 *
 * It is `fixed`, so it sits outside every `[data-chapter]` and cannot inherit
 * the ground it happens to be over — and this page alternates bone and ink, so
 * any single colour is invisible for half the scroll. Difference blending
 * makes it derive its own contrast: white over bone renders near-black, white
 * over ink renders white, and it is correct over the figures and screenshots
 * in between without anyone maintaining a list of which section is which.
 */
export function ProgressRail({ chapters }: { chapters: string[] }) {
  ensurePlugin();
  const fill = React.useRef<HTMLSpanElement>(null);
  const [active, setActive] = React.useState(0);

  React.useEffect(() => {
    const node = fill.current;
    if (!node) return;

    const trigger = ScrollTrigger.create({
      trigger: document.documentElement,
      start: "top top",
      end: "bottom bottom",
      onUpdate: (self) => {
        node.style.transform = `scaleY(${self.progress})`;
        const next = Math.min(chapters.length - 1, Math.floor(self.progress * chapters.length));
        setActive((prev) => (prev === next ? prev : next));
      },
    });

    return () => trigger.kill();
  }, [chapters.length]);

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed top-1/2 left-6 z-40 hidden -translate-y-1/2 items-center gap-3.5 mix-blend-difference xl:flex"
    >
      {/* Vertical writing rather than a rotation, so the text's own box is
          vertical too and nothing has to be nudged back into place after the
          transform. `rotate-180` sets it reading bottom-to-top. */}
      <p
        className="t-mono rotate-180 text-[9px] whitespace-nowrap text-white/60"
        style={{ writingMode: "vertical-rl" }}
      >
        {chapters[active]}
      </p>

      <div className="relative h-40 w-px bg-white/25">
        <span
          ref={fill}
          className="absolute inset-0 origin-top bg-white"
          style={{ transform: "scaleY(0)" }}
        />
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */

/**
 * A paragraph whose words light up as the reader scrolls through it.
 *
 * This is the page's one piece of pure spectacle and it earns its place by
 * doing something useful: it sets the reading pace of the manifesto, so a
 * three-sentence claim is read as three sentences rather than skimmed as a
 * block. The scrub is tied to scroll position, not to time, so the reader
 * controls it completely — including backwards.
 *
 * Split by word, not by character. Per-character is the more impressive
 * inspector screenshot and it wrecks the thing: it puts one node per glyph
 * into the accessibility tree, shatters text selection, and at this size reads
 * as static rather than as reading. The full string is rendered once as
 * `sr-only` so assistive technology gets one continuous sentence regardless.
 */
export function ScrubText({
  text,
  className,
  as: Tag = "p",
}: {
  text: string;
  className?: string;
  as?: React.ElementType;
}) {
  ensurePlugin();
  const scope = React.useRef<HTMLDivElement>(null);
  const words = React.useMemo(() => text.split(" ").filter(Boolean), [text]);

  React.useEffect(() => {
    const node = scope.current;
    if (!node) return;

    const media = gsap.matchMedia();
    media.add(motionQuery(), () => {
      const context = gsap.context(() => {
        gsap.fromTo(
          "[data-word]",
          { opacity: 0.16 },
          {
            opacity: 1,
            ease: "none",
            stagger: 0.35,
            scrollTrigger: {
              trigger: node,
              start: "top 78%",
              end: "bottom 58%",
              scrub: 0.4,
            },
          },
        );
      }, node);
      return () => context.revert();
    });

    return () => media.revert();
  }, [words.length]);

  return (
    <div ref={scope}>
      <span className="sr-only">{text}</span>
      <Tag aria-hidden className={className}>
        {words.map((word, i) => (
          <span key={`${word}-${i}`} data-word className="inline-block">
            {word}
            {i < words.length - 1 ? " " : null}
          </span>
        ))}
      </Tag>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */

/**
 * Moves its children against the scroll.
 *
 * `distance` is total travel in pixels across the element's whole pass through
 * the viewport, so the number at the call site is the number of pixels of
 * parallax rather than a multiplier whose effect depends on the element's
 * height.
 */
export function Parallax({
  children,
  className,
  distance = 90,
}: {
  children: React.ReactNode;
  className?: string;
  distance?: number;
}) {
  ensurePlugin();
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const media = gsap.matchMedia();
    media.add(motionQuery(), () => {
      const tween = gsap.fromTo(
        node,
        { y: distance / 2 },
        {
          y: -distance / 2,
          ease: "none",
          scrollTrigger: {
            trigger: node,
            start: "top bottom",
            end: "bottom top",
            scrub: 0.5,
            invalidateOnRefresh: true,
          },
        },
      );
      return () => {
        tween.scrollTrigger?.kill();
        tween.kill();
      };
    });

    return () => media.revert();
  }, [distance]);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */

/**
 * A genuinely pinned horizontal run.
 *
 * The section holds still while its track slides sideways, then releases. This
 * is the one place on the page where `ScrollTrigger.pin` is the right tool
 * rather than `position: sticky` — sticky can hold an element in place but it
 * cannot convert vertical scroll distance into horizontal travel, which is the
 * entire effect.
 *
 * Two things keep it from being the bad version of itself. The scroll distance
 * is computed from the track's real overflow (`invalidateOnRefresh` recomputes
 * it on resize), so the section is never longer than the content needs and the
 * reader is never held on a screen that has stopped moving. And below `lg`, or
 * under reduced motion, the pin does not exist at all: the track becomes an
 * ordinary horizontally-scrollable row that the reader swipes at their own
 * pace, which is what a touch device wants anyway.
 */
export function PinnedTrack({
  children,
  className,
  trackClassName,
}: {
  children: React.ReactNode;
  className?: string;
  trackClassName?: string;
}) {
  ensurePlugin();
  const scope = React.useRef<HTMLDivElement>(null);
  const track = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const node = scope.current;
    const inner = track.current;
    if (!node || !inner) return;

    const media = gsap.matchMedia();
    media.add(motionQuery("(min-width: 1024px)"), () => {
      const overflow = () => Math.max(0, inner.scrollWidth - window.innerWidth);

      const tween = gsap.to(inner, {
        x: () => -overflow(),
        ease: "none",
        scrollTrigger: {
          trigger: node,
          start: "top top",
          end: () => `+=${overflow()}`,
          pin: true,
          scrub: 0.5,
          anticipatePin: 1,
          invalidateOnRefresh: true,
        },
      });

      return () => {
        tween.scrollTrigger?.kill();
        tween.kill();
      };
    });

    return () => media.revert();
  }, []);

  return (
    <div ref={scope} className={cn("lg:overflow-hidden", className)}>
      <div
        ref={track}
        className={cn(
          "flex snap-x snap-mandatory gap-4 overflow-x-auto pb-4 lg:snap-none lg:overflow-visible lg:pb-0",
          trackClassName,
        )}
      >
        {children}
      </div>
    </div>
  );
}
