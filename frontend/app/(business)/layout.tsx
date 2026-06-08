"use client";

import { AppShellLayout } from "@/components/layout/app-shell-layout";
import { BusinessRealtimeProvider } from "@/components/layout/business-realtime-provider";
import { SnapshotContextProvider } from "@/lib/snapshot/snapshot-context-provider";

export default function BusinessLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="h-svh min-h-0 overflow-hidden">
      <BusinessRealtimeProvider>
        <SnapshotContextProvider>
          <AppShellLayout mode="business">{children}</AppShellLayout>
        </SnapshotContextProvider>
      </BusinessRealtimeProvider>
    </div>
  );
}
