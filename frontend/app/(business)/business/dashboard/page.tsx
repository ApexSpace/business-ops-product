"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { BusinessDashboardStatsGrid } from "@/components/dashboard/business-dashboard-stats";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getCurrentBusiness } from "@/features/settings/api/business.api";
import { queryKeys } from "@/lib/query/keys";
import { getIndustryLabels } from "@/lib/config/industry-labels";
import type { Business } from "@/lib/types/shared";

const quickLinks = [
  { href: "/business/contacts", labelKey: "contacts" as const },
  { href: "/business/work-items", labelKey: "workItems" as const },
  { href: "/business/pipelines", labelKey: "pipelines" as const },
  { href: "/business/appointments", labelKey: "appointments" as const },
  { href: "/business/conversations", labelKey: "conversations" as const },
  { href: "/business/settings/team", label: "Team" },
];

export default function BusinessDashboardPage() {
  const { data: business } = useQuery({
    queryKey: queryKeys.business.current(),
    queryFn: () => getCurrentBusiness(),
  });

  const labels = getIndustryLabels(business?.industry);

  return (
    <div className="space-y-6">
      <PageHeader />

      <BusinessDashboardStatsGrid labels={labels} />

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
              {"label" in link ? link.label : labels[link.labelKey]}
            </Link>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
