import type { Metadata } from "next";

import { ProgressRail } from "@/components/home/fx/scroll";
import { CatalogBand } from "@/components/home/sections/band";
import { Evidence } from "@/components/home/sections/evidence";
import { Faq } from "@/components/home/sections/faq";
import { Hero } from "@/components/home/sections/hero";
import { Method } from "@/components/home/sections/method";
import { Metrics } from "@/components/home/sections/metrics";
import { Premise, Problem } from "@/components/home/sections/problem";
import { Pricing } from "@/components/home/sections/pricing";
import { Principles } from "@/components/home/sections/principles";
import { Workflows } from "@/components/home/sections/workflows";
import { getCatalogStats, getPlansStatic } from "@/lib/marketing/data";

/**
 * The home page.
 *
 * ## Copy accuracy
 *
 * Every claim here was checked against the implementation before it shipped,
 * which is Q-02 and the single most important constraint on this page. The
 * previous build's site claimed 200+ tools against a catalog of 80, "50,000+
 * AI developers" against no users, a "$100M+ in cost savings identified"
 * figure nobody could source, three testimonials from people who do not exist,
 * a trust badge naming five companies that have never used the product, and
 * LLM synthesis over a rule engine that never called a model. None of that is
 * here, and none of it comes back without something real behind it.
 *
 * What stands in for social proof is the catalog itself: counts read live from
 * `/catalog/stats`, and the verification date the product already stamps on
 * every price. That is the honest version of the same claim. The band under
 * the hero names what is *in* that catalog for the same reason there is no
 * logo wall — names set as text say the coverage is broad and specific;
 * redrawn vendor marks would say those vendors endorse this, and none of them
 * do.
 *
 * ## Structure
 *
 * Eight numbered chapters between a hero and a footer, alternating bone and
 * ink grounds so a reader always knows they have moved. The argument is
 * unchanged from the page this replaces — premise, problem, method, evidence,
 * surfaces, defence, price, objections — because the argument was the part
 * that was right.
 *
 * What is new is that the page is now built as a designed artifact rather than
 * as a stack of cards: its own route group, its own fixed bone-and-ink
 * palette, its own display scale, smooth scroll, a pinned horizontal chapter,
 * a pointer-driven cursor, and a switcher the reader actually operates. See
 * `app/(home)/layout.tsx` for why this is a separate route group from
 * `(marketing)`, and `app/(home)/home.css` for why the palette does not follow
 * the theme toggle.
 *
 * ## Three rules held throughout
 *
 * Each one rules out an effect that would have looked better in a screenshot:
 *
 *   - **No content is revealed by animation.** Every reveal is opacity and
 *     transform over content already in the DOM. A reader with JavaScript off,
 *     a crawler, and anyone with `prefers-reduced-motion` gets the complete
 *     page — including every figure, because the counters server-render at
 *     their final values and count up only as decoration.
 *   - **Motion is never the only affordance.** The cursor draws around the
 *     native pointer rather than replacing it, hover previews decorate a list
 *     that already reads as text, and the tab switcher works from the keyboard
 *     before it works from a pointer.
 *   - **Scroll is borrowed, never taken.** The smooth scrolling is two frames
 *     of easing, not a glide, and it is off entirely under reduced motion. The
 *     one pinned section lasts exactly as long as its content has travel, so
 *     the reader is never held on a screen that has stopped moving.
 *
 * ## Why the page is a server component with client sections
 *
 * The two reads below must happen on the server — they are what makes the
 * counts live rather than written down — and both fail soft: the catalog to a
 * checked-in snapshot, the plans to `null`. The marketing surface must render
 * with the API down. Everything after the data is presentation, so the client
 * boundary sits at the section and the figures cross it as plain numbers.
 */

export const revalidate = 3600;

export const metadata: Metadata = {
  // `absolute`, so the root layout's "%s · Buildtact" template is not applied
  // on top: this title already opens with the name, and the tab read it twice.
  title: { absolute: "Buildtact: plan, cost, and compare your AI stack before you build" },
  description:
    "An engineering workbench for AI systems. Cost a stack, compare the options, size the infrastructure, and leave with the architecture document, before writing code.",
  alternates: { canonical: "/" },
};

const CHAPTERS = [
  "The premise",
  "What goes wrong",
  "The method",
  "The evidence",
  "The workflows",
  "Defended",
  "The price",
  "Questions",
];

export default async function Page() {
  const [catalog, plans] = await Promise.all([getCatalogStats(), getPlansStatic()]);

  const verified = new Date(catalog.oldest_verification ?? "2026-06-24").toLocaleDateString(
    "en-GB",
    { day: "numeric", month: "long", year: "numeric" },
  );
  const pairs = catalog.compatibility_pairs.toLocaleString("en-GB");

  return (
    <>
      <ProgressRail chapters={CHAPTERS} />

      <Hero />

      <Metrics
        models={catalog.models}
        tools={catalog.tools}
        gpus={catalog.gpus}
        pairs={catalog.compatibility_pairs}
      />

      <CatalogBand verified={verified} />

      <Premise />
      <Problem />
      <Method pairs={pairs} />
      <Evidence />
      <Workflows />
      <Principles pairs={pairs} verified={verified} />
      <Pricing plans={plans} />
      <Faq />
    </>
  );
}
