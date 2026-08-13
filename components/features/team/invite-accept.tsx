"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2Icon, MailQuestionIcon, UsersIcon } from "lucide-react";

import { AuthShell } from "@/components/features/auth/auth-shell";
import { notify } from "@/components/toaster";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { hasCode, isApiError } from "@/lib/api/errors";
import { qk } from "@/lib/api/query-keys";
import { acceptInvitation, previewInvitation } from "@/lib/api/team";
import { useAuth } from "@/lib/auth/auth-provider";
import { useOrg } from "@/lib/team/org-provider";

/**
 * All three acceptance paths converge here (M21).
 *
 * 1. Signed in with the invited address — one click.
 * 2. Has an account, signed out — sign in with `next` pointing back here.
 * 3. No account — signup with the email prefilled and locked, then back here.
 *
 * A dead, expired, or revoked token is one indistinguishable "invalid" state;
 * the preview endpoint 404s them all identically on purpose.
 */
export function InviteAccept() {
  const params = useSearchParams();
  const token = params.get("token");

  if (!token) return <InvalidInvite />;
  return <InviteFlow token={token} />;
}

function InviteFlow({ token }: { token: string }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { status, user, signOut } = useAuth();
  const { switchOrg } = useOrg();

  const preview = useQuery({
    queryKey: qk.team.invitePreview(token),
    queryFn: () => previewInvitation(token),
    retry: false,
    staleTime: 30_000,
  });

  const accept = useMutation({
    mutationFn: () => acceptInvitation(token),
    onSuccess: ({ organization }) => {
      void queryClient.invalidateQueries();
      switchOrg(organization.id);
      notify.success(`Welcome to ${organization.name}.`);
      router.push("/team");
    },
    onError: (error) => {
      if (hasCode(error, "SEATS_EXCEEDED")) {
        notify.warning("This team is out of seats. Ask the owner to add one, then try again.");
        return;
      }
      if (hasCode(error, "CONFLICT") && isApiError(error)) {
        notify.info(error.message);
        return;
      }
      notify.error("Could not accept the invitation.");
    },
  });

  if (preview.isLoading || status === "loading") {
    return (
      <AuthShell title="Team invitation">
        <div className="flex flex-col gap-3">
          <Skeleton className="h-5 w-3/4 rounded" />
          <Skeleton className="h-9 rounded" />
        </div>
      </AuthShell>
    );
  }

  if (preview.isError || !preview.data) return <InvalidInvite />;

  const invite = preview.data;
  const signedInAsInvited =
    status === "authenticated" && user?.email.toLowerCase() === invite.email.toLowerCase();
  const nextHere = encodeURIComponent(`/invite?token=${token}`);

  return (
    <AuthShell
      title={`Join ${invite.organization_name}`}
      description={
        invite.invited_by
          ? `${invite.invited_by} invited ${invite.email} to join as a ${invite.role}.`
          : `${invite.email} is invited to join as a ${invite.role}.`
      }
    >
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-3 rounded-md border border-line bg-surface-2 px-3 py-2.5">
          <UsersIcon className="size-4 shrink-0 text-fg-muted" aria-hidden />
          <div className="min-w-0">
            <p className="truncate text-[13px] font-medium text-fg">{invite.organization_name}</p>
            <p className="text-[11.5px] text-fg-subtle">
              Invitation expires {new Date(invite.expires_at).toLocaleDateString()}
            </p>
          </div>
        </div>

        {signedInAsInvited ? (
          <Button
            type="button"
            disabled={accept.isPending}
            onClick={() => accept.mutate()}
            className="h-9 w-full bg-ember text-ember-fg shadow-none hover:bg-ember-hover"
          >
            {accept.isPending ? <Loader2Icon className="size-4 animate-spin" /> : null}
            Join {invite.organization_name}
          </Button>
        ) : status === "authenticated" ? (
          <div className="flex flex-col gap-2.5">
            <p className="text-[12.5px] leading-relaxed text-fg-muted">
              This invitation was sent to <span className="font-medium text-fg">{invite.email}</span>,
              but you are signed in as{" "}
              <span className="font-medium text-fg">{user?.email}</span>. Sign out, then sign in
              or sign up with the invited address.
            </p>
            <Button type="button" variant="outline" onClick={() => void signOut()}>
              Sign out and switch accounts
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-2.5">
            <Button
              asChild
              className="h-9 w-full bg-ember text-ember-fg shadow-none hover:bg-ember-hover"
            >
              <Link
                href={`/signup?invite=${encodeURIComponent(token)}&email=${encodeURIComponent(invite.email)}`}
              >
                Create an account
              </Link>
            </Button>
            <Button asChild variant="outline" className="h-9 w-full">
              <Link href={`/login?next=${nextHere}`}>I already have an account</Link>
            </Button>
          </div>
        )}
      </div>
    </AuthShell>
  );
}

function InvalidInvite() {
  return (
    <AuthShell
      title="This invitation is not valid"
      description="It may have expired, been revoked, or already been used. Invitations are good for 7 days."
    >
      <div className="flex flex-col items-center gap-3 py-3 text-center">
        <span className="flex size-10 items-center justify-center rounded-full bg-surface-2 text-fg-muted">
          <MailQuestionIcon className="size-5" aria-hidden />
        </span>
        <p className="text-[12.5px] leading-relaxed text-fg-muted">
          Ask whoever invited you to send a fresh invitation.
        </p>
        <Button asChild variant="outline" size="sm">
          <Link href="/">Back to StackForge</Link>
        </Button>
      </div>
    </AuthShell>
  );
}
