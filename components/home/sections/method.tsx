"use client";

import { PinnedTrack } from "@/components/home/fx/scroll";
import { Reveal } from "@/components/home/fx/type";
import {
  ArtifactsVisual,
  ConstraintsVisual,
  DescribeVisual,
  TopOptionsVisual,
} from "@/components/marketing/home-visuals";

/**
 * Chapter three: the four steps, as a pinned horizontal run.
 *
 * ## Why horizontal, and why it is allowed here
 *
 * Because this is the one thing on the page that is genuinely a sequence
 * rather than a set. Four cards in a grid say "here are four features"; four
 * panels the reader travels through say "here is what happens, in order",
 * which is the actual claim. The travel is the content.
 *
 * Horizontal scroll-jacking is also the most reliable way to ruin a page, so
 * the two rules that keep it honest are enforced in `PinnedTrack` rather than
 * merely intended: the pin lasts exactly as long as the track's real overflow
 * — never a screen longer, so the reader is never held somewhere that has
 * stopped moving — and below `lg`, or under `prefers-reduced-motion`, the pin
 * does not exist at all. There the track is an ordinary swipeable row with
 * scroll snapping, which is what a touch device wants anyway.
 *
 * The first panel is the chapter head, so the section introduces itself inside
 * the same run it describes instead of above it.
 */

const STEPS = [
  {
    n: "01",
    title: "Describe the system",
    body: "Use case, scale, budget, latency target, data sensitivity, and how much your team has done before.",
    aside: "Six inputs. No questionnaire, no sales call.",
    visual: <DescribeVisual />,
  },
  {
    n: "02",
    title: "Constraints eliminate",
    body: "Restricted data and deployment preferences remove options outright rather than ranking them down, so nothing in the answer is a compromise on them.",
    aside: "A removed option is named, with the constraint that removed it.",
    visual: null,
  },
  {
    n: "03",
    title: "Ten dimensions score",
    body: "What is left is scored on cost, scalability, developer experience, production readiness, security, lock-in, compatibility, operational burden, community, and docs.",
    aside: "The contributions sum to the headline, so the number is checkable.",
    visual: <TopOptionsVisual />,
  },
  {
    n: "04",
    title: "Take the artifacts",
    body: "Architecture document, diagram, roadmap, starter Compose file, and .cursorrules — generated from the same result the page renders.",
    aside: "Generated from the result, so they cannot drift from it.",
    visual: <ArtifactsVisual />,
  },
];

export function Method({ pairs }: { pairs: string }) {
  return (
    <section data-chapter="ink" className="grain-layer relative">
      <PinnedTrack
        className="lg:flex lg:h-svh lg:items-center"
        trackClassName="px-5 py-20 sm:px-8 lg:py-0"
      >
        {/* Panel zero: the chapter head, inside the run rather than above it. */}
        <div className="flex w-[78vw] shrink-0 snap-start flex-col justify-center pr-6 sm:w-[46vw] lg:w-136 lg:pr-16">
          <p className="t-mono flex items-baseline gap-3 text-(--h-fg-45)">
            <span className="text-(--h-acc)">03</span>
            The method
          </p>
          <h2 className="t-head mt-7 text-[clamp(2rem,5vw,3.6rem)]">
            Constraints in, a defensible plan out.
          </h2>
          <p className="t-body mt-7 max-w-[38ch]">
            Four steps from an idea to an architecture you can put in front of a review — with{" "}
            {pairs} pairwise compatibility entries deciding what may sit next to what.
          </p>
          <p className="t-mono mt-10 hidden items-center gap-3 text-(--h-fg-45) lg:flex">
            Scroll to advance
            <span className="block h-px w-10 bg-current" />
          </p>
        </div>

        {STEPS.map((step) => (
          <article
            key={step.n}
            className="flex w-[80vw] shrink-0 snap-start flex-col justify-between border border-(--h-line) bg-(--h-panel) p-7 sm:w-[54vw] lg:w-120 lg:p-9"
          >
            <div>
              <div className="flex items-baseline justify-between gap-4">
                <span className="t-mono text-(--h-acc)">{step.n}</span>
                <span className="t-mono text-(--h-fg-45)">Step</span>
              </div>

              <h3 className="t-head mt-8 text-[clamp(1.5rem,2.6vw,2.1rem)]">{step.title}</h3>
              <p className="t-body mt-5">{step.body}</p>
            </div>

            <div className="mt-10">
              {step.visual ? (
                <div className="mb-7">{step.visual}</div>
              ) : (
                <div className="mb-7">
                  <ConstraintsVisual pairs={pairs} />
                </div>
              )}
              <p className="t-mono border-t border-(--h-line) pt-5 text-(--h-fg-45)">
                {step.aside}
              </p>
            </div>
          </article>
        ))}

        {/* A tail panel so the last card is not flush against the viewport
            edge when the pin releases. */}
        <div aria-hidden className="w-5 shrink-0 sm:w-8 lg:w-16" />
      </PinnedTrack>

      <Reveal from="none" className="mx-auto w-full max-w-[110rem] px-5 pb-16 sm:px-8 lg:hidden">
        <p className="t-mono text-(--h-fg-45)">Swipe to advance</p>
      </Reveal>
    </section>
  );
}
