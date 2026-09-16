"use client";

import { Counter, Reveal, Stagger, StaggerItem } from "@/components/home/fx/type";

/**
 * The catalog counts, immediately under the hero.
 *
 * These used to live inside the hero's footer row. The hero is now a centred
 * layout built around a single claim, and four figures set beside that claim
 * gave the screen two things to look at instead of one — so they moved down to
 * become the first band under the fold, which is where they were doing their
 * work anyway.
 *
 * ## They are the social proof
 *
 * There are no logos here and no testimonials, because there are no customers
 * to quote and inventing some is how the previous build of this site ended up
 * claiming fifty thousand users against none. What stands in their place is the
 * catalog itself: counts read live from the API by the server component that
 * renders this page, which a visitor can check against the product in one
 * click.
 *
 * They server-render at their final values and count up only as decoration, so
 * the numbers this page is claiming do not depend on JavaScript having run.
 */

export function Metrics({
  models,
  tools,
  gpus,
  pairs,
}: {
  models: number;
  tools: number;
  gpus: number;
  pairs: number;
}) {
  const stats: [string, number][] = [
    ["Models", models],
    ["Tools", tools],
    ["GPUs", gpus],
    ["Verified pairs", pairs],
  ];

  return (
    <section className="relative">
      <div className="mx-auto w-full max-w-[110rem] px-5 sm:px-8">
        <Reveal from="none">
          <span className="rule block" />
        </Reveal>

        <Stagger className="grid grid-cols-2 gap-x-6 gap-y-10 py-14 sm:grid-cols-4 sm:py-16">
          {stats.map(([label, value]) => (
            <StaggerItem key={label}>
              <dl>
                <dd className="t-head text-[clamp(2.25rem,5vw,4rem)]">
                  <Counter value={value} />
                </dd>
                <dt className="t-mono mt-3 text-[var(--h-fg-45)]">{label}</dt>
              </dl>
            </StaggerItem>
          ))}
        </Stagger>
      </div>
    </section>
  );
}
