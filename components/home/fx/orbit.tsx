"use client";

import * as React from "react";
import Image from "next/image";

import { cn } from "@/lib/utils";

import { RESPECT_REDUCED_MOTION } from "./use-client-fact";

/**
 * A ring of images revolving around the middle of its container.
 *
 * ## One parameter drives everything
 *
 * Each item sits at its own angle `t` on a shared ellipse, and `t` advances at
 * a constant rate, so the whole figure is a single number per item. Position,
 * size, opacity, blur and paint order are then all read off that one angle —
 * specifically off `sin t`, which is the depth axis:
 *
 * ```
 *   x        Rx · cos t                     the long axis, across the page
 *   y        Ry · sin t                     the short axis, ~0.39 · Rx
 *   size     base · (1 + 0.36 · sin t)      near is larger
 *   opacity  0.68 + 0.32 · sin t            near is more opaque
 *   blur     1.23px · (1 − sin t)           far is softer
 *   z-index  (sin t + 1) · 500              near paints over far
 * ```
 *
 * Because `sin t` is at its maximum exactly when the item is lowest on screen,
 * the bottom of the ring reads as the front and the top as the back. That is
 * the whole illusion: there is no 3D transform, no perspective and no camera
 * anywhere in this component, just five cheap functions of one angle. It costs
 * a few multiplications per item per frame and it composites on the GPU,
 * which a real `preserve-3d` scene with per-item `filter` would not.
 *
 * ## Why the frame loop writes to the DOM directly
 *
 * Driving this through React state would mean reconciling every item on every
 * frame — sixty renders a second for values that never touch the component
 * tree. The loop below holds refs and assigns to `style` instead, so React
 * renders the ring exactly once and then never again. This is the case the
 * escape hatch exists for: continuous animation of properties that no other
 * component reads.
 *
 * ## The server render is already in position
 *
 * The browser paints server HTML before React hydrates, so an unpositioned
 * first paint would stack every image on top of the heading and then scatter
 * them a moment later. The markup therefore ships with each item's opening
 * angle baked in as viewport units — `vw` for the long axis, `svh` for the
 * short one, which is what the measured axes are proportional to anyway. The
 * loop overwrites those with measured pixels on its first frame, and the
 * handover is invisible because it is computing the same ellipse.
 */

/** Seconds for one full revolution. The single knob for how fast this feels. */
const PERIOD_SECONDS = 42;

/** Ellipse axes and item size, as fractions of the container. Measured from
 *  the reference this was matched to: 763/1910, 300/855, 133/1910. */
const RX_RATIO = 0.4;
const RY_RATIO = 0.35;
const SIZE_RATIO = 0.07;
const SIZE_MIN = 64;
const SIZE_MAX = 150;

/** Radians per second a release may throw, and how fast that decays. At 2.6 a
 *  flung ring coasts for a bit over a second before the constant rate takes
 *  back over, which is long enough to feel physical and short enough that the
 *  page is never waiting on it. */
const MAX_SPIN = 7;
const SPIN_DAMPING = 2.6;

/** How far size, opacity and blur swing between the back and the front. */
const SIZE_SWING = 0.36;
const OPACITY_MID = 0.68;
const OPACITY_SWING = 0.32;
const BLUR_MAX = 1.23;

export type OrbitItem = {
  src: string;
  /** Names the feature this still is of. Only ever used as a debugging aid and
   *  as `alt` if the ring is made non-decorative; the ring is `aria-hidden`. */
  label: string;
};

