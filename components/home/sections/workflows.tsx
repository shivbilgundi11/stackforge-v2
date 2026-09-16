"use client";

import * as React from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";

import { useReducedMotion } from "@/components/home/fx/use-client-fact";

import { EASE, MaskLines, Reveal, Rule } from "@/components/home/fx/type";
import {
  AgentVisual,
  CostVisual,
  DeploymentVisual,
  PipelineVisual,
  RoiVisual,
} from "@/components/marketing/home-visuals";
import { WORKFLOWS } from "@/lib/marketing/content";
import { cn } from "@/lib/utils";

/**
 * Chapter five: the five workflows, as a switcher.
 *
 * ## Why this is interactive and the rest of the page is not
 *
 * Five cards in a row is the obvious layout and it makes the reader do the
 * work — five blocks of body copy, read in sequence, to find the one that
 * describes their problem. A switcher inverts that: the five names are
 * scannable in a single pass at headline size, and only the one they pick is
 * set as prose. It is the one place on the page where the reader has something
 * to actually do, and it is the right place for it, because "which of these is
 * mine" is the question they are holding at this point.
 *
 * ## The accessibility of it
 *
 * Real tabs: `role="tablist"`, `aria-selected`, and left/right arrow keys
 * moving the selection, which is what a screen-reader user expects the moment
 * the pattern is announced. The panel is labelled by its tab. Pointer *hover*
 * also switches it, because on a page like this a reader's mouse arrives
 * before their click does — but hover never steals focus, so keyboard and
 * pointer never fight over which panel is showing.
 *
 * Where these point: at the section of `/features` that describes each
 * surface, not at the tool inside the application. A visitor browsing the
 * marketing site who picks "Cost Planner" wants to read about the Cost
 * Planner; handing them the tool swaps the page chrome for the workbench shell
 * mid-browse.
 */

const VISUALS = [CostVisual, PipelineVisual, AgentVisual, DeploymentVisual, RoiVisual];

/** The question each workflow answers, for the panel's standfirst. */
const ASKS = [
  "What will this actually cost to run?",
  "How big is the retrieval pipeline, and what does it cost per query?",
  "What does the agent loop really spend once retries and schemas are counted?",
  "Can we self-host this, and on what?",
  "Does the business case survive a review?",
];

export function Workflows() {
  const reduced = useReducedMotion();
  const [active, setActive] = React.useState(0);
  const tabRefs = React.useRef<(HTMLButtonElement | null)[]>([]);

  const onKeyDown = (event: React.KeyboardEvent) => {
    const last = WORKFLOWS.length - 1;
    let next: number | null = null;
    if (event.key === "ArrowRight" || event.key === "ArrowDown")
      next = active === last ? 0 : active + 1;
    if (event.key === "ArrowLeft" || event.key === "ArrowUp")
      next = active === 0 ? last : active - 1;
    if (event.key === "Home") next = 0;
    if (event.key === "End") next = last;
    if (next === null) return;
    event.preventDefault();
    setActive(next);
    tabRefs.current[next]?.focus();
  };

  const Visual = VISUALS[active] ?? CostVisual;
  const workflow = WORKFLOWS[active];

  return (
    <section data-chapter="ink" className="grain-layer relative">
      <div className="mx-auto w-full max-w-[110rem] px-5 py-20 sm:px-8 sm:py-26">
        <Rule />
        <div className="grid gap-8 pt-7 lg:grid-cols-[minmax(0,14rem)_minmax(0,1fr)] lg:gap-16">
          <Reveal from="none" duration={0.6}>
            <p className="t-mono flex items-baseline gap-3 text-[var(--h-fg-45)]">
              <span className="text-[var(--h-acc)]">05</span>
              The workflows
            </p>
          </Reveal>
          <MaskLines
            as="h2"
            lines={["Five questions,", "five ways in."]}
            className="t-head max-w-[16ch] text-[clamp(2rem,5.6vw,4.4rem)]"
          />
        </div>

        <div className="mt-16 grid gap-10 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:gap-16">
          {/* ── The names ──────────────────────────────────────────────── */}
          <div
            role="tablist"
            aria-label="Workflows"
            onKeyDown={onKeyDown}
            className="border-t border-[var(--h-line)]"
          >
            {WORKFLOWS.map((item, i) => {
              const selected = i === active;
              return (
                <button
                  key={item.href}
                  ref={(node) => {
                    tabRefs.current[i] = node;
                  }}
                  role="tab"
                  id={`wf-tab-${i}`}
                  aria-selected={selected}
                  aria-controls={`wf-panel-${i}`}
                  tabIndex={selected ? 0 : -1}
                  onClick={() => setActive(i)}
                  onPointerEnter={(event) => {
                    if (event.pointerType === "mouse") setActive(i);
                  }}
                  className="group relative flex w-full items-center gap-5 border-b border-[var(--h-line)] py-6 text-left"
                >
                  {/* The fill that rises behind the selected row. */}
                  <span
                    aria-hidden
                    className={cn(
                      "absolute inset-0 -z-10 origin-bottom bg-[var(--h-panel)] transition-transform duration-500 ease-(--h-ease)",
                      selected ? "scale-y-100" : "scale-y-0",
                    )}
                  />
                  <span
                    className={cn(
                      "t-mono w-8 shrink-0 transition-colors duration-300",
                      selected ? "text-[var(--h-acc)]" : "text-[var(--h-fg-45)]",
                    )}
                  >
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span
                    className={cn(
                      "t-head flex-1 text-[clamp(1.4rem,3.2vw,2.4rem)] transition-all duration-500 ease-(--h-ease)",
                      selected ? "translate-x-2 opacity-100" : "opacity-55",
                    )}
                  >
                    {item.label}
                  </span>
                  <span
                    aria-hidden
                    className={cn(
                      "mr-3 block h-px shrink-0 bg-[var(--h-acc)] transition-all duration-500 ease-(--h-ease)",
                      selected ? "w-10 opacity-100" : "w-0 opacity-0",
                    )}
                  />
                </button>
              );
            })}
          </div>

          {/* ── The panel ──────────────────────────────────────────────── */}
          <div className="relative min-h-[26rem]">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={active}
                role="tabpanel"
                id={`wf-panel-${active}`}
                aria-labelledby={`wf-tab-${active}`}
                initial={reduced ? false : { opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduced ? undefined : { opacity: 0, y: -12 }}
                transition={{ duration: 0.38, ease: EASE }}
                className="border border-[var(--h-line)] bg-[var(--h-panel)] p-7 sm:p-9"
              >
                <p className="t-mono text-[var(--h-fg-45)]">It answers</p>
                <p className="t-head mt-4 text-[clamp(1.25rem,2.2vw,1.75rem)]">{ASKS[active]}</p>

                <p className="t-body mt-7">{workflow?.body}</p>

                <div className="mt-9">
                  <Visual />
                </div>

                <Link
                  href={workflow?.href ?? "/features"}
                  data-cursor="Open"
                  className="u-link t-mono mt-9 inline-flex items-center gap-3 text-[var(--h-acc)]"
                >
                  Read about {workflow?.label}
                  <span aria-hidden>→</span>
                </Link>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </section>
  );
}
