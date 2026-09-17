"use client";

import * as React from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";

import { useReducedMotion } from "@/components/home/fx/use-client-fact";

import { EASE } from "@/components/home/fx/type";
import { Magnetic } from "@/components/home/fx/ui";
import { useAuth } from "@/lib/auth/auth-provider";
import { cn } from "@/lib/utils";

/**
 * The navigation for the whole public surface.
 *
 * ## It replaced `MarketingHeader`, which is gone
 *
 * That header was a solid bar in the product's token palette — a hairline
 * under it, five links and two buttons — and it was correct while `/pricing`,
 * `/about` and the legal pages were console-styled documents. Dropped onto
 * this design it reads as a strip of the console sitting across the top of an
 * editorial layout, in the wrong typeface and the wrong colours, and it puts a
 * hard horizontal edge across a hero whose type deliberately runs into the
 * corners.
 *
 * Every public page now lives in `(site)` and uses this instead, so there is
 * one header again rather than two. The old one was deleted with the group it
 * served; `git log` has it if the argument ever needs revisiting.
 *
 * ## Behaviour
 *
 * It floats over the hero with no background, then hides on a downward scroll
 * and returns on an upward one — the reader gets the full frame while reading
 * and the nav back the moment they look for it. It re-pins itself solid once
 * it is past the hero so the links never sit on top of moving content.
 *
 * Reading the session here does not breach the "no `lib/api` on marketing"
 * rule for the same reason the shared header does not: `AuthProvider` is
 * mounted in the *root* layout and already runs on every page, so this adds no
 * dependency the bundle did not have, and its failure mode is the right one —
 * an unreachable API resolves to `signed-out`, which is the signed-out nav.
 */

const LINKS = [
  { href: "/features", label: "Features" },
  { href: "/pricing", label: "Pricing" },
  { href: "/about", label: "About" },
  { href: "/faq", label: "FAQ" },
  { href: "/contact", label: "Contact" },
] as const;

