"use client";

import * as React from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";

import { useReducedMotion } from "@/components/home/fx/use-client-fact";

import { EASE, MaskLines, Reveal, Rule, STILL } from "@/components/home/fx/type";
import { Section } from "@/components/home/sections/head";
import { FAQ } from "@/lib/marketing/content";
import { cn } from "@/lib/utils";

/**
 * Chapter eight: the five questions we get most.
 *
 * ## Why an accordion and not five open answers
 *
 * The answers run three and four sentences each. Open, they are a wall of body
 * copy at exactly the point where the reader has decided and is looking for
 * the button. Collapsed, the five *questions* are scannable in one pass, which
 * is what this section is for — a reader holding an objection finds theirs and
 * opens it.
 *
 * ## The accessibility of it
 *
 * Real buttons with `aria-expanded` and `aria-controls`, and a panel that is
 * genuinely removed from the DOM rather than hidden behind opacity. Under
 * reduced motion the height animation is skipped entirely rather than
 * shortened — an animating height is the single most nauseating pattern on a
 * page for a reader who has asked for less of it.
 *
 * The first row is open on mount, so the section is never a column of closed
 * boxes with nothing to read.
 */

const SHOWN = 5;

export function Faq() {
  const [open, setOpen] = React.useState(0);
  const reduced = useReducedMotion();
  const items = FAQ.slice(0, SHOWN);

  return (
    <Section>
      <Rule />
      <div className="grid gap-8 pt-7 lg:grid-cols-[minmax(0,14rem)_minmax(0,1fr)] lg:gap-16">
        <Reveal from="none" duration={0.6}>
          <p className="t-mono flex items-baseline gap-3 text-[var(--h-fg-45)]">
            <span className="text-[var(--h-acc)]">08</span>
            Questions
          </p>
        </Reveal>

        <div>
          <MaskLines
            as="h2"
            lines={["The five", "we get most."]}
            className="t-head max-w-[14ch] text-[clamp(2rem,5.6vw,4.4rem)]"
          />

          <dl className="mt-14 border-t border-[var(--h-line)]">
            {items.map((item, i) => {
              const expanded = open === i;
              const panelId = `faq-panel-${i}`;

              return (
                <div key={item.q} className="group border-b border-[var(--h-line)]">
                  <dt>
                    <button
                      type="button"
                      aria-expanded={expanded}
                      aria-controls={panelId}
                      onClick={() => setOpen(expanded ? -1 : i)}
                      className="flex w-full items-start gap-6 py-7 text-left"
                    >
                      <span className="t-mono w-8 shrink-0 pt-2 text-[var(--h-fg-45)]">
                        {String(i + 1).padStart(2, "0")}
                      </span>

                      <span
                        className={cn(
                          "t-head flex-1 text-[clamp(1.2rem,2.6vw,2rem)] transition-opacity duration-400",
                          expanded ? "opacity-100" : "opacity-60 group-hover:opacity-100",
                        )}
                      >
                        {item.q}
                      </span>

                      {/* A plus that becomes a minus. Two rules, one of which
                          collapses — cheaper than swapping an icon and it
                          animates the actual shape rather than crossfading. */}
                      <span
                        aria-hidden
                        className="relative mt-3 block size-4 shrink-0 text-[var(--h-acc)]"
                      >
                        <span className="absolute top-1/2 left-0 block h-px w-4 -translate-y-1/2 bg-current" />
                        <span
                          className={cn(
                            "absolute top-0 left-1/2 block h-4 w-px -translate-x-1/2 bg-current transition-transform duration-500 ease-(--h-ease)",
                            expanded ? "scale-y-0" : "scale-y-100",
                          )}
                        />
                      </span>
                    </button>
                  </dt>

                  {/* One tree in both cases. Under reduced motion the panel
                      still mounts and unmounts — it just does it instantly,
                      because an animating height is the single most nauseating
                      pattern on a page for a reader who asked for less of it.
                      Branching on the preference to render a plain `<dd>`
                      instead would be a hydration mismatch, since the server
                      cannot know the preference. */}
                  <AnimatePresence initial={false}>
                    {expanded ? (
                      <motion.dd
                        id={panelId}
                        key="panel"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={reduced ? STILL : { duration: 0.42, ease: EASE }}
                        className="overflow-hidden"
                      >
                        <div className="pb-8 pl-14">
                          <Answer text={item.a} />
                        </div>
                      </motion.dd>
                    ) : null}
                  </AnimatePresence>
                </div>
              );
            })}
          </dl>

          <Reveal delay={0.1} className="mt-9 flex flex-wrap items-center gap-x-8 gap-y-3">
            <Link href="/faq" data-cursor="Read" className="u-link t-mono text-[var(--h-acc)]">
              Read the full FAQ →
            </Link>
            <Link href="/contact" className="u-link t-mono text-[var(--h-fg-45)]">
              Still stuck? Talk to us →
            </Link>
          </Reveal>
        </div>
      </div>
    </Section>
  );
}

function Answer({ text }: { text: string }) {
  return <p className="t-body max-w-[68ch]">{text}</p>;
}
