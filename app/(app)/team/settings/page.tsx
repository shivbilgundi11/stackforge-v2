import type { Metadata } from "next";

import { TeamSettings } from "@/components/features/team/team-settings";
import { PageHeader } from "@/components/forge/page-header";

export const metadata: Metadata = {
  title: "Team settings",
  description: "Name, defaults, approved tools, seats.",
};

export default function Page() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-5">
      <PageHeader
        eyebrow="Team"
        title="Team settings"
        description="Name, default visibility, the approval gate, approved tools, and seats."
      />
      <TeamSettings />
    </div>
  );
}
