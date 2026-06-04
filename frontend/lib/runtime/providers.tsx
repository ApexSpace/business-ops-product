"use client";

import { MutationCache, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { initSentry } from "@/lib/observability/sentry";
import { getUserErrorMessage } from "@/lib/api/user-error-message";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme/theme-provider";
import { AuthProvider } from "@/lib/auth/provider";
import { NavigationLoadingProvider } from "@/lib/runtime/navigation-loading";

export function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    initSentry();
  }, []);

  const [queryClient] = useState(
    () =>
      new QueryClient({
        mutationCache: new MutationCache({
          onError: (error) => {
            const msg = getUserErrorMessage(error);
            toast.error(msg.title, {
              id: "mutation-api-error",
              description: msg.requestId
                ? `${msg.description ?? ""} Reference: ${msg.requestId}`.trim()
                : msg.description,
            });
          },
        }),
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            retry: (failureCount, error) => {
              const status =
                typeof error === "object" &&
                error !== null &&
                "status" in error &&
                typeof (error as { status: unknown }).status === "number"
                  ? (error as { status: number }).status
                  : 0;
              if (status >= 500 || status === 0) {
                return failureCount < 1;
              }
              return false;
            },
          },
        },
      }),
  );

  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <NavigationLoadingProvider>
            <AuthProvider>
              {children}
              <Toaster richColors position="top-right" />
            </AuthProvider>
          </NavigationLoadingProvider>
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}