export function HomeNav() {
  const reduced = useReducedMotion();
  const { status } = useAuth();
  const signedIn = status === "authenticated";

  const [hidden, setHidden] = React.useState(false);
  const [solid, setSolid] = React.useState(false);
  const [menu, setMenu] = React.useState(false);

  React.useEffect(() => {
    let last = window.scrollY;

    const onScroll = () => {
      const y = window.scrollY;
      // The 12px deadband stops a trackpad's jitter from flickering the bar.
      if (Math.abs(y - last) > 12) {
        setHidden(y > last && y > 240);
        last = y;
      }
      setSolid(y > window.innerHeight * 0.85);
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // The overlay traps the page behind it; leaving the page scrollable under an
  // open full-screen menu is the classic version of this bug.
  React.useEffect(() => {
    document.documentElement.style.overflow = menu ? "hidden" : "";
    return () => {
      document.documentElement.style.overflow = "";
    };
  }, [menu]);

  return (
    <>
      <motion.header
        initial={false}
        animate={{ y: hidden && !menu ? "-110%" : "0%" }}
        transition={{ duration: reduced ? 0 : 0.55, ease: EASE }}
        // The bar sits *above* the menu it opens, so that the close control
        // stays where the open control was. That means it also keeps the
        // page's palette while an ink panel slides up underneath it — and on
        // the bone pages that palette is near-black text, which is the menu's
        // own background colour. The wordmark and both bars of the close
        // button were being drawn in #121210 on #121210: not dimmed, exactly
        // invisible, with no visible way to shut the menu again.
        //
        // Taking the chapter with it flips the whole bar to the ink palette,
        // so its contents are bone and its ground matches the panel below —
        // the two read as one surface rather than as a hole in the top of it.
        data-chapter={menu ? "ink" : undefined}
        className={cn(
          "fixed inset-x-0 top-0 z-[60] transition-colors duration-500",
          solid && !menu && "bg-[var(--h-ground)]/80 backdrop-blur-xl",
        )}
      >
        <div
          className={cn(
            "mx-auto flex h-18 w-full max-w-[110rem] items-center justify-between gap-6 px-5 transition-colors duration-500 sm:px-8",
            solid && !menu && "border-b border-[var(--h-line)]",
          )}
        >
          <Link href="/" aria-label="AIVeda home" className="group flex items-center gap-2.5">
            <Wordmark />
          </Link>

          <nav aria-label="Main" className="hidden items-center gap-9 lg:flex">
            {LINKS.map((link) => (
              <Link key={link.href} href={link.href} className="u-link t-mono text-[10px]">
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            {signedIn ? (
              <Magnetic strength={10}>
                <Link href="/dashboard" className="btn btn-acc t-mono px-5 py-3 text-[10px]">
                  Dashboard
                </Link>
              </Magnetic>
            ) : (
              <>
                <Link href="/login" className="u-link t-mono hidden text-[10px] sm:inline-block">
                  Sign in
                </Link>
                <Magnetic strength={10}>
                  <Link
                    href="/signup"
                    data-cursor="Start"
                    className="btn btn-acc t-mono px-5 py-3 text-[10px]"
                  >
                    Get started
                  </Link>
                </Magnetic>
              </>
            )}

            <button
              type="button"
              onClick={() => setMenu((v) => !v)}
              aria-expanded={menu}
              aria-controls="home-menu"
              className="ml-1 flex size-10 flex-col items-center justify-center gap-[5px] lg:hidden"
            >
              <span className="sr-only">{menu ? "Close menu" : "Open menu"}</span>
              <span
                className={cn(
                  "block h-px w-5 bg-current transition-transform duration-300",
                  menu && "translate-y-[3px] rotate-45",
                )}
              />
              <span
                className={cn(
                  "block h-px w-5 bg-current transition-transform duration-300",
                  menu && "-translate-y-[3px] -rotate-45",
                )}
              />
            </button>
          </div>
        </div>
      </motion.header>

      <AnimatePresence>
        {menu ? (
          <motion.div
            id="home-menu"
            data-chapter="ink"
            initial={{ clipPath: "inset(0 0 100% 0)" }}
            animate={{ clipPath: "inset(0 0 0% 0)" }}
            exit={{ clipPath: "inset(0 0 100% 0)" }}
            transition={{ duration: reduced ? 0 : 0.7, ease: EASE }}
            className="fixed inset-0 z-[55] flex flex-col justify-end px-5 pt-24 pb-10 sm:px-8 lg:hidden"
          >
            <nav aria-label="Main">
              <ul className="flex flex-col">
                {LINKS.map((link, i) => (
                  <li key={link.href} className="overflow-hidden border-t border-[var(--h-line)]">
                    <motion.div
                      initial={{ y: "100%" }}
                      animate={{ y: "0%" }}
                      transition={{
                        duration: reduced ? 0 : 0.7,
                        delay: reduced ? 0 : 0.12 + i * 0.05,
                        ease: EASE,
                      }}
                    >
                      <Link
                        href={link.href}
                        onClick={() => setMenu(false)}
                        className="t-head flex items-baseline gap-4 py-5 text-[clamp(2rem,9vw,3.2rem)]"
                      >
                        <span className="t-mono text-[10px] text-[var(--h-fg-45)]">
                          {String(i + 1).padStart(2, "0")}
                        </span>
                        {link.label}
                      </Link>
                    </motion.div>
                  </li>
                ))}
              </ul>
            </nav>

            <div className="mt-10 flex items-center justify-between border-t border-[var(--h-line)] pt-6">
              <span className="t-mono text-[var(--h-fg-45)]">Free tier · no card</span>
              <Link
                href="/signup"
                onClick={() => setMenu(false)}
                className="btn btn-acc t-mono text-[10px]"
              >
                Get started
              </Link>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}

/**
 * The wordmark.
 *
 * Two stacked copies inside a clipping box: the top one lifts out and the
 * lower one arrives in its place on hover. It costs one extra text node and it
 * is the difference between a logo and a logo that responds.
 */
export function Wordmark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "relative block h-[1.15em] overflow-hidden text-[17px] leading-[1.15] font-semibold tracking-[-0.04em]",
        className,
      )}
    >
      <span className="block transition-transform duration-500 ease-(--h-ease) group-hover:-translate-y-full">
        AIVeda
      </span>
      <span
        aria-hidden
        className="absolute inset-x-0 top-full block text-[var(--h-acc)] transition-transform duration-500 ease-(--h-ease) group-hover:-translate-y-full"
      >
        AIVeda
      </span>
    </span>
  );
}
