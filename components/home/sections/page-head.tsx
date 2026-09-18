"use client";

import { useEffect, useRef } from "react";

import { Counter, MaskLines, Reveal, Rule } from "@/components/home/fx/type";
import { useReducedMotion } from "@/components/home/fx/use-client-fact";

/**
 * The opening screen of an interior page.
 *
 * ## Deliberately not the home page's hero
 *
 * `/` opens on a full viewport with a revolving ring, a curtain before it and
 * nothing above the fold but one claim. That is the right treatment for a
 * screen whose only job is to make someone stay, and the wrong one for a page
 * somebody has already chosen to open: they arrived from a nav item or a link
 * and they are looking for the thing they clicked, so making them scroll past
 * an entrance to reach it is a toll.
 *
 * So this is the same type and the same grid at a lower height — the eyebrow,
 * the display lines, the lede, and then the page. It reads as the same design
 * because the scale, the rule and the mono eyebrow are shared; it does not
 * pretend to be a second landing page.
 *
 * ## The figures
 *
 * Optional, and on the two pages that have them they are the same catalog
 * counts the home page opens with, read live by the server component that
 * renders this. They server-render at their final values and count up only as
 * decoration, so the numbers do not depend on JavaScript having run.
 *
 * ## The video backdrop
 *
 * Optional, and when given the head turns into an ink chapter: footage behind,
 * a near-black scrim over it, and the type in bone. See `VideoBackdrop`.
 */

export function PageHead({
  eyebrow,
  title,
  lede,
  stats,
  backdrop,
}: {
  eyebrow: string;
  /** Display lines, broken by hand. See `MaskLines` for why they are not wrapped. */
  title: React.ReactNode[];
  lede: string;
  stats?: [string, number][];
  /** Footage behind the head. Its presence also switches the head to ink. */
  backdrop?: Backdrop;
}) {
  return (
    <section
      // Ink under footage, so the type goes bone. It also tells the nav — which
      // floats over this with no ground of its own — to draw itself light.
      data-chapter={backdrop ? "ink" : undefined}
      className="grain-layer relative overflow-hidden px-5 pt-36 pb-16 sm:px-8 sm:pt-44 sm:pb-20"
    >
      {backdrop ? <VideoBackdrop {...backdrop} /> : null}

      {/* The same four column rules the home hero sets its type against. */}
      <div
        aria-hidden
        className="col-rules absolute inset-x-0 top-0 mx-auto h-full w-full max-w-[110rem] px-5 sm:px-8"
        style={{ ["--cols" as string]: 4 }}
      >
        <span />
        <span />
        <span />
        <span />
      </div>

      <div className="relative mx-auto w-full max-w-[110rem]">
        <Reveal from="none" duration={0.6}>
          <p className="t-mono text-(--h-fg-45)">{eyebrow}</p>
        </Reveal>

        <MaskLines
          as="h1"
          lines={title}
          className="t-display mt-8 max-w-[16ch] text-[clamp(2.5rem,7.4vw,6.5rem)]"
          delay={0.1}
          step={0.08}
        />

        <div className="mt-12 grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-16">
          <Reveal delay={0.45}>
            <p className="t-body max-w-[54ch]">{lede}</p>
          </Reveal>

          {stats ? (
            <Reveal delay={0.55} className="lg:pt-1">
              <dl className="grid grid-cols-2 gap-x-6 gap-y-7 sm:grid-cols-4">
                {stats.map(([label, value]) => (
                  <div key={label}>
                    <dd className="t-head text-[clamp(1.5rem,2.4vw,2.2rem)]">
                      <Counter value={value} />
                    </dd>
                    <dt className="t-mono mt-2 text-[9px] text-(--h-fg-45)">{label}</dt>
                  </div>
                ))}
              </dl>
            </Reveal>
          ) : null}
        </div>

        <Rule className="mt-16" />
      </div>
    </section>
  );
}

