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
              const code =
                typeof error === "object" &&
                error !== null &&
                "code" in error &&
                typeof (error as { code: unknown }).code === "string"
                  ? (error as { code: string }).code
                  : undefined;
              const isTransient =
                status === 0 ||
                status === 502 ||
                status === 503 ||
                status === 504 ||
                code === "BACKEND_UNAVAILABLE" ||
                code === "SERVICE_TIMEOUT";
              if (isTransient) {
                return failureCount < 4;
              }
              if (status >= 500) {
                return failureCount < 1;
              }
              return false;
            },
            retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 8_000),
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
