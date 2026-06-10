"use client";

import { AlertCircle } from "lucide-react";
import { useAppRouter } from "@/lib/hooks/use-app-router";
import { Button } from "@/components/ui/button";
import { getSupportHref } from "@/lib/config/support";
import type { BusinessTenantAccess } from "@/lib/business-access/types";
import { BusinessAccessSummary } from "./business-access-summary";
import { getAccessBlockedMessage } from "./business-access-messages";

export function BusinessAccessBlockedScreen({
  access,
  reasonCode,
}: {
  access?: BusinessTenantAccess | null;
  reasonCode?: string;
}) {
  const router = useAppRouter();
  const code = reasonCode ?? access?.reasonCode ?? "BUSINESS_NOT_ACTIVE";
  const copy = getAccessBlockedMessage(code);

  return (
    <div className="flex min-h-svh flex-col items-center justify-center bg-muted/30 p-6">
      <div className="w-full max-w-lg space-y-6 rounded-lg border bg-card p-8 shadow-sm">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="flex size-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
            <AlertCircle className="size-6" />
          </div>
          <h1 className="text-xl font-semibold">{copy.title}</h1>
          <p className="text-sm text-muted-foreground">{copy.message}</p>
        </div>

        {access ? (
          <div className="border-t pt-4">
            <BusinessAccessSummary access={access} />
          </div>
        ) : null}

        <div className="flex flex-wrap justify-center gap-2 border-t pt-4">
          <Button nativeButton={false} render={<a href={getSupportHref()} />}>
            {copy.primaryCta}
          </Button>
          {copy.secondaryCtas.includes("Switch workspace") ? (
            <Button
              variant="outline"
              onClick={() => router.push("/select-context")}
            >
              Switch workspace
            </Button>
          ) : null}
          {copy.secondaryCtas.includes("Go to login") ? (
            <Button variant="ghost" onClick={() => router.push("/login")}>
              Go to login
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