type Backdrop = {
  /** The full-size loop, served from `md` up. */
  video: string;
  /** A lighter encode for phones, which only ever see a crop of it. */
  mobileVideo?: string;
  /** The loop's own first frame, shown until it plays and instead of it. */
  poster: string;
};

/**
 * Looping footage behind the head, under a scrim that keeps the type legible.
 *
 * ## The scrim is two gradients, not one
 *
 * The horizontal one is the reference design's: near-black behind the type on
 * the left (94%), thinning to let the footage through on the right (18%), and
 * closing a little at the far edge (34%) so the frame has an end. It was
 * designed for a hero with nothing on its right half.
 *
 * This head has the catalog counts there, sitting exactly where that gradient
 * is thinnest, over the brightest part of the shot. So a second gradient rises
 * from the bottom: dark enough under the counts to hold their contrast, gone
 * by the upper half so the footage still reads as footage.
 *
 * No scrim is enough for text *in* the footage. An earlier /features clip had
 * a caption burned into the corner the counts sit in, and at any darkness that
 * left the numbers legible it still competed with them. Text like that has to
 * be cropped out of the file: styling cannot do it, since how much of the
 * frame shows depends on the viewport.
 *
 * ## It starts itself, rather than autoplaying from the markup
 *
 * No `autoPlay` attribute and `preload="none"`: nothing is fetched until the
 * effect decides it should play. That is the only way to honour a reduced-
 * motion preference or a Save-Data connection *before* the download rather
 * than after — an `autoPlay` attribute has the file on the wire before any
 * script has run. The poster covers the gap, and it is the loop's first frame,
 * so playback begins without a jump.
 *
 * `play()` can still be refused (iOS Low Power Mode, a strict autoplay
 * policy), and the poster is the right thing to be left showing when it is.
 *
 * ## The sources
 *
 * 1080p from `md` up, 720p below. The full-size `<source>` comes first and
 * carries the `media` query, deliberately: a browser too old to understand
 * `media` on `<source>` takes the first playable one, and the safe failure is
 * the sharp file on a phone, not the soft one on a desktop.
 *
 * Decorative throughout — `aria-hidden`, muted, no controls. The head's
 * meaning is in its text, and a screen reader has nothing to gain from being
 * told a video is playing.
 */
function VideoBackdrop({ video, mobileVideo, poster }: Backdrop) {
  const ref = useRef<HTMLVideoElement>(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const saveData =
      (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData ===
      true;
    if (reduced || saveData) {
      element.pause();
      return;
    }

    const play = () => {
      element.play().catch(() => {
        // Refused — low-power mode or an autoplay policy. The poster stays up.
      });
    };

    // Chrome pauses a muted video in a tab that is not showing, to save power,
    // and resuming it is left to the page. Without this a visitor who switched
    // tabs came back to a frozen frame.
    const onVisibility = () => {
      if (document.visibilityState === "visible" && element.paused) play();
    };

    element.preload = "auto";
    play();
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [reduced]);

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0">
      <video
        ref={ref}
        muted
        loop
        playsInline
        preload="none"
        poster={poster}
        className="absolute inset-0 h-full w-full object-cover object-bottom"
      >
        <source
          src={video}
          type="video/mp4"
          media={mobileVideo ? "(min-width: 768px)" : undefined}
        />
        {mobileVideo ? <source src={mobileVideo} type="video/mp4" /> : null}
      </video>

      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            "linear-gradient(90deg, color-mix(in srgb, var(--h-ink) 94%, transparent) 0%, color-mix(in srgb, var(--h-ink) 74%, transparent) 43%, color-mix(in srgb, var(--h-ink) 18%, transparent) 78%, color-mix(in srgb, var(--h-ink) 34%, transparent) 100%)",
        }}
      />
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            "linear-gradient(to top, color-mix(in srgb, var(--h-ink) 88%, transparent) 0%, color-mix(in srgb, var(--h-ink) 55%, transparent) 30%, transparent 60%)",
        }}
      />
    </div>
  );
}
