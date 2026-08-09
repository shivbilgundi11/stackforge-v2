import { cookies } from "next/headers";

import { SidebarInset, SidebarProvider } from "@/components/animate-ui/components/radix/sidebar";
import { AppHeader } from "@/components/shell/app-header";
import { AppSidebar } from "@/components/shell/app-sidebar";
import { CommandPalette } from "@/components/shell/command-palette";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  // Read on the server so the collapsed state is correct on first paint.
  // localStorage would only be readable after hydration, which produces a
  // visible jump on every navigation.
  const cookieStore = await cookies();
  const defaultOpen = cookieStore.get("sidebar_state")?.value !== "false";

  return (
    <SidebarProvider defaultOpen={defaultOpen}>
      <AppSidebar />
      <SidebarInset className="min-w-0 bg-bg">
        <AppHeader />
        <main className="flex-1 px-4 py-5 sm:px-6 sm:py-6">
          <div className="mx-auto w-full max-w-[1440px]">{children}</div>
        </main>
      </SidebarInset>
      <CommandPalette />
    </SidebarProvider>
  );
}
