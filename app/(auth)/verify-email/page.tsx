"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CheckCircle2Icon, Loader2Icon, XCircleIcon } from "lucide-react";

import { AuthShell } from "@/components/features/auth/auth-shell";
import { Button } from "@/components/ui/button";
import { authApi } from "@/lib/api/auth";
import { useAuth } from "@/lib/auth/auth-provider";
import { isApiError } from "@/lib/api/errors";

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={null}>
      <VerifyEmail />
    </Suspense>
  );
}

type State = "verifying" | "refreshing" | "verified" | "failed" | "missing";

function VerifyEmail() {
  const token = useSearchParams().get("token");
  const { refreshUser, status } = useAuth();
  const [state, setState] = useState<State>(token ? "verifying" : "missing");
  const [message, setMessage] = useState("");
  const attempted = useRef(false);
  const refreshed = useRef(false);

  useEffect(() => {
    if (!token || attempted.current) return;
    // Guard against the effect running twice in development strict mode —
    // verification tokens are single-use, so the second call would fail and
    // show an error on a link that actually worked.
    attempted.current = true;

    void (async () => {
      try {
        await authApi.verifyEmail({ token });
        setState("refreshing");
      } catch (error) {
        setState("failed");
        setMessage(
          isApiError(error) ? error.message : "This link could not be verified. Request a new one.",
        );
      }
    })();
  }, [token]);

  useEffect(() => {
    if (state !== "refreshing" || status === "loading" || refreshed.current) return;
    refreshed.current = true;

    void (async () => {
      if (status === "authenticated") await refreshUser();
      setState("verified");
    })();
  }, [refreshUser, state, status]);

  if (state === "missing") {
    return (
      <AuthShell title="Link not valid">
        <Centered
          icon={<XCircleIcon className="size-5 text-danger" />}
          text="This verification link is incomplete. Open the link from your email, or request a new one from your settings."
          action={
            <Button asChild variant="outline" size="sm">
              <Link href="/dashboard">Go to the workbench</Link>
            </Button>
          }
        />
      </AuthShell>
    );
  }

  if (state === "verifying" || state === "refreshing") {
    return (
      <AuthShell title="Verifying your email">
        <Centered
          icon={<Loader2Icon className="size-5 animate-spin text-fg-muted" />}
          text="One moment."
        />
      </AuthShell>
    );
  }

  if (state === "verified") {
    return (
      <AuthShell title="Email verified">
        <Centered
          icon={<CheckCircle2Icon className="size-5 text-success" />}
          text="Your address is confirmed. You can now save projects, export artifacts, and share results."
          action={
            <Button
              asChild
              size="sm"
              className="bg-ember text-ember-fg shadow-none hover:bg-ember-hover"
            >
              <Link href="/dashboard">Go to the workbench</Link>
            </Button>
          }
        />
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Could not verify">
      <Centered
        icon={<XCircleIcon className="size-5 text-danger" />}
        text={message}
        action={
          <Button asChild variant="outline" size="sm">
            <Link href="/dashboard">Go to the workbench</Link>
          </Button>
        }
      />
    </AuthShell>
  );
}

function Centered({
  icon,
  text,
  action,
}: {
  icon: React.ReactNode;
  text: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-3 py-3 text-center">
      <span className="flex size-10 items-center justify-center rounded-full bg-surface-2">
        {icon}
      </span>
      <p className="text-[13px] leading-relaxed text-pretty text-fg-muted">{text}</p>
      {action}
    </div>
  );
}
