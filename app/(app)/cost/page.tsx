import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ToolHub } from "@/components/forge/tool-hub";
import { NAV_GROUPS } from "@/lib/navigation";

export const metadata: Metadata = { title: "Cost Planner" };

export default function Page() {
  const group = NAV_GROUPS.find((entry) => entry.id === "cost");
  if (!group) notFound();
  return <ToolHub group={group} />;
}
