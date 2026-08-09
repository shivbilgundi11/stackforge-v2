"use client";

import { AppearanceSection } from "@/components/features/settings/appearance-section";
import { ProfileSection } from "@/components/features/settings/profile-section";
import { DangerSection, SecuritySection } from "@/components/features/settings/security-section";
import { PageHeader } from "@/components/forge/page-header";
import { Panel, PanelBody } from "@/components/forge/panel";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/lib/auth/auth-provider";
import Link from "next/link";

/**
 * Appearance is above the account sections, and available signed out.
 *
 * Theme is the setting people come here for most often, and it is the one that
 * needs no account — gating it behind sign-in would be gating a preference
 * stored in their own browser. The account sections simply do not render for
 * an anonymous visitor, which is why this page is not in the guarded list.
 */
export function SettingsView() {
  const { status, user } = useAuth();

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-5">
      <PageHeader
        title="Settings"
        description="Appearance is stored in this browser. Everything else belongs to your account."
      />

      <AppearanceSection />

      {status === "loading" ? (
        <>
          <Skeleton className="h-64 rounded-md" />
          <Skeleton className="h-56 rounded-md" />
        </>
      ) : user ? (
        <>
          <ProfileSection user={user} />
          <SecuritySection user={user} />
          <DangerSection user={user} />
        </>
      ) : (
        <SignedOutNotice />
      )}
    </div>
  );
}

function SignedOutNotice() {
  return (
    <Panel>
      <PanelBody className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-col gap-0.5">
          <p className="text-[13.5px] font-medium text-fg">Profile and account</p>
          <p className="text-[13px] text-fg-muted">
            Sign in to change your name, timezone, or password. Your theme is saved either way.
          </p>
        </div>
        <Button asChild size="sm">
          <Link href="/login?next=/settings">Sign in</Link>
        </Button>
      </PanelBody>
    </Panel>
  );
}
