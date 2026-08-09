"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

import { useAuth } from "@/lib/auth/auth-provider";
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
 */
export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { status } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (status === "anonymous") {
      router.replace(`/login?next=${encodeURIComponent(pathname)}`);
    }
  }, [status, router, pathname]);

  if (status === "authenticated") return <>{children}</>;

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
