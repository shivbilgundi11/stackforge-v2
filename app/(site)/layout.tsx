import { Geist, Geist_Mono } from "next/font/google";

import { HomeFooter } from "@/components/home/chrome/footer";
import { HomeNav } from "@/components/home/chrome/nav";
import { Preloader } from "@/components/home/chrome/preloader";
import { SmoothScroll } from "@/components/home/fx/scroll";
import { Cursor } from "@/components/home/fx/ui";

import "./home.css";

/**
 * The shell for the designed surface: `/`, `/about` and `/features`.
 *
 * ## Why these three are their own route group
 *
 * They are the pages whose job is the argument. They carry a fixed
 * bone-and-ink palette that ignores the theme toggle, a display scale four
 * times larger than anything in the product, smooth scroll, scroll-linked
 * motion and a pointer-driven cursor.
 *
 * `(marketting)` keeps the rest — `/pricing`, `/faq`, `/contact` and the legal
 * pages — as one column of prose in the product's own type and colour, sharing
 * a header, a footer and a design system with the workbench. That is the right
 * treatment for a table of plan limits or a privacy policy, and none of the
 * above belongs on either. Bolting a conditional onto one layout to switch
 * between two entire design systems by pathname would be worse than two
 * layouts.
 *
 * The group was called `(home)` when only `/` lived here. Route groups do not
 * affect the URL, so the rename moved nothing: `(site)/page.tsx` still serves
 * `/`, `(site)/about/page.tsx` serves `/about`, and the `(marketting)` routes
 * are untouched.
 *
 * ## What is page-specific, and what is not
 *
 * The nav, the footer, the cursor and the scroll engine are shared by all
 * three. The `Preloader` is not: it checks the pathname and runs on `/` only,
 * because a curtain in front of a page somebody navigated to deliberately is
 * an obstacle rather than an entrance. `ProgressRail` is likewise per-page —
 * each page passes its own chapter list.
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
