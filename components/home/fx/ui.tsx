"use client";

import * as React from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { AnimatePresence, motion, useMotionValue, useSpring } from "motion/react";

import { cn } from "@/lib/utils";

import { EASE, STILL } from "./type";
import { motionQuery, useMediaQuery, useReducedMotion } from "./use-client-fact";

/**
 * Pointer-driven interaction.
 *
 * Everything in this file is a hover affordance, which means everything in it
 * is optional by definition: a touch device has no hover state and a keyboard
 * user never produces one. So each component is built so that the thing it
 * decorates is complete without it — the cursor is an overlay over ordinary
 * links, the magnet wraps a real button, the preview panel shows an image the
 * list already names in text.
 */

let registered = false;

function ensurePlugin() {
  if (typeof window !== "undefined" && !registered) {
    gsap.registerPlugin(ScrollTrigger);
    registered = true;
  }
}

/* ────────────────────────────────────────────────────────────────────────── */

/**
 * The cursor.
 *
 * A dot that tracks the pointer exactly and a ring that lags behind it on a
 * spring. Any element carrying `data-cursor` swells the ring and puts its
 * value inside as a label, so a card can say "OPEN" and a draggable row can
 * say "DRAG" without either of them knowing this component exists.
 *
 * ## What it does not do
 *
 * It does not hide the real cursor. Replacing the system cursor entirely is
 * the usual version of this effect and it is a genuine usability loss — the
 * native cursor is what tells you a text field is a text field and where
 * exactly a click will land. This one is drawn *around* the real pointer,
 * which keeps every affordance the browser already provides.
 *
 * It also never mounts on a coarse pointer or under reduced motion, and it is
 * `pointer-events: none` throughout, so it cannot intercept a click.
 */
export function Cursor() {
  const reduced = useReducedMotion();
  // A store read rather than `setEnabled` in an effect: it resolves during the
  // hydration render, and it keeps tracking if the pointer type changes —
  // plugging a mouse into a tablet should turn this on.
  const finePointer = useMediaQuery("(hover: hover) and (pointer: fine)");
  const enabled = finePointer && !reduced;

  const [label, setLabel] = React.useState<string | null>(null);
  const [active, setActive] = React.useState(false);

  const x = useMotionValue(-100);
  const y = useMotionValue(-100);
  const ringX = useSpring(x, { stiffness: 380, damping: 34, mass: 0.5 });
  const ringY = useSpring(y, { stiffness: 380, damping: 34, mass: 0.5 });

  React.useEffect(() => {
    if (!enabled) return;

    const onMove = (event: PointerEvent) => {
      x.set(event.clientX);
      y.set(event.clientY);
    };

    // Delegated rather than per-element listeners: the page has well over a
    // hundred interactive nodes and this is two listeners for all of them.
    const onOver = (event: PointerEvent) => {
      const target = (event.target as HTMLElement | null)?.closest<HTMLElement>(
        "[data-cursor], a, button",
      );
      if (!target) {
        setLabel(null);
        setActive(false);
        return;
      }
      setLabel(target.dataset["cursor"] ?? null);
      setActive(true);
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerover", onOver, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerover", onOver);
    };
  }, [enabled, x, y]);

  if (!enabled) return null;

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-70">
      {/* The dot keeps the accent: signal orange reads on bone and on ink
          alike, so it needs no help. */}
      <motion.span
        style={{ x, y }}
        className="absolute -mt-0.75 -ml-0.75 size-1.5 rounded-full bg-(--h-acc)"
      />

      {/* The ring does not — a hairline is thin enough that one colour is
          invisible over half this page. It is blended instead, for the same
          reason as `ProgressRail`: it is fixed, it crosses bone and ink
          chapters and screenshots, and difference blending derives its own
          contrast from whatever it happens to be over. */}
      <motion.span
        style={{ x: ringX, y: ringY }}
        className="absolute flex items-center justify-center mix-blend-difference"
      >
        <motion.span
          animate={{
            width: label ? 76 : active ? 44 : 30,
            height: label ? 76 : active ? 44 : 30,
            opacity: active ? 1 : 0.5,
          }}
          transition={{ duration: 0.4, ease: EASE }}
          className="flex items-center justify-center rounded-full border border-white/70"
          style={{ marginLeft: "-50%", marginTop: "-50%" }}
        >
          <AnimatePresence>
            {label ? (
              <motion.span
                initial={{ opacity: 0, scale: 0.7 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.7 }}
                transition={{ duration: 0.25, ease: EASE }}
                className="t-mono text-[8px] whitespace-nowrap text-white"
              >
                {label}
              </motion.span>
            ) : null}
          </AnimatePresence>
        </motion.span>
      </motion.span>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */

/**
 * A control that leans toward the pointer.
 *
 * Clamped hard at `strength` pixels and released on leave, because the failure
 * mode of a magnetic button is that it slides out from under the click. Mouse
 * only: on touch there is no hover to lean into and the transform would fire
 * on the tap itself.
 */
