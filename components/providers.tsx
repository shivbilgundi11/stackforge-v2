"use client";

import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import { ThemeProvider } from "next-themes";

import { Toaster } from "@/components/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/lib/auth/auth-provider";
import { OrgProvider } from "@/lib/team/org-provider";

export function Providers({ children }: { children: React.ReactNode }) {
  // Created in state, not at module scope: a module-level client would be
  // shared across requests on the server and leak one user's cache into
  // another's render.
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            gcTime: 5 * 60_000,
            // A tool result must not silently change while it is being read.
            // The library default is right for a feed and wrong here.
            refetchOnWindowFocus: false,
            retry: (failureCount, error) => {
              const status = (error as { status?: number })?.status;
              if (status && status >= 400 && status < 500) return false;
              return failureCount < 1;
            },
          },
          mutations: { retry: false },
        },
      }),
  );

  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="light"
      enableSystem
      disableTransitionOnChange
      storageKey="stackforge-theme"
    >
      <QueryClientProvider client={queryClient}>
        <NuqsAdapter>
          {/* Inside QueryClientProvider: the provider clears cached user data
              on sign-out, and inside NuqsAdapter so it can read the router. */}
          <AuthProvider>
            {/* Inside AuthProvider: the acting org exists only for a
                signed-in user, and clears itself on sign-out. */}
            <OrgProvider>
              <TooltipProvider delayDuration={200}>
                {children}
                <Toaster />
              </TooltipProvider>
            </OrgProvider>
          </AuthProvider>
        </NuqsAdapter>
      </QueryClientProvider>
    </ThemeProvider>
  );
}
