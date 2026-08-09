import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ToolHub } from "@/components/forge/tool-hub";
import { NAV_GROUPS } from "@/lib/navigation";

export const metadata: Metadata = { title: "Agent & MCP Builder" };

export default function Page() {
  const group = NAV_GROUPS.find((entry) => entry.id === "agents");
  if (!group) notFound();
  return <ToolHub group={group} />;
}
