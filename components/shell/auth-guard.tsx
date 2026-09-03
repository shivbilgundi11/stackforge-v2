"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

import { useAuth } from "@/lib/auth/auth-provider";
import { useSubscription } from "@/lib/api/hooks";
import { isPaymentWall } from "@/lib/navigation";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * The app shell is account-only. Every route under `(app)` — the dashboard,
 * every tool, the hubs, the template library — requires a session, and a
 * visitor without one is sent to `/login?next=…`.
 *
 * This wraps the *whole* shell, sidebar and header included, not just the page
 * body. Guarding only the body left a signed-out visitor looking at a complete
 * navigation tree whose every link bounced them to login, which reads as a
 * broken app rather than a closed door.
 *
 * The edge cannot do this — see the note in `proxy.ts`. What matters for the
 * user is that they never see a flash of app content before being bounced, and
 * a skeleton shaped like the real layout achieves that just as well as a
 * server redirect would.
 *
 * This is a UX guard, not a security boundary. Every request is authorised by
 * the API independently; bypassing this component gets you an empty shell and
 * a page of 401s.
 *
 * The payment wall rides along: an account that chose a paid plan and never
 * paid for it is held at `/checkout` everywhere except the wall's own routes.
 */
export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { status } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const authenticated = status === "authenticated";
  const wall = isPaymentWall(pathname);
  // Not asked for on the wall's own routes: the answer is what sent the user
  // there, and asking again only invites the loop guarded against below.
  const asking = authenticated && !wall;
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
    if (status === "signed-out") {
      router.replace(`/login?next=${encodeURIComponent(pathname)}`);
      return;
    }
    if (authenticated && owesPayment) {
      router.replace("/checkout");
    }
  }, [status, authenticated, owesPayment, router, pathname]);

  if (authenticated && !undecided && !owesPayment) return <>{children}</>;

  return <ShellSkeleton />;
}

/**
 * Shaped like the shell it stands in for — a sidebar rail, a header bar, and a
 * page body — because this now covers the chrome as well as the content. A
 * bare content skeleton on a blank page was a visibly different layout, and
 * swapping one for the other on every cold load is the flash this exists to
 * prevent.
 */
function ShellSkeleton() {
  return (
    <div className="flex min-h-svh w-full animate-in duration-200 fade-in-0">
      <div className="hidden w-64 shrink-0 flex-col gap-6 border-r border-line bg-surface px-3 py-4 md:flex">
        <Skeleton className="h-8 w-36" />
        <div className="flex flex-col gap-2">
          {[0, 1, 2, 3, 4, 5, 6].map((index) => (
            <Skeleton key={index} className="h-7 w-full" />
          ))}
        </div>
      </div>

      <div className="flex min-w-0 flex-1 flex-col bg-bg">
        <div className="flex h-14 items-center justify-between gap-4 border-b border-line px-4 sm:px-6">
          <Skeleton className="h-5 w-44" />
          <Skeleton className="h-8 w-8 rounded-full" />
        </div>

        <main className="flex-1 px-4 py-5 sm:px-6 sm:py-6">
          <div className="mx-auto flex w-full max-w-360 flex-col gap-5">
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
        </main>
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
