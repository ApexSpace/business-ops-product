"use client";

import { AppShellLayout } from "@/components/layout/app-shell-layout";
import { BusinessRealtimeProvider } from "@/components/layout/business-realtime-provider";
import { CapabilityRouteGuard } from "@/components/capabilities/capability-route-guard";
import { StaffPermissionRouteGuard } from "@/components/auth/staff-permission-route-guard";
import { BusinessAccessGate } from "@/components/business-access/business-access-gate";
import { BusinessAccessProvider } from "@/lib/business-access/business-access-provider";
import { SnapshotContextProvider } from "@/lib/snapshot/snapshot-context-provider";

export default function BusinessLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="h-svh min-h-0 overflow-hidden">
      <BusinessRealtimeProvider>
        <BusinessAccessProvider>
          <SnapshotContextProvider>
            <BusinessAccessGate>
              <AppShellLayout mode="business">
                <CapabilityRouteGuard>
                  <StaffPermissionRouteGuard>
                    {children}
                  </StaffPermissionRouteGuard>
                </CapabilityRouteGuard>
              </AppShellLayout>
            </BusinessAccessGate>
          </SnapshotContextProvider>
        </BusinessAccessProvider>
      </BusinessRealtimeProvider>
    </div>
  );
}
