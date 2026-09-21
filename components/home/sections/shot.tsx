"use client";

import Image from "next/image";

import { Parallax } from "@/components/home/fx/scroll";
import { Safari } from "@/components/ui/safari";

/**
 * A screenshot of the running product, in a browser window, in this page's
 * colour system.
 *
 * ## Why this is not `components/marketing/product-shot.tsx`
 *
 * That component solves a problem this surface does not have. The product and
 * the theme-aware pages follow the theme toggle, so every shot there is
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
 * ## The frame is a window
 *
 * It was a hairline — a single rule and nothing else, on the argument that
 * macOS window chrome around a screenshot is decoration pretending to be
 * context. What that argument missed is what these captures actually are. They
 * are full-viewport captures of a web app, cut off mid-content at the bottom
 * edge because that is where the viewport ended. Unframed, that cut reads as a
 * badly cropped image. Framed, it reads as a page that continues below the
 * fold, which is what it is — the frame is not claiming "this is an app", it is
 * explaining an edge the reader would otherwise have to excuse.
 *
 * The window is Magic UI's Safari frame, vendored and re-tokenised so it takes
 * its colours from the chapter it is standing in. `tone` therefore only picks
 * the capture; the frame follows `--line` and `--surface`, which `home.css`
 * pins per chapter, and needs nothing passed to it.
 */

export function Shot({
  src,
  alt,
  url,
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
  /** The frame's address bar — `shotAddress()` in `lib/marketing/content.ts`. */
  url?: string;
  /** The ground this sits on, which decides which capture is used. */
  tone?: "bone" | "ink";
  /** Off for anything already inside a pinned or otherwise scrubbed section. */
  parallax?: boolean;
  priority?: boolean;
  className?: string;
}) {
  const figure = (
    <figure className={className}>
      <Safari url={url}>
        <Image
          src={`/marketing/${src}-${tone === "ink" ? "dark" : "light"}.png`}
          alt={alt}
          width={2880}
          height={1800}
          priority={priority}
          loading={priority ? undefined : "lazy"}
          sizes="(max-width: 1024px) 100vw, 56rem"
          className="block w-full"
        />
      </Safari>
    </figure>
  );

  // A short travel, and only on the image. The type beside it stays put, which
  // is what makes the drift read as depth rather than as the page coming
  // apart — two columns moving at two speeds is a broken layout, one column
  // moving against still type is a parallax.
  return parallax ? <Parallax distance={44}>{figure}</Parallax> : figure;
}
