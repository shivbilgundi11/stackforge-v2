import { SparklesIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { PageHeader } from "@/components/forge/page-header";
import { DashboardPanels } from "@/components/features/workspace/dashboard-panels";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Dashboard" };

export default function DashboardPage() {
  return (
    <>
      <PageHeader
        title="Dashboard"
        description="Recent work, saved stacks, and what today's usage looks like."
        actions={
          <Button asChild size="sm" className="bg-ember text-ember-fg hover:bg-ember-hover">
            <Link href="/stack-architect/new">
              <SparklesIcon className="size-4" />
              New stack
            </Link>
          </Button>
        }
      />

      {/* The panels are a client component: they read the signed-in identity
          and fetch one aggregate. Signed out, none of it is fetched — an
          anonymous visitor gets a prompt, not seven empty panels implying
          something broke. */}
      <DashboardPanels />
    </>
  );
}
