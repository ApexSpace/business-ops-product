"use client";

import { BusinessAccessBlockedScreen } from "@/components/business-access/business-access-blocked-screen";
import { useBusinessAccess } from "@/lib/business-access/use-business-access";

export default function BusinessAccessBlockedPage() {
  const { access, blockedReasonCode } = useBusinessAccess();

  return (
    <BusinessAccessBlockedScreen
      access={access}
      reasonCode={blockedReasonCode}
    />
  );
}
