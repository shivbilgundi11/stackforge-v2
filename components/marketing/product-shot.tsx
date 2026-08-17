import Image from "next/image";

import { cn } from "@/lib/utils";

/**
 * A real screenshot of the product, in a window frame.
 *
 * Captured from the running app against the real engines — not a mockup, not
 * a redrawn illustration. This audience trusts artifacts over claims (M22),
 * and a screenshot of the actual result page is the cheapest honest proof
 * that the thing works.
 *
 * ## Why two files per shot
 *
 * The marketing pages are theme-aware, so a screenshot baked in one theme is
 * the most obvious way for a page to look broken in the other — a white slab
 * sitting in a matte-black page. Every shot is captured twice and swapped on
 * the same `.dark` class next-themes writes onto `<html>`, so the product
 * image follows the page instead of fighting it.
 *
 * Both files are in the DOM and CSS picks one. That costs a second image on
 * the wire, which is why every shot is `loading="lazy"` below the fold and
 * why the hero passes `priority` explicitly rather than every instance
 * claiming to be the most important thing on the page.
 */

export type ProductShotProps = {
  /** File stem under `public/marketing/` — `<src>-light.png` / `<src>-dark.png`. */
  src: string;
  /**
   * What a sighted user would take from the image. Describe the *result*, not
   * the chrome: "a stack scored 85 of 100" tells a screen-reader user what the
   * section is claiming; "screenshot of Stack Architect" tells them nothing.
   */
  alt: string;
  /** The hero shot only. Everything else stays lazy. */
  priority?: boolean;
  className?: string;
};

/** Captured at 1440×900 with `deviceScaleFactor: 2`. */
const WIDTH = 2880;
const HEIGHT = 1800;

export function ProductShot({ src, alt, priority = false, className }: ProductShotProps) {
  const common = {
    width: WIDTH,
    height: HEIGHT,
    alt,
    priority,
    loading: priority ? undefined : ("lazy" as const),
    sizes: "(max-width: 1120px) 100vw, 1120px",
    className: "w-full",
  };

  return (
    <figure
      className={cn(
        "overflow-hidden rounded-[var(--radius)] border border-line bg-surface",
        "shadow-[var(--shadow-panel)]",
        className,
      )}
    >
      {/* Window chrome. Decorative, so it is hidden from the accessibility
          tree — the alt text on the image below carries the meaning. */}
      <div
        className="flex h-8 items-center gap-1.5 border-b border-line bg-surface-2 px-3"
        aria-hidden
      >
        <span className="size-2 rounded-full bg-line-strong" />
        <span className="size-2 rounded-full bg-line-strong" />
        <span className="size-2 rounded-full bg-line-strong" />
      </div>

      {/* One alt between the pair: to assistive tech this is a single image,
          and announcing it twice because the design has a theme swap would be
          a bug, not a feature. */}
      <Image
        {...common}
        src={`/marketing/${src}-light.png`}
        alt={alt}
        className="w-full dark:hidden"
      />
      <Image
        {...common}
        src={`/marketing/${src}-dark.png`}
        alt=""
        aria-hidden
        className="hidden w-full dark:block"
      />
    </figure>
  );
}
