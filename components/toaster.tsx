"use client";

import { Toaster as HotToaster, ToastBar, toast } from "react-hot-toast";
import { CheckIcon, InfoIcon, TriangleAlertIcon, XIcon } from "lucide-react";

/**
 * react-hot-toast, restyled onto the design tokens.
 *
 * The library's defaults are a white pill with a drop shadow, which reads as a
 * different product from the rest of the app. This wraps every toast in a
 * hairline-bounded panel and swaps the icon set for lucide so a toast looks
 * like the surface it interrupted.
 */
export function Toaster() {
  return (
    <HotToaster
      position="bottom-right"
      gutter={10}
      toastOptions={{
        duration: 4500,
        className: "",
        style: {
          background: "var(--surface)",
          color: "var(--fg)",
          border: "1px solid var(--line)",
          borderRadius: "var(--radius)",
          boxShadow: "var(--shadow-overlay)",
          fontSize: "13.5px",
          lineHeight: "1.45",
          padding: "10px 12px",
          maxWidth: "420px",
        },
        success: { iconTheme: { primary: "var(--success)", secondary: "var(--surface)" } },
        error: {
          duration: 7000,
          iconTheme: { primary: "var(--danger)", secondary: "var(--surface)" },
        },
      }}
    >
      {(t) => (
        <ToastBar toast={t}>
          {({ icon, message }) => (
            <>
              {icon}
              <div className="flex-1 px-1">{message}</div>
              {t.type !== "loading" && (
                <button
                  type="button"
                  onClick={() => toast.dismiss(t.id)}
                  aria-label="Dismiss notification"
                  className="-mr-1 rounded p-1 text-fg-subtle transition-colors hover:bg-surface-2 hover:text-fg"
                >
                  <XIcon className="size-3.5" />
                </button>
              )}
            </>
          )}
        </ToastBar>
      )}
    </HotToaster>
  );
}

/**
 * Typed helpers so call sites never reach for raw `toast()` and drift from the
 * house style. `notify.error` is deliberately longer-lived — an error the user
 * misses is an error they will report as a silent failure.
 */
export const notify = {
  success: (message: string) => toast.success(message),
  error: (message: string) => toast.error(message),
  loading: (message: string) => toast.loading(message),
  dismiss: (id?: string) => toast.dismiss(id),

  info: (message: string) =>
    toast(message, {
      icon: <InfoIcon className="size-4 shrink-0 text-fg-muted" />,
    }),

  warning: (message: string) =>
    toast(message, {
      icon: <TriangleAlertIcon className="size-4 shrink-0 text-warning" />,
      duration: 6000,
    }),

  /** For an action whose completion is worth confirming but not celebrating. */
  done: (message: string) =>
    toast(message, {
      icon: <CheckIcon className="size-4 shrink-0 text-success" />,
    }),

  promise: <T,>(
    promise: Promise<T>,
    messages: { loading: string; success: string; error: string },
  ) => toast.promise(promise, messages),
};
