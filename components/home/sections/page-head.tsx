"use client";

import { Counter, MaskLines, Reveal, Rule } from "@/components/home/fx/type";

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
 */

export function PageHead({
  eyebrow,
  title,
  lede,
  stats,
}: {
  eyebrow: string;
  /** Display lines, broken by hand. See `MaskLines` for why they are not wrapped. */
  title: React.ReactNode[];
  lede: string;
  stats?: [string, number][];
}) {
  return (
    <section className="grain-layer relative overflow-hidden px-5 pt-36 pb-16 sm:px-8 sm:pt-44 sm:pb-20">
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
          <p className="t-mono text-[var(--h-fg-45)]">{eyebrow}</p>
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
                    <dt className="t-mono mt-2 text-[9px] text-[var(--h-fg-45)]">{label}</dt>
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
