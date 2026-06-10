"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  Building2,
  CreditCard,
  FileText,
  Users,
  Workflow,
} from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { StatsCard } from "@/components/layout/stats-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getPlatformDashboardStats } from "@/features/platform/api/platform.api";
import { queryKeys } from "@/lib/query/keys";

export default function PlatformDashboardPage() {
  const { data, isLoading, isError } = useQuery({
    queryKey: queryKeys.platform.dashboard.stats(),
    queryFn: () => getPlatformDashboardStats(),
  });

  const quickLinks = [
    { href: "/platform/businesses", label: "Businesses" },
    { href: "/platform/users", label: "Platform users" },
    { href: "/platform/plan-groups", label: "Plan groups" },
    { href: "/platform/audit-logs", label: "Audit logs" },
  ];

  return (
    <div className="space-y-6">
      <PageHeader />

      {isLoading ? (
        <div className="grid items-stretch gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="min-h-[7.25rem] rounded-lg" />
          ))}
        </div>
      ) : isError || !data ? (
        <p className="text-sm text-destructive">
          Could not load dashboard stats.
        </p>
      ) : (
        <>
          <div className="grid items-stretch gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatsCard
              label="Businesses"
              value={data.businesses.total}
              description={`${data.businesses.active} active · ${data.businesses.suspended} suspended`}
              icon={Building2}
            />
            <StatsCard
              label="Platform users"
              value={data.platformUsers}
              description={`${data.totalUsers} total users`}
              icon={Users}
            />
            <StatsCard
              label="MRR"
              value={`$${data.mrr}`}
              description={`${data.activeSubscriptions} active subscriptions`}
              icon={CreditCard}
            />
            <StatsCard
              label="CRM activity"
              value={data.leads}
              description={`${data.contacts} contacts across tenants`}
              icon={Workflow}
            />
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Quick links</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              {quickLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    buttonVariants({ variant: "outline", size: "sm" }),
                  )}
                >
                  {link.label}
                </Link>
              ))}
              <Link
                href="/platform/audit-logs"
                className={cn(
                  buttonVariants({ variant: "outline", size: "sm" }),
                )}
              >
                <FileText className="mr-1 size-3.5" />
                View audit logs
              </Link>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