export function Orbit({
  items,
  shape = "circle",
  className,
}: {
  items: OrbitItem[];
  /** `circle` matches the reference exactly. `card` keeps the same motion but
   *  gives each item the 16:10 of the screenshots inside it, which is the only
   *  way a dashboard still is legible at this size. */
  shape?: "circle" | "card";
  className?: string;
}) {
  const host = React.useRef<HTMLDivElement>(null);
  const nodes = React.useRef<(HTMLDivElement | null)[]>([]);

  const count = items.length;
  const aspect = shape === "card" ? 1.6 : 1;

  React.useEffect(() => {
    const root = host.current;
    if (!root) return;

    const still =
      RESPECT_REDUCED_MOTION && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let width = 0;
    let height = 0;
    const measure = () => {
      const box = root.getBoundingClientRect();
      width = box.width;
      height = box.height;
    };
    measure();

    const observer = new ResizeObserver(measure);
    observer.observe(root);

    const step = (Math.PI * 2) / count;
    let angle = 0;
    let last = performance.now();
    let frame = 0;

    // Drag state. `spin` is the extra angular velocity thrown by a release; it
    // decays back to nothing, at which point the ring is left turning at its
    // own constant rate again.
    let dragging = false;
    let pointer = -1;
    let lastX = 0;
    let lastAt = 0;
    let spin = 0;

    const paint = () => {
      const rx = width * RX_RATIO;
      const ry = height * RY_RATIO;
      const base = Math.min(Math.max(width * SIZE_RATIO, SIZE_MIN), SIZE_MAX);

      for (let i = 0; i < count; i++) {
        const node = nodes.current[i];
        if (!node) continue;

        const t = angle + i * step;
        const sin = Math.sin(t);
        const size = base * (1 + SIZE_SWING * sin);

        node.style.width = `${(size * aspect).toFixed(2)}px`;
        node.style.height = `${size.toFixed(2)}px`;
        node.style.transform = `translate(-50%, -50%) translate(${(rx * Math.cos(t)).toFixed(2)}px, ${(ry * sin).toFixed(2)}px)`;
        node.style.opacity = (OPACITY_MID + OPACITY_SWING * sin).toFixed(3);
        node.style.filter = `blur(${Math.max(0, BLUR_MAX * (1 - sin)).toFixed(2)}px)`;
        node.style.zIndex = String(Math.round((sin + 1) * 500));
      }
    };

    if (still) {
      paint();
      return () => observer.disconnect();
    }

    const rate = (Math.PI * 2) / PERIOD_SECONDS;

    /* ── Drag ───────────────────────────────────────────────────────────── */

    /**
     * Horizontal travel is what turns the ring, and it is scaled by `rx` so the
     * gesture is roughly 1:1 with the item the pointer is actually over: drag a
     * full semi-axis and the ring turns a radian, which is what makes it feel
     * like the ring is being pushed rather than driven through a control.
     *
     * The sign is negative because `x = rx · cos t`, whose derivative at the
     * front of the ring (`sin t = 1`) is `−rx`. Without the flip the near items
     * would run away from the pointer, which reads as broken even to someone
     * who could not say why.
     */
    const angleFor = (dx: number) => -dx / Math.max(width * RX_RATIO, 1);

    const onDown = (event: PointerEvent) => {
      if (!event.isPrimary || event.button !== 0) return;
      dragging = true;
      pointer = event.pointerId;
      lastX = event.clientX;
      lastAt = event.timeStamp;
      spin = 0;
      // Capture is allowed to fail — the pointer can be gone by the time this
      // runs, and a synthetic event has no active pointer at all. It is an
      // optimisation here rather than a requirement (it keeps a drag alive
      // when the pointer leaves the hero), so a failure must not throw out of
      // the handler and strand `dragging` with a cursor that never updated.
      try {
        root.setPointerCapture(event.pointerId);
      } catch {
        /* drag still works, it just ends if the pointer leaves the element */
      }
      root.style.cursor = "grabbing";
    };

    const onMove = (event: PointerEvent) => {
      if (!dragging || event.pointerId !== pointer) return;
      const dx = event.clientX - lastX;
      const dt = Math.max(1, event.timeStamp - lastAt) / 1000;
      const delta = angleFor(dx);

      angle += delta;
      // Velocity is measured from the last move rather than accumulated over
      // the gesture, so a drag that stops dead before release throws nothing.
      spin = delta / dt;
      lastX = event.clientX;
      lastAt = event.timeStamp;
      paint();
    };

    const onUp = (event: PointerEvent) => {
      if (event.pointerId !== pointer) return;
      dragging = false;
      pointer = -1;
      // A stale velocity from a gesture that paused before lifting would fling
      // the ring on release; anything older than a frame or two is discarded.
      if (event.timeStamp - lastAt > 120) spin = 0;
      spin = Math.max(-MAX_SPIN, Math.min(MAX_SPIN, spin));
      try {
        if (root.hasPointerCapture(event.pointerId)) root.releasePointerCapture(event.pointerId);
      } catch {
        /* nothing to release */
      }
      root.style.cursor = "grab";
    };

    root.style.cursor = "grab";
    root.addEventListener("pointerdown", onDown);
    root.addEventListener("pointermove", onMove);
    root.addEventListener("pointerup", onUp);
    root.addEventListener("pointercancel", onUp);

    /* ── Frame ──────────────────────────────────────────────────────────── */

    const tick = (now: number) => {
      // Clamped so a backgrounded tab returning after a long pause resumes
      // where it left off rather than jumping most of a revolution.
      const elapsed = Math.min(64, now - last) / 1000;
      last = now;

      // While the pointer is down the angle is the gesture's to set, so the
      // clock does not also advance it — otherwise the ring creeps out from
      // under a held pointer.
      if (!dragging) {
        angle += (rate + spin) * elapsed;
        spin *= Math.exp(-elapsed * SPIN_DAMPING);
        if (Math.abs(spin) < 0.001) spin = 0;
        paint();
      }

      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      root.removeEventListener("pointerdown", onDown);
      root.removeEventListener("pointermove", onMove);
      root.removeEventListener("pointerup", onUp);
      root.removeEventListener("pointercancel", onUp);
    };
  }, [count, aspect]);

  return (
    // `touch-pan-y` is what keeps this from eating the page on a phone: the
    // browser keeps vertical scrolling for itself and only hands over the
    // horizontal axis, which is the one the ring turns on. `select-none` stops
    // a drag across the hero from painting a text selection over the copy.
    //
    // The ring stays `aria-hidden` and gains no keyboard affordance, because it
    // does nothing — it is the same seven links whichever way round it is
    // turned, and all seven are reachable in `Workflows`. Spinning ornament is
    // not a control, and giving it a tab stop would only add a stop that leads
    // nowhere.
    <div
      ref={host}
      aria-hidden
      data-cursor="Drag"
      className={cn("absolute inset-0 touch-pan-y overflow-hidden select-none", className)}
    >
      {items.map((item, i) => {
        const t = (i / count) * Math.PI * 2;
        const sin = Math.sin(t);
        const scale = 1 + SIZE_SWING * sin;
        const size = `calc(clamp(${SIZE_MIN}px, ${SIZE_RATIO * 100}vw, ${SIZE_MAX}px) * ${scale.toFixed(3)})`;

        return (
          <div
            key={item.src}
            ref={(node) => {
              nodes.current[i] = node;
            }}
            // No ring and no ground beneath the image. These stills are dark
            // subjects composed on white, so they carry their own edge against
            // bone, and a hairline drawn over a photographic edge reads as a
            // seam rather than as a frame.
            //
            // `pointer-events-none` so the gesture is always the host's. A
            // pointerdown landing on an item instead would start a native
            // image drag and never reach the ring.
            className={cn(
              "pointer-events-none absolute top-1/2 left-1/2 overflow-hidden will-change-transform",
              shape === "circle" ? "rounded-full" : "rounded-2xl",
            )}
            style={{
              width: `calc(${size} * ${aspect})`,
              height: size,
              transform: `translate(-50%, -50%) translate(${(RX_RATIO * 100 * Math.cos(t)).toFixed(2)}vw, ${(RY_RATIO * 100 * sin).toFixed(2)}svh)`,
              opacity: OPACITY_MID + OPACITY_SWING * sin,
              filter: `blur(${Math.max(0, BLUR_MAX * (1 - sin)).toFixed(2)}px)`,
              zIndex: Math.round((sin + 1) * 500),
            }}
          >
            {/* The 7% overscan hides a white rim. Each source is a circle
                already composed onto a square white field, and that circle
                covers 94.5–95.3% of the square (measured across all seven), so
                at 1:1 the container's own round mask cuts outside the artwork
                and leaves a thin ring of the white field showing — subtle on
                bone, but visible, and visible on only some of them. Scaling
                past the widest margin puts the artwork's edge under the mask
                instead. Anything cropped is outer photograph; the captions sit
                well inside.

                Eager, despite being ornament: these are above the fold, so one
                of them wins Largest Contentful Paint whatever we do, and
                lazy-loading the LCP element only delays it. `sizes` holds the
                rendition near 150px against a 1254px source, so seven of these
                is a cheaper request than one hero photograph. Not `priority`,
                which would preload all seven ahead of the headline's fonts. */}
            <Image
              src={item.src}
              alt=""
              fill
              loading="eager"
              sizes={`${Math.round(SIZE_MAX * aspect)}px`}
              className="scale-[1.07] object-cover"
            />
          </div>
        );
      })}
    </div>
  );
}
