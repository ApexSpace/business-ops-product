"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SearchableSelect } from "@/components/forms/searchable-select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import {
  getBillingOverview,
  listBillingSubscriptions,
} from "@/features/platform/api/platform.api";
import { queryKeys } from "@/lib/query/keys";
import { subscriptionStatusFilterOptions } from "@/features/platform/utils/select-options";
import type { BillingSubscription } from "@/features/platform/types";

export function PlatformBillingPage() {
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);

  const { data: overview, isLoading: overviewLoading } = useQuery({
    queryKey: queryKeys.platform.billing.overview(),
    queryFn: () => getBillingOverview(),
  });

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.platform.billing.subscriptions({
      page,
      limit: 20,
      status: status !== "all" ? status : undefined,
    }),
    queryFn: () =>
      listBillingSubscriptions({
        page,
        limit: 20,
        status: status !== "all" ? status : undefined,
      }),
  });

  return (
    <div className="space-y-6">
      <PageHeader />

      {overviewLoading ? (
        <Skeleton className="h-24 w-full" />
      ) : overview ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                MRR
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold">${overview.mrr}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Active
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold">
                {overview.activeSubscriptions}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Trialing
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold">
                {overview.trialingSubscriptions}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Past due
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold">
                {overview.pastDueSubscriptions}
              </p>
            </CardContent>
          </Card>
        </div>
      ) : null}

      <SearchableSelect
        items={subscriptionStatusFilterOptions}
        value={status}
        onValueChange={(v) => {
          setStatus(v ?? "all");
          setPage(1);
        }}
        placeholder="Status"
        triggerClassName="w-[180px]"
      />

      {isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Business</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Period end</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data?.items.map((sub) => (
                <TableRow key={sub.id}>
                  <TableCell>
                    <Link
                      href={`/platform/businesses/${sub.businessId}`}
                      className="font-medium hover:underline"
                    >
                      {sub.businessName}
                    </Link>
                    <p className="text-sm text-muted-foreground">
                      {sub.businessSlug}
                    </p>
                  </TableCell>
                  <TableCell>{sub.planName}</TableCell>
                  <TableCell>${sub.priceMonthly}/mo</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{sub.status}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {sub.currentPeriodEnd
                      ? new Date(sub.currentPeriodEnd).toLocaleDateString()
                      : "—"}
                  </TableCell>
                </TableRow>
              ))}
              {data?.items.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="text-center text-muted-foreground"
                  >
                    No subscriptions yet. Assign a plan from a business detail
                    page.
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>

          {data?.meta ? (
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>
                {data.meta.total} total · page {data.meta.page}
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="underline disabled:opacity-50"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  Previous
                </button>
                <button
                  type="button"
                  className="underline disabled:opacity-50"
                  disabled={page * data.meta.limit >= data.meta.total}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </button>
              </div>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
