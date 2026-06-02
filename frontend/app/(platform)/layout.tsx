"use client";

import { AppShellLayout } from "@/components/layout/app-shell-layout";

export default function PlatformLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="h-svh min-h-0 overflow-hidden">
      <AppShellLayout mode="platform">{children}</AppShellLayout>
    </div>
  );
}
