import type { Metadata } from "next";

import { TeamMembers } from "@/components/features/team/team-members";
import { PageHeader } from "@/components/forge/page-header";

export const metadata: Metadata = {
  title: "Members",
  description: "Roles, removal, and ownership transfer.",
};

export default function Page() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-5">
      <PageHeader
        eyebrow="Team"
        title="Members"
        description="Roles decide what each person can see, edit, approve, and manage."
      />
      <TeamMembers />
    </div>
  );
}
