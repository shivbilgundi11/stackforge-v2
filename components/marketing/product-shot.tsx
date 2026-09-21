import Image from "next/image";

import { Safari } from "@/components/ui/safari";

/**
 * A real screenshot of the product, in a browser window.
 *
 * Captured from the running app against the real engines — not a mockup, not
 * a redrawn illustration. This audience trusts artifacts over claims (M22),
 * and a screenshot of the actual result page is the cheapest honest proof
 * that the thing works.
 *
 * ## Why two files per shot
 *
 * The theme-aware pages are exactly that, so a screenshot baked in one theme is
 * the most obvious way for a page to look broken in the other — a white slab
 * sitting in a matte-black page. Every shot is captured twice and swapped on
 * the same `.dark` class next-themes writes onto `<html>`, so the product
 * image follows the page instead of fighting it.
 *
 * Both files are in the DOM and CSS picks one. That costs a second image on
 * the wire, which is why every shot is `loading="lazy"` below the fold and
 * why the hero passes `priority` explicitly rather than every instance
 * claiming to be the most important thing on the page.
 *
 * ## The frame
 *
 * Magic UI's Safari window, vendored at `components/ui/safari.tsx`. It replaces
 * three hand-drawn dots on a bar, which was the same idea done worse: the same
 * claim about what the reader is looking at, with none of the detail that makes
 * the claim land. The frame reads `--line` and `--surface`, so it follows the
 * theme here for the same reason the capture does.
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
  /** The frame's address bar — `shotAddress()` in `lib/marketing/content.ts`. */
  url?: string;
  /** The hero shot only. Everything else stays lazy. */
  priority?: boolean;
  className?: string;
};

/** Captured at 1440×900 with `deviceScaleFactor: 2`. */
const WIDTH = 2880;
const HEIGHT = 1800;

export function ProductShot({ src, alt, url, priority = false, className }: ProductShotProps) {
  const common = {
    width: WIDTH,
    height: HEIGHT,
    alt,
    priority,
    loading: priority ? undefined : ("lazy" as const),
    sizes: "(max-width: 1120px) 100vw, 1120px",
    className: "block w-full",
  };

  return (
    <figure className={className}>
      <Safari url={url} className="shadow-panel">
        {/* One alt between the pair: to assistive tech this is a single image,
            and announcing it twice because the design has a theme swap would be
            a bug, not a feature. */}
        <Image
          {...common}
          src={`/marketing/${src}-light.png`}
          alt={alt}
          className="block w-full dark:hidden"
        />
        <Image
          {...common}
          src={`/marketing/${src}-dark.png`}
          alt=""
          aria-hidden
          className="hidden w-full dark:block"
        />
      </Safari>
    </figure>
  );
}