export function Magnetic({
  children,
  strength = 16,
  className,
}: {
  children: React.ReactNode;
  strength?: number;
  className?: string;
}) {
  const reduced = useReducedMotion();
  const ref = React.useRef<HTMLDivElement>(null);
  const spring = { stiffness: 260, damping: 26, mass: 0.6 } as const;
  const x = useSpring(useMotionValue(0), spring);
  const y = useSpring(useMotionValue(0), spring);

  const onMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (reduced || event.pointerType !== "mouse") return;
    const node = ref.current;
    if (!node) return;
    const box = node.getBoundingClientRect();
    const clamp = (n: number) => Math.max(-strength, Math.min(strength, n));
    x.set(clamp(((event.clientX - (box.left + box.width / 2)) / box.width) * strength * 2));
    y.set(clamp(((event.clientY - (box.top + box.height / 2)) / box.height) * strength * 2));
  };

  const release = () => {
    x.set(0);
    y.set(0);
  };

  return (
    <motion.div
      ref={ref}
      style={reduced ? undefined : { x, y }}
      onPointerMove={onMove}
      onPointerLeave={release}
      onPointerCancel={release}
      className={cn("inline-block", className)}
    >
      {children}
    </motion.div>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */

/**
 * A seamless loop that reacts to the scroll.
 *
 * The children are rendered twice and the track travels exactly -50%, which is
 * what makes the seam invisible: when the tween repeats, copy two is sitting
 * precisely where copy one started. The duplicate is `aria-hidden`, so the row
 * is announced once.
 *
 * Scroll velocity feeds the tween's `timeScale`, so the row surges when the
 * reader scrolls fast and settles back when they stop, and scrolling *up*
 * reverses it. That coupling is the whole point — an un-reactive marquee is a
 * GIF, and a reader learns nothing from it about where they are on the page.
 */
export function Marquee({
  children,
  speed = 40,
  reverse = false,
  className,
}: {
  children: React.ReactNode;
  /** Seconds for one full pass. Content-sized rows need a time, not a rate. */
  speed?: number;
  reverse?: boolean;
  className?: string;
}) {
  ensurePlugin();
  const track = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const node = track.current;
    if (!node) return;

    const media = gsap.matchMedia();
    media.add(motionQuery(), () => {
      const direction = reverse ? 1 : -1;
      const tween = gsap.fromTo(
        node,
        { xPercent: reverse ? -50 : 0 },
        { xPercent: reverse ? 0 : -50, duration: speed, ease: "none", repeat: -1 },
      );

      const trigger = ScrollTrigger.create({
        trigger: node,
        start: "top bottom",
        end: "bottom top",
        onUpdate: (self) => {
          const boost = 1 + Math.min(6, Math.abs(self.getVelocity()) / 260);
          tween.timeScale(self.getVelocity() * direction < 0 ? -boost : boost);
        },
      });

      // Without this the row keeps whatever velocity the last scroll left it
      // at, which reads as a glitch once the page is still. Eased back rather
      // than snapped, so the surge decays instead of stopping dead.
      const idle = window.setInterval(() => {
        const current = tween.timeScale();
        if (Math.abs(current - 1) > 0.02) {
          tween.timeScale(gsap.utils.interpolate(current, 1, 0.22));
        }
      }, 90);

      return () => {
        window.clearInterval(idle);
        trigger.kill();
        tween.kill();
      };
    });

    return () => media.revert();
  }, [speed, reverse]);

  return (
    <div className={cn("overflow-hidden", className)}>
      <div ref={track} className="flex w-max items-center">
        {children}
        <span aria-hidden className="contents">
          {children}
        </span>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */

export type PreviewRow = {
  id: string;
  /** Rendered into the floating panel when this row is hovered. */
  preview: React.ReactNode;
};

/**
 * A list where hovering a row floats its figure alongside the pointer.
 *
 * ## Why the panel is one element and not one per row
 *
 * A panel per row means N absolutely-positioned nodes, N transitions running
 * on top of each other when the pointer crosses rows quickly, and N copies of
 * the same shadow to paint. Here there is a single panel that follows the
 * pointer and swaps its contents, so crossing eight rows costs eight content
 * swaps and no layout at all.
 *
 * The rows themselves carry their meaning in text. This is decoration over a
 * list that already works — it never mounts without a fine pointer, and the
 * panel is `aria-hidden` because everything in it restates the row it belongs
 * to.
 */
export function HoverPreview({
  rows,
  children,
  className,
}: {
  rows: PreviewRow[];
  children: React.ReactNode;
  className?: string;
}) {
  const reduced = useReducedMotion();
  const scope = React.useRef<HTMLDivElement>(null);
  const [activeId, setActiveId] = React.useState<string | null>(null);

  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const px = useSpring(x, { stiffness: 220, damping: 28, mass: 0.6 });
  const py = useSpring(y, { stiffness: 220, damping: 28, mass: 0.6 });

  const onMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (reduced || event.pointerType !== "mouse") return;
    const node = scope.current;
    if (!node) return;
    const box = node.getBoundingClientRect();
    x.set(event.clientX - box.left);
    y.set(event.clientY - box.top);

    const row = (event.target as HTMLElement | null)?.closest<HTMLElement>("[data-row]");
    setActiveId(row?.dataset["row"] ?? null);
  };

  const active = rows.find((row) => row.id === activeId);

  return (
    <div
      ref={scope}
      onPointerMove={onMove}
      onPointerLeave={() => setActiveId(null)}
      className={cn("relative", className)}
    >
      {children}

      {/* Always mounted, empty until a row is hovered. Returning `null` under
          reduced motion instead would change the tree between the server
          render and the client one, which is a hydration mismatch — and there
          is nothing to gain from it, because `onMove` already refuses to set
          an active row when the preference is set, so this stays empty. */}
      <motion.div
        aria-hidden
        style={reduced ? undefined : { x: px, y: py }}
        className="pointer-events-none absolute top-0 left-0 z-20 hidden lg:block"
      >
        <AnimatePresence>
          {active ? (
            <motion.div
              key={active.id}
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.94 }}
              transition={reduced ? STILL : { duration: 0.32, ease: EASE }}
              className="-translate-x-1/2 -translate-y-1/2"
            >
              {active.preview}
            </motion.div>
          ) : null}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
