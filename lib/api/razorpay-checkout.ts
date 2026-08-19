/**
 * Opening Razorpay Checkout.
 *
 * ## Why a script and not a redirect
 *
 * A Razorpay subscription carries a `short_url` to a hosted authorization page,
 * and redirecting to it is the obvious shape — it is what this did first. That
 * page is a dead end: the Create Subscription API accepts no `callback_url`, so
 * a customer authorizes the mandate and then stays on Razorpay, while the app
 * goes on believing they never paid. Checkout is the only flow that takes a
 * callback, so authorization happens in a modal over our own page (D-52).
 *
 * ## What it does not do
 *
 * It never decides that a payment succeeded. `callback_url` posts to a route
 * that redirects to `/checkout/done`, which polls until the webhook has granted the
 * plan. Checkout's own success signal is a cue to start asking, nothing more —
 * Razorpay's posted fields are unauthenticated and never read as proof.
 */

const SCRIPT_SRC = "https://checkout.razorpay.com/v1/checkout.js";

interface RazorpayOptions {
  key: string;
  subscription_id: string;
  name: string;
  description: string;
  callback_url: string;
  redirect: boolean;
  prefill?: { email?: string; name?: string };
  theme?: { color?: string };
  modal?: { ondismiss?: () => void };
}

interface RazorpayInstance {
  open: () => void;
}

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayOptions) => RazorpayInstance;
  }
}

/**
 * Load Checkout once per document.
 *
 * Cached on the promise rather than on a boolean: two buttons clicked in quick
 * succession would otherwise both see "not loaded yet" and append a second
 * script tag, and Razorpay redefines `window.Razorpay` when it runs twice.
 */
let loading: Promise<void> | null = null;

function loadCheckout(): Promise<void> {
  if (window.Razorpay) return Promise.resolve();
  if (loading) return loading;

  loading = new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = SCRIPT_SRC;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => {
      // Let the next attempt retry rather than caching the failure forever —
      // this is usually a blocked request or a dropped connection, not a
      // permanent state.
      loading = null;
      reject(new Error("Razorpay Checkout failed to load."));
    };
    document.head.appendChild(script);
  });

  return loading;
}

export interface CheckoutHandle {
  subscription_id: string;
  key_id: string;
}

/**
 * Open the mandate authorization modal.
 *
 * Resolves once the modal is open, not once it is paid — the outcome arrives
 * as a navigation to `callback_url`, or as `onDismiss` if the customer closes
 * it. A caller that awaited a payment result here would wait forever.
 */
export async function openCheckout(
  handle: CheckoutHandle,
  {
    plan,
    email,
    name,
    onDismiss,
  }: { plan?: string; email?: string; name?: string; onDismiss?: () => void } = {},
): Promise<void> {
  await loadCheckout();

  const Razorpay = window.Razorpay;
  if (!Razorpay) throw new Error("Razorpay Checkout failed to load.");

  new Razorpay({
    key: handle.key_id,
    subscription_id: handle.subscription_id,
    name: "StackForge",
    description: "Subscription",
    // Razorpay sends this as a POST, so it must not target the GET-only page
    // that renders the confirmation UI. The callback route turns it into a
    // GET and deliberately ignores its untrusted form fields.
    // The plan rides along so the return page can check that *this* purchase
    // landed. Without it the page could only ask "does this account owe money",
    // which is already false for someone upgrading from one paid plan to
    // another — so an upgrade that silently failed looked identical to one
    // that worked.
    callback_url: plan
      ? `${window.location.origin}/checkout/callback?plan=${encodeURIComponent(plan)}`
      : `${window.location.origin}/checkout/callback`,
    redirect: true,
    prefill: { email, name },
    theme: { color: "#d2601a" },
    modal: { ondismiss: onDismiss },
  }).open();
}
