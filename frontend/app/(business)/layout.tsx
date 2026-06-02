"use client";

import { AppShellLayout } from "@/components/layout/app-shell-layout";

export default function BusinessLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="h-svh min-h-0 overflow-hidden">
      <AppShellLayout mode="business">{children}</AppShellLayout>
    </div>
  );
}
