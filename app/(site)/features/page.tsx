import { Fragment } from "react";
import type { Metadata } from "next";
import Link from "next/link";

import { ProgressRail } from "@/components/home/fx/scroll";
import { MaskLines, Reveal, Rule, Stagger, StaggerItem } from "@/components/home/fx/type";
import { Magnetic } from "@/components/home/fx/ui";
import { CtaBand } from "@/components/home/sections/cta-band";
import { PageHead } from "@/components/home/sections/page-head";
import { Shot } from "@/components/home/sections/shot";
import { FEATURES } from "@/lib/marketing/content";
import { getCatalogStats } from "@/lib/marketing/data";

/**
 * Feature depth, one chapter per surface.
 *
 * ## The copy is not written here
 *
 * Every claim comes from `lib/marketing/content.ts`, which is shared with the
 * home page so the two cannot describe the same surface differently. That file
 * carries the rule the copy is held to: a sentence that cannot be traced to
 * code that runs does not belong in it. Nothing on this page adds a claim —
 * the layout is new, the argument is the one that was already checked.
 *
 * ## Shape
 *
 * Seven chapters, numbered, alternating bone and ink. The alternation is the
 * only thing distinguishing one surface from the next at a glance on a page
 * this long, and it does a second job here: it decides which capture of each
 * screenshot is used. A light shot on bone and a dark shot on ink, chosen at
 * build time from the ground rather than at runtime from the theme — see
 * `sections/shot.tsx`, which is why this page does not use the product's own
 * `ProductShot`.
 *
 * The image and the type also swap sides on each chapter. That is not variety
 * for its own sake: a reader scanning seven near-identical blocks stops seeing
 * the boundaries between them, and alternating the axis forces the eye back to
 * the start of each one.
 */

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Features",
  description:
    "Seven surfaces: Stack Architect, Cost Planner, Compare Center, RAG Planner, Agent & MCP Builder, Infra Planner, and the ROI Calculator — with the real product in every screenshot.",
  alternates: { canonical: "/features" },
};

export default async function Page() {
  const catalog = await getCatalogStats();

  return (
    <>
      <ProgressRail chapters={FEATURES.map((feature) => feature.title)} />

      <PageHead
        eyebrow="Features"
        // Joined with spaces into the accessible name, and matched by
        // `e2e/marketing.spec.ts` against /Everything you need to argue for a
        // stack/ — so the lines have to read as a sentence in order.
        title={[
          "Everything you need",
          "to argue for",
          <Fragment key="last">
            a stack<span className="text-(--h-acc)">.</span>
          </Fragment>,
        ]}
        lede="Seven surfaces over one catalog. Every screenshot below is the product answering a real question — not a mockup, and not a redrawn illustration."
        stats={[
          ["Models", catalog.models],
          ["Tools", catalog.tools],
          ["GPUs", catalog.gpus],
          ["Verified pairs", catalog.compatibility_pairs],
        ]}
        // Re-encoded from a 4.9 MB source: trimmed of its black-and-flicker
        // intro, cropped above the "PLAN YOUR AI STACK" caption burned into its
        // lower-right corner (it sat directly behind the catalog counts), and
        // made a crossfade loop so it repeats without a cut. 0.74 MB at 1080p,
        // 0.31 MB at 720p.
        backdrop={{
          video: "/marketing/features-hero-1080.mp4",
          mobileVideo: "/marketing/features-hero-720.mp4",
          poster: "/marketing/features-hero-poster.webp",
        }}
      />

      {FEATURES.map((feature, index) => {
        const ink = index % 2 === 1;
        const n = String(index + 1).padStart(2, "0");

        return (
          <section
            key={feature.title}
            id={feature.shot}
            data-chapter={ink ? "ink" : undefined}
            className="relative scroll-mt-24"
          >
            <div className="mx-auto w-full max-w-[110rem] px-5 py-20 sm:px-8 sm:py-26">
              <Rule />

              <div className="grid items-center gap-12 pt-10 lg:grid-cols-2 lg:gap-16 xl:gap-24">
                <div className={ink ? "lg:order-2" : undefined}>
                  {/* The number and the count, not the title — the h2 below
                      says the title, and an eyebrow repeating it would be read
                      twice by a screen reader and add nothing to a sighted
                      reader. What is missing on a page of seven near-identical
                      chapters is how far through them you are. */}
                  <Reveal from="none" duration={0.6}>
                    <p className="t-mono flex items-baseline gap-3 text-(--h-fg-45)">
                      <span className="text-(--h-acc)">{n}</span>
                      of {String(FEATURES.length).padStart(2, "0")}
                    </p>
                  </Reveal>

                  <MaskLines
                    as="h2"
                    lines={[feature.title]}
                    className="t-head mt-7 text-[clamp(1.9rem,4.4vw,3.4rem)]"
                  />

                  <Reveal delay={0.18}>
                    <p className="t-body mt-6 max-w-[52ch]">{feature.body}</p>
                  </Reveal>

                  <Stagger step={0.05} className="mt-9 border-t border-(--h-line)">
                    {feature.points.map((point) => (
                      <StaggerItem key={point} className="border-b border-(--h-line) py-4">
                        <p className="t-body max-w-[54ch] text-[0.9375rem]">{point}</p>
                      </StaggerItem>
                    ))}
                  </Stagger>

                  <Reveal delay={0.22} className="mt-9">
                    <Magnetic strength={12}>
                      <Link href="/signup" data-cursor="Start" className="btn">
                        Start free
                        <Arrow />
                      </Link>
                    </Magnetic>
                  </Reveal>
                </div>

                <Shot
                  src={feature.shot}
                  alt={feature.alt}
                  tone={ink ? "ink" : "bone"}
                  priority={index === 0}
                  parallax={index !== 0}
                  className={ink ? "lg:order-1" : undefined}
                />
              </div>
            </div>
          </section>
        );
      })}

      <CtaBand
        title={["Try it on", "something real."]}
        lede="No card, and the first result is a complete one — the document, the diagram and the roadmap included."
        secondary={{ href: "/pricing", label: "See the plans" }}
      />
    </>
  );
}

function Arrow() {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden className="size-3.5">
      <path
        d="M3 13L13 3M13 3H5.5M13 3v7.5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
