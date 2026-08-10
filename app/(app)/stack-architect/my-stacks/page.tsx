import type { Metadata } from "next";

import { PageHeader } from "@/components/forge/page-header";
import { MyStacks } from "@/components/features/workspace/my-stacks";

export const metadata: Metadata = {
  title: "My stacks",
  description: "Saved stacks, their versions, and what changed between them.",
};

export default function MyStacksPage() {
  return (
    <>
      <PageHeader
        title="My stacks"
        description="Every save is a version. Scores are recomputed against today's catalog, so a stack ages honestly."
      />
      <MyStacks />
    </>
  );
}
