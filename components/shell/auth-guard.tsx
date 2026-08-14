"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

import { useAuth } from "@/lib/auth/auth-provider";
import { useSubscription } from "@/lib/api/hooks";
import { isPaymentWall, isPublicContent, requiresAccount } from "@/lib/navigation";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Client-side route protection for the app shell.
 *
 * The edge cannot do this — see the note in `proxy.ts`. What matters for the
 * user is that they never see a flash of app content before being bounced, and
 * a skeleton that matches the real layout achieves that just as well as a
 * server redirect would.
 *
 * This is a UX guard, not a security boundary. Every request is authorised by
 * the API independently; bypassing this component gets you an empty shell and
 * a page of 401s.
 *
 * It guards `requiresAccount` routes only. Guarding the whole shell made the
 * anonymous tier unreachable: the backend hands every caller an anonymous
 * session with 5 runs a day, and the quota dialog's anonymous branch exists to
 * convert them at the point they run out — none of which a visitor can reach
 * from behind a login redirect.
 *
 * The payment wall rides on the same list, for the same reason: a user who
 * chose a paid plan and never paid for it is held at `/checkout` on the
 * account-only surfaces and nowhere else. The tools keep working at the free
 * tier while they decide — a wall across the whole product tells a hesitating
 * buyer that declining costs them everything, which is how they decline.
 */
export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { status } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const gated = requiresAccount(pathname);

  // Only asked for on the routes that could redirect. An anonymous visitor on
  // a tool page has no subscription to fetch and should not be issued a 401
  // for one.
  const authenticated = status === "authenticated";
  const wall = isPaymentWall(pathname);
  const asking = authenticated && gated && !wall;
  const subscription = useSubscription(asking);
  // `enabled: false` does not mean "no data" — react-query still serves
  // whatever the key already holds. On the wall's own routes that cached
  // answer is `payment_required: true`, so a guard that read it without the
  // `!wall` term held a skeleton over the very page it had just redirected to.
  const owesPayment = !wall && subscription.data?.payment_required === true;
  // The answer is not in yet. Distinct from "does not owe": rendering the
  // dashboard on the strength of a query that has not returned means showing
  // it for half a second and then yanking it, which on a slow connection reads
  // as the app having lost the payment.
  //
  // An *errored* query is not undecided, it is unanswerable, and it fails open
  // — the same rule the backend applies to Redis and to the breach check. The
  // wall is a nudge toward a checkout, not a permission; every quota and
  // feature decision is enforced server-side against `user.plan` regardless.
  // Holding the skeleton on an error would turn one failed billing call into a
  // user who cannot reach any of their own work.
  const undecided = asking && subscription.data === undefined && !subscription.isError;

  useEffect(() => {
    if (gated && status === "anonymous") {
      router.replace(`/login?next=${encodeURIComponent(pathname)}`);
      return;
    }
    if (gated && authenticated && owesPayment) {
      router.replace("/checkout");
    }
  }, [gated, status, authenticated, owesPayment, router, pathname]);

  if (!gated) {
    // Public content renders immediately, even while the session is
    // resolving. The server render always sees `loading` — the provider
    // refreshes after mount — so withholding children here means the initial
    // HTML is a skeleton, and on the template library that is the HTML a
    // crawler receives. Nothing on those pages is user-specific, so there is
    // nothing to flicker (M19).
    if (isPublicContent(pathname)) return <>{children}</>;

    // Everywhere else, wait out `loading`: rendering as anonymous and then
    // re-rendering as signed-in makes the quota strip and history feed flicker.
    return status === "loading" ? <ShellSkeleton /> : <>{children}</>;
  }

  if (authenticated && !undecided && !owesPayment) return <>{children}</>;

  return <ShellSkeleton />;
}

function ShellSkeleton() {
  return (
    <div className="flex animate-in flex-col gap-5 duration-200 fade-in-0">
      <div className="flex items-end justify-between gap-4">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-8 w-52" />
          <Skeleton className="h-4 w-80" />
        </div>
        <Skeleton className="h-8 w-28" />
      </div>

      <div className="grid divide-line overflow-hidden rounded-md border border-line bg-surface sm:grid-cols-4 sm:divide-x">
        {[0, 1, 2, 3].map((index) => (
          <div key={index} className="flex flex-col gap-2 px-4 py-3.5">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-6 w-16" />
          </div>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <Skeleton className="h-64 rounded-md" />
        <Skeleton className="h-64 rounded-md" />
      </div>
    </div>
  );
}

/**
 * The mirror image, for `/login` and `/signup`: a signed-in user has no reason
 * to see them.
 */
export function GuestOnly({ children }: { children: React.ReactNode }) {
  const { status } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (status === "authenticated") router.replace("/dashboard");
  }, [status, router]);

  if (status === "authenticated") return null;
  return <>{children}</>;
}
