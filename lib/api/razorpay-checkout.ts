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
 * It never decides that a payment succeeded. `callback_url` sends the browser
 * to `/checkout/done`, which polls until the webhook has actually granted the
 * plan. Checkout's own success signal is a cue to start asking, nothing more —
 * the query parameters Razorpay appends are unauthenticated and never read as
 * proof.
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
  { email, name, onDismiss }: { email?: string; name?: string; onDismiss?: () => void } = {},
): Promise<void> {
  await loadCheckout();

  const Razorpay = window.Razorpay;
  if (!Razorpay) throw new Error("Razorpay Checkout failed to load.");

  new Razorpay({
    key: handle.key_id,
    subscription_id: handle.subscription_id,
    name: "StackForge",
    description: "Subscription",
    // `redirect: true` makes Checkout navigate to `callback_url` itself rather
    // than calling a handler. One outcome path instead of two, and it survives
    // the bank pages a UPI or 3-D Secure mandate goes through, which a
    // callback closured in this tab does not.
    callback_url: `${window.location.origin}/checkout/done`,
    redirect: true,
    prefill: { email, name },
    theme: { color: "#d2601a" },
    modal: { ondismiss: onDismiss },
  }).open();
}
