"use client";

import { MenuIcon, XIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { BrandLockup } from "@/components/shell/brand";
import { ThemeToggle } from "@/components/shell/theme-toggle";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth/auth-provider";
import { cn } from "@/lib/utils";

/**
 * The marketing header.
 *
 * Deliberately not the app shell: no sidebar, no command palette, no org
 * switcher. It shares tokens and primitives with the product so the two read
 * as one thing, but a visitor who has not signed up should not be looking at
 * a workbench chrome they cannot use (M22).
 *
 * ## What is not in this nav
 *
 * Docs and blog. They are part of M22 and are not built yet, and the module's
 * definition of done is explicit that no navigation item may point at a
 * redirect — the previous build pointed `/docs` and `/blog` at existing pages
 * and called it shipped. A nav item that lies is worse than one that is
 * absent, so they arrive with the content, not before it.
 *
 * "Templates" is gone for a different reason: it pointed at
 * `/resources/templates`, which lives in the application, and following it
 * swapped the marketing chrome for the workbench shell mid-browse. Nothing on
 * this site now links into the product except signing up.
 *
 * ## Reading the session here
 *
 * The layout forbids anything under `(marketing)` importing `lib/api`, because
 * these pages must render with the API down. Reading `useAuth` does not breach
 * that: `AuthProvider` is mounted in the *root* layout and already runs on
 * every marketing page, so this adds no dependency the bundle did not have.
 * And its failure mode is the right one — an unreachable API resolves the
 * bootstrap to `anonymous`, which is exactly the signed-out header.
 *
 * A signed-in visitor gets one Dashboard button in place of both CTAs. They
 * are deliberately *not* redirected: `/pricing` is where an upgrade starts and
 * `/features` is what a trialling user reads, so bouncing an authenticated
 * caller out of the marketing site would break the two journeys that matter
 * most to a paying customer.
 *
 * The signed-out CTAs are what the static HTML carries, and `loading` renders
 * them too. Marketing traffic is overwhelmingly signed-out, so the alternative
 * — holding the primary CTA back until hydration resolves — would delay the
 * conversion path for almost everyone to spare a brief swap for a few.
 */

/** Marketing destinations only. */
const LINKS = [
  { href: "/about", label: "About" },
  { href: "/features", label: "Features" },
  { href: "/pricing", label: "Pricing" },
  { href: "/faq", label: "FAQ" },
  { href: "/contact", label: "Contact" },
] as const;

export function MarketingHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const { status } = useAuth();
  const signedIn = status === "authenticated";

  // The menu closes on the link that was tapped rather than by watching the
  // pathname. Same outcome, one less render pass, and no setState inside an
  // effect — which is the pattern the lint rule is there to prevent.
  const close = () => setOpen(false);

  return (
    <header className="sticky top-0 z-40 border-b border-line/70 backdrop-blur-md">
      <div className="absolute inset-0 -z-10 bg-bg/85" />
      <div className="mx-auto flex h-14 w-full max-w-280 items-center justify-between gap-4 px-5">
        <Link href="/" className="rounded-xs focus-visible:outline-2 focus-visible:outline-ember">
          <BrandLockup />
        </Link>

        <nav aria-label="Product" className="hidden items-center gap-1 md:flex">
          {LINKS.map((link) => {
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "rounded-xs px-2.5 py-1.5 text-[13px] transition-colors",
                  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ember",
                  active ? "text-fg" : "text-fg-muted hover:text-fg",
                )}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          {signedIn ? (
            <Button
              asChild
              size="sm"
              className="bg-ember text-ember-fg shadow-none hover:bg-ember-hover"
            >
              <Link href="/dashboard">Dashboard</Link>
            </Button>
          ) : (
            <>
              <Button
                asChild
                variant="ghost"
                size="sm"
                className="hidden text-fg-muted hover:text-fg sm:inline-flex"
              >
                <Link href="/login">Sign in</Link>
              </Button>
              <Button
                asChild
                size="sm"
                className="bg-ember text-ember-fg shadow-none hover:bg-ember-hover"
              >
                <Link href="/signup">Get started</Link>
              </Button>
            </>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="md:hidden"
            aria-expanded={open}
            aria-controls="marketing-menu"
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <XIcon className="size-4" /> : <MenuIcon className="size-4" />}
            <span className="sr-only">{open ? "Close menu" : "Open menu"}</span>
          </Button>
        </div>
      </div>

      {open ? (
        <nav
          id="marketing-menu"
          aria-label="Product"
          className="border-t border-line bg-bg px-5 py-3 md:hidden"
        >
          <ul className="flex flex-col">
            {LINKS.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  onClick={close}
                  className="block rounded-xs px-1 py-2.5 text-[14px] text-fg-muted hover:text-fg"
                >
                  {link.label}
                </Link>
              </li>
            ))}
            <li>
              {signedIn ? (
                <Link
                  href="/dashboard"
                  onClick={close}
                  className="block rounded-xs px-1 py-2.5 text-[14px] text-fg-muted hover:text-fg"
                >
                  Dashboard
                </Link>
              ) : (
                <Link
                  href="/login"
                  onClick={close}
                  className="block rounded-xs px-1 py-2.5 text-[14px] text-fg-muted hover:text-fg sm:hidden"
                >
                  Sign in
                </Link>
              )}
            </li>
          </ul>
        </nav>
      ) : null}
    </header>
  );
}
