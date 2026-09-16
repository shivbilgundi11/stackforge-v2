import { Geist, Geist_Mono } from "next/font/google";

import { HomeFooter } from "@/components/home/chrome/footer";
import { HomeNav } from "@/components/home/chrome/nav";
import { Preloader } from "@/components/home/chrome/preloader";
import { SmoothScroll } from "@/components/home/fx/scroll";
import { Cursor } from "@/components/home/fx/ui";

import "./home.css";

/**
 * The home page's own shell.
 *
 * ## Why the home page is its own route group
 *
 * `(marketing)` is a coherent surface — `/about`, `/pricing`, `/faq` and the
 * legal pages are one column of prose in the product's own type and colour,
 * sharing a header, a footer and a design system with the workbench. That is
 * the right treatment for pages a visitor reads *after* they are interested.
 *
 * The home page has a different job and now has a different design to do it
 * with: a fixed bone-and-ink palette, a display scale four times larger than
 * anything in the product, smooth scroll, a pinned horizontal chapter and a
 * pointer-driven cursor. None of that belongs on the privacy policy, and
 * bolting a conditional onto the marketing layout to switch between two entire
 * design systems by pathname would be worse than two layouts.
 *
 * Route groups do not affect the URL, so `(home)/page.tsx` serves `/` and
 * every other marketing route is untouched by any of this.
 *
 * ## The fonts are declared here, not in the root layout
 *
 * `next/font` works in any layout, and these two faces are used by exactly one
 * page. Declaring them at the root would add two more preloaded families to
 * the workbench, which already ships four and uses none of these.
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
