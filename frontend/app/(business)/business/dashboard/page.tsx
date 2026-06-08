"use client";

import Link from "next/link";
import { BusinessDashboardStatsGrid } from "@/components/dashboard/business-dashboard-stats";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  resolveDashboardQuickLinks,
} from "@/lib/config/snapshot/resolve-dashboard-widgets";
import { useSnapshotContext } from "@/lib/snapshot/use-snapshot-context";
import { createTerminologyResolver } from "@/lib/snapshot/resolve-terminology";
import { useMemo } from "react";

export default function BusinessDashboardPage() {
  const { context, isLoading: contextLoading } = useSnapshotContext();

  const resolveLabel = useMemo(
    () => createTerminologyResolver(context.terminology),
    [context.terminology],
  );

  const quickLinks = useMemo(
    () =>
      resolveDashboardQuickLinks(context.dashboard.quickLinks, resolveLabel),
    [context.dashboard.quickLinks, resolveLabel],
  );

  return (
    <div className="space-y-6">
      <PageHeader />

      <BusinessDashboardStatsGrid
        dashboardConfig={context.dashboard}
        terminology={context.terminology}
        contextLoading={contextLoading}
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Quick links</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {quickLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
            >
              {link.label}
            </Link>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
