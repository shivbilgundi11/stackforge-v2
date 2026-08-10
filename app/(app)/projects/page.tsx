import type { Metadata } from "next";

import { PageHeader } from "@/components/forge/page-header";
import { Projects } from "@/components/features/workspace/projects";

export const metadata: Metadata = {
  title: "Projects",
  description: "Group the runs and stacks for one piece of work.",
};

export default function ProjectsPage() {
  return (
    <>
      <PageHeader
        title="Projects"
        description="A container for one piece of work — its runs, its stacks, and the figures carried between them."
      />
      <Projects />
    </>
  );
}
