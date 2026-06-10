"use client";

import { Loader2 } from "lucide-react";
import { useBusinessAccess } from "@/lib/business-access/use-business-access";
import { BusinessAccessBlockedScreen } from "./business-access-blocked-screen";

export function BusinessAccessGate({ children }: { children: React.ReactNode }) {
  const { access, isLoading, isBlocked, blockedReasonCode } = useBusinessAccess();

  if (isLoading) {
    return (
      <div className="flex min-h-svh items-center justify-center">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (isBlocked) {
    return (
      <BusinessAccessBlockedScreen
        access={access}
        reasonCode={blockedReasonCode}
      />
    );
  }

  return <>{children}</>;
}
