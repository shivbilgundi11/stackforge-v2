"use client";

import { useState } from "react";
import { MailIcon } from "lucide-react";

import { notify } from "@/components/toaster";
import { Button } from "@/components/ui/button";
import { authApi } from "@/lib/api/auth";
import { isApiError } from "@/lib/api/errors";
import { useAuth } from "@/lib/auth/auth-provider";

/**
 * A banner, not a wall.
 *
 * An unverified user can browse and run tools; they cannot save, export, or
 * share. Blocking the whole app on an email that might be in spam is a
 * conversion cliff.
 */
export function VerificationBanner() {
  const { status, user } = useAuth();
  const [sending, setSending] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  if (status !== "authenticated" || !user || user.email_verified || dismissed) return null;

  const resend = async () => {
    setSending(true);
    try {
      await authApi.resendVerification();
      notify.success(`Verification link sent to ${user.email}.`);
    } catch (error) {
      notify.error(
        isApiError(error) ? error.message : "Could not send the email. Try again shortly.",
      );
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-warning-line bg-warning-quiet px-4 py-2 sm:px-6">
      <MailIcon className="size-4 shrink-0 text-warning" aria-hidden />
      <p className="flex-1 text-[12.5px] text-fg">
        Verify <span className="font-medium">{user.email}</span> to save projects and export
        artifacts.
      </p>
      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={() => void resend()}
        disabled={sending}
        className="h-7 border-warning-line bg-surface text-[11.5px]"
      >
        {sending ? "Sending…" : "Resend email"}
      </Button>
      <button
        type="button"
        onClick={() => setDismissed(true)}
        className="text-[11.5px] text-fg-muted hover:text-fg"
      >
        Dismiss
      </button>
    </div>
  );
}
