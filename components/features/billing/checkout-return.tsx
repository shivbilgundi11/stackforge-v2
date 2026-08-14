"use client";

import { CheckCircle2Icon, Loader2Icon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { Panel, PanelBody } from "@/components/forge/panel";
import { Button } from "@/components/ui/button";
import { getSubscription } from "@/lib/api/billing";
import { qk } from "@/lib/api/query-keys";

/** How long to wait for the webhook before offering a way out. Razorpay is
 *  usually inside a few seconds; this is the ceiling before the screen stops
 *  pretending it knows what is happening. */
const GIVE_UP_MS = 20_000;
const POLL_MS = 1_500;

/**
 * Where Razorpay sends the browser back to.
 *
 * This page exists because the redirect and the webhook are a race, and the
 * redirect usually wins. Razorpay hands the browser back the instant the
 * mandate is authorized; the `subscription.activated` delivery that grants the
 * plan arrives a moment later. Landing straight on `/dashboard` in that gap
 * means the app still believes the account is unpaid and bounces it back to
 * the wall — the user pays and is immediately asked to pay again.
 *
 * So: poll the summary until it stops saying payment is required, then
 * forward. The success redirect is never treated as proof of payment; it is
 * only the cue to start asking. The webhook remains the only thing that can
 * change a plan.
 */
export function CheckoutReturn() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [slow, setSlow] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const started = Date.now();

    async function poll() {
      if (cancelled) return;
      try {
        const summary = await getSubscription();
        if (cancelled) return;
        if (!summary.payment_required) {
          // Everything downstream reads the plan; none of it should keep a
          // cached copy from before the upgrade.
          await queryClient.invalidateQueries({ queryKey: qk.billing.all() });
          router.replace("/dashboard");
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
  }, [router, queryClient]);

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
                Your payment went through, but the confirmation from Razorpay is taking longer than
                usual to reach us. Nothing is lost — your plan will switch over on its own, normally
                within a few minutes.
              </p>
              <Button asChild size="sm" variant="outline" className="mt-1">
                <Link href="/settings/billing">Check billing settings</Link>
              </Button>
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
