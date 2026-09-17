import { Geist, Geist_Mono } from "next/font/google";

import { HomeFooter } from "@/components/home/chrome/footer";
import { HomeNav } from "@/components/home/chrome/nav";
import { Preloader } from "@/components/home/chrome/preloader";
import { SmoothScroll } from "@/components/home/fx/scroll";
import { Cursor } from "@/components/home/fx/ui";

import "./home.css";

/**
 * The shell for the whole marketing site: `/`, `/features`, `/pricing`,
 * `/faq`, `/about`, `/contact` and the legal pages.
 *
 * ## Why the marketing site is one group and not two
 *
 * It was two. This group held the three pages whose job is the argument, and a
 * `(marketting)` group held the rest — `/pricing`, `/faq`, `/contact` and the
 * legal pages — as one column of prose in the product's own type and colour.
 * The reasoning was that a table of plan limits or a privacy policy does not
 * want a display scale four times larger than anything in the workbench.
 *
 * That was true of the *type*, and false of everything else. What it actually
 * produced was a visitor crossing a design-system boundary in the middle of
 * one site: the nav changed, the palette changed, the cursor disappeared, and
 * the page they were sent to in order to close the sale looked like it
 * belonged to different software. A pricing page is not a legal appendix — it
 * is the last page of the argument.
 *
 * So the split moved down a level. All of it renders in the bone-and-ink
 * palette that ignores the theme toggle, with the smooth scroll, the
 * scroll-linked motion and the pointer-driven cursor; the pages that are prose
 * rather than argument get a narrower measure and a quieter scale from
 * `sections/prose.tsx` and `sections/legal.tsx` instead of a second shell.
 *
 * The group was called `(home)` when only `/` lived here. Route groups do not
 * affect the URL, so neither the rename nor the merge moved anything:
 * `(site)/page.tsx` still serves `/`, `(site)/pricing/page.tsx` still serves
 * `/pricing`.
 *
 * ## What is page-specific, and what is not
 *
 * The nav, the footer, the cursor and the scroll engine are shared by every
 * page here. The `Preloader` is not: it checks the pathname and runs on `/`
 * only, because a curtain in front of a page somebody navigated to
 * deliberately is an obstacle rather than an entrance. `ProgressRail` is
 * likewise per-page — each page passes its own chapter list, and the short
 * ones pass none.
 *
 * ## The fonts are declared here, not in the root layout
 *
 * `next/font` works in any layout, and these two faces are used by exactly
 * this group. Declaring them at the root would add two more preloaded families
 * to the workbench, which already ships four and uses none of these.
 */

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist",
  display: "swap",
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
  display: "swap",
});

export default function HomeLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`home ${geist.variable} ${geistMono.variable}`}>
      {/* Order matters: the curtain is above everything, the cursor is above
          the content but below the curtain, and the smooth-scroll driver wraps
          the lot because it owns the only animation clock on the page. */}
      <Preloader />
      <Cursor />

      <SmoothScroll>
        <HomeNav />
        <main id="content">{children}</main>
        <HomeFooter />
      </SmoothScroll>
    </div>
  );
}
