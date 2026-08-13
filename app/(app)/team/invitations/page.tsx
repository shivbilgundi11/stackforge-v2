import type { Metadata } from "next";

import { TeamInvitations } from "@/components/features/team/team-invitations";
import { PageHeader } from "@/components/forge/page-header";

export const metadata: Metadata = {
  title: "Invitations",
  description: "Invite teammates and manage pending invitations.",
};

export default function Page() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-5">
      <PageHeader
        eyebrow="Team"
        title="Invitations"
        description="Invites carry a role and expire after 7 days. Seats are checked when one is accepted."
      />
      <TeamInvitations />
    </div>
  );
}
