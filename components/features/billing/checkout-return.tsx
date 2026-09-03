"use client";

import { CheckCircle2Icon, Loader2Icon, RefreshCwIcon } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { Panel, PanelBody } from "@/components/forge/panel";
import { Button } from "@/components/ui/button";
import { getSubscription, reconcileSubscription } from "@/lib/api/billing";
import { useAuth } from "@/lib/auth/auth-provider";

/** How long to keep asking before handing the user a button instead. */
const GIVE_UP_MS = 25_000;
const POLL_MS = 1_500;
/** Ask Razorpay directly on the first attempt, then every seventh — roughly
 *  every ten seconds. The local read is free; the reconcile is two calls to a
 *  payment provider and does not belong on a 1.5-second timer. */
const RECONCILE_EVERY = 7;

const RANK: Record<string, number> = { free: 0, pro: 1, team: 2, enterprise: 3 };

/**
 * Where Razorpay sends the browser back to.
 *
 * This page exists because the redirect and the webhook are a race, and the
 * redirect usually wins. Razorpay hands the browser back the instant the
 * mandate is authorized; the `subscription.activated` delivery that grants the
 * plan arrives a moment later.
 *
 * ## What it waits for
 *
 * The plan named in `?plan=`, reached or beaten. It used to wait for
 * `payment_required` to go false, which is a different question — "does this
 * account owe money" — and one that is *already* false for someone upgrading
 * from Pro to Team. So an upgrade that never landed looked exactly like one
 * that worked: the page forwarded to the dashboard, and the account stayed on
 * the plan it had. That is the failure this rewrite is for.
 *
 * ## What it does when nothing arrives
 *
 * Asks Razorpay. The webhook is still the only thing that grants a plan, but
 * `reconcileSubscription` pulls the subscription and runs it through the same
 * handler, so a delivery that was lost — or that was never going to arrive,
 * which is every local environment without a tunnel — stops being permanent.
 * The success redirect is never treated as proof of payment; it is only the
 * cue to start asking.
 *
 * ## What it retires once the plan lands
 *
 * Everything, and the signed-in user besides. See `settle`.
 */
export function CheckoutReturn() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { refreshUser } = useAuth();
  const params = useSearchParams();
  const target = params.get("plan");
  const [slow, setSlow] = useState(false);
  const [checking, setChecking] = useState(false);
  const attempt = useRef(0);

  /** Has the thing we were buying actually arrived? */
  const landed = useCallback(
    (plan: string, paymentRequired: boolean) => {
      if (!target) return !paymentRequired;
      return (RANK[plan] ?? 0) >= (RANK[target] ?? 0);
    },
    [target],
  );

  const settle = useCallback(async () => {
    // `user.plan` is held in the auth provider's state rather than the query
    // cache, and the account menu reads it from there. Invalidating queries
    // does not touch it, so the plan came back right everywhere the cache
    // reached and wrong in the one place it did not — until a full reload.
    await refreshUser();

    // Then everything, rather than the billing keys this used to name. The
    // plan is an input to quota, feature gates, the dashboard aggregate, which
    // export formats are offered and whether a premium template body comes
    // back; the default `staleTime` is thirty seconds and a checkout takes
    // less than that, so a curated list that misses one serves the
    // pre-upgrade answer on the very page the user is being sent to. Same
    // argument `switchOrg` makes: refetching the world is cheaper than a list
    // that has to be kept complete.
    await queryClient.invalidateQueries();

    router.replace("/dashboard");
  }, [refreshUser, queryClient, router]);

  const checkNow = useCallback(async () => {
    setChecking(true);
    try {
      const summary = await reconcileSubscription();
      if (landed(summary.plan, summary.payment_required)) {
        await settle();
        return true;
      }
    } catch {
      // Reconciling is best-effort. The honest end state is the button, not a
      // toast about a repair the user never asked for.
    } finally {
      setChecking(false);
    }
    return false;
  }, [landed, settle]);

  useEffect(() => {
    let cancelled = false;
    const started = Date.now();

    async function poll() {
      if (cancelled) return;
      const nth = attempt.current++;

      try {
        // Pull from Razorpay on the first tick and periodically after it; read
        // locally in between. The first tick matters most — in an environment
        // with no webhook delivery at all, it is the only thing that will ever
        // move the plan.
        const summary =
          nth % RECONCILE_EVERY === 0 ? await reconcileSubscription() : await getSubscription();
        if (cancelled) return;
        if (landed(summary.plan, summary.payment_required)) {
          await settle();
          return;
        }
      } catch {
        // A transient failure here is not worth a toast — the next tick
        // retries, and the give-up branch is the honest end state.
      }

      if (Date.now() - started > GIVE_UP_MS) {
        setSlow(true);
        return;
      }
      window.setTimeout(poll, POLL_MS);
    }

    void poll();
    return () => {
      cancelled = true;
    };
  }, [landed, settle]);

  return (
    <div className="mx-auto flex w-full max-w-[460px] flex-col pt-8">
      <Panel>
        <PanelBody className="flex flex-col items-center gap-3 py-8 text-center">
          {slow ? (
            <>
              <span className="flex size-10 items-center justify-center rounded-full bg-surface-3 text-fg-muted">
                <CheckCircle2Icon className="size-5" aria-hidden />
              </span>
              <h1 className="text-[15px] font-semibold text-fg">Payment received</h1>
              <p className="max-w-[38ch] text-[12.5px] leading-relaxed text-pretty text-fg-muted">
                Your payment went through, but Razorpay has not confirmed it to us yet. Nothing is
                lost. Check again now, or leave it — the plan switches over on its own once the
                confirmation lands.
              </p>
              <div className="mt-1 flex flex-wrap items-center justify-center gap-2">
                <Button size="sm" onClick={() => void checkNow()} disabled={checking}>
                  {checking ? (
                    <Loader2Icon className="size-3.5 animate-spin" aria-hidden />
                  ) : (
                    <RefreshCwIcon className="size-3.5" aria-hidden />
                  )}
                  Check again
                </Button>
                <Button asChild size="sm" variant="outline">
                  <Link href="/settings/billing">Billing settings</Link>
                </Button>
              </div>
            </>
          ) : (
            <>
              <Loader2Icon className="size-6 animate-spin text-ember" aria-hidden />
              <h1 className="text-[15px] font-semibold text-fg">Confirming your payment</h1>
              <p className="max-w-[38ch] text-[12.5px] leading-relaxed text-pretty text-fg-muted">
                Waiting for Razorpay to confirm the payment. This usually takes a moment.
              </p>
            </>
          )}
        </PanelBody>
      </Panel>
    </div>
  );
}
