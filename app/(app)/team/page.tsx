import type { Metadata } from "next";

import { TeamOverview } from "@/components/features/team/team-overview";
import { PageHeader } from "@/components/forge/page-header";

export const metadata: Metadata = {
  title: "Team",
  description: "Members, seats, and the work your team has shared.",
};

export default function Page() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-5">
      <PageHeader
        eyebrow="Workspace"
        title="Team"
        description="Members, seats, and the work your team has shared."
      />
      <TeamOverview />
    </div>
  );
}
