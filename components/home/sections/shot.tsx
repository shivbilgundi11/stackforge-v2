"use client";

import Image from "next/image";

import { Parallax } from "@/components/home/fx/scroll";
import { cn } from "@/lib/utils";

/**
 * A screenshot of the running product, in this page's colour system.
 *
 * ## Why this is not `components/marketing/product-shot.tsx`
 *
 * That component solves a problem this surface does not have. The product and
 * the `(marketting)` pages follow the theme toggle, so every shot there is
 * captured twice and swapped on `.dark` — both files in the DOM, CSS picking
 * one, a second image on the wire for every screenshot.
 *
 * These pages have a fixed bone-and-ink palette that does not follow the theme
 * (see `home.css`). Which capture is correct is therefore known at build time
 * from the ground the section is sitting on, not at runtime from a class on
 * `<html>`: bone chapters take the light shot, ink chapters take the dark one.
 * One file, chosen by the caller, and the shot matches its surroundings by
 * construction rather than by a media query.
 *
 * ## The frame is a hairline, not a window
 *
 * No traffic lights and no drop shadow. The rest of this page separates things
 * with a single rule and nothing else, and a macOS window chrome around a
 * screenshot is decoration pretending to be context — it says "this is an app"
 * to a reader who is already looking at the app.
 */

export function Shot({
  src,
  alt,
  tone = "bone",
  parallax = true,
  priority = false,
  className,
}: {
  /** File stem under `public/marketing/`. */
  src: string;
  /**
   * What a sighted reader takes from the image. The *result*, not the chrome:
   * "a stack scored 85 of 100" tells a screen-reader user what the section is
   * claiming; "screenshot of Stack Architect" tells them nothing.
   */
  alt: string;
  /** The ground this sits on, which decides which capture is used. */
  tone?: "bone" | "ink";
  /** Off for anything already inside a pinned or otherwise scrubbed section. */
  parallax?: boolean;
  priority?: boolean;
  className?: string;
}) {
  const figure = (
    <figure className={cn("overflow-hidden rounded-xl border border-(--h-line-2)", className)}>
      <Image
        src={`/marketing/${src}-${tone === "ink" ? "dark" : "light"}.png`}
        alt={alt}
        width={2880}
        height={1800}
        priority={priority}
        loading={priority ? undefined : "lazy"}
        sizes="(max-width: 1024px) 100vw, 56rem"
        className="w-full"
      />
    </figure>
  );

  // A short travel, and only on the image. The type beside it stays put, which
  // is what makes the drift read as depth rather than as the page coming
  // apart — two columns moving at two speeds is a broken layout, one column
  // moving against still type is a parallax.
  return parallax ? <Parallax distance={44}>{figure}</Parallax> : figure;
}
