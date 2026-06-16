"use client";

import { useMemo } from "react";
import { BillingInvoicesTable } from "@/features/settings/components/billing-invoices-table";
import { isActivePaidStripeSubscription } from "@/features/settings/utils/plan-tier-position.util";
import type { BusinessAccess } from "@/features/platform/types/business-access";
import { usePlatformBusinessBillingInvoices } from "@/features/platform/hooks/use-platform-business-billing-invoices";

const PAGE_LIMIT = 25;

export function PlatformBusinessInvoicesSection({
  businessId,
  access,
}: {
  businessId: string;
  access?: BusinessAccess | null;
}) {
  const listFilters = { limit: PAGE_LIMIT };
  const isActiveStripeSubscription = isActivePaidStripeSubscription(
    access?.subscription?.billingSource,
    access?.subscription?.status,
  );

  const {
    data,
    isLoading,
    isError,
    error,
    isFetchingNextPage,
    fetchNextPage,
    hasNextPage,
  } = usePlatformBusinessBillingInvoices(businessId, listFilters);

  const invoices = useMemo(
    () => data?.pages.flatMap((page) => page.items) ?? [],
    [data],
  );

  if (isError) {
    return (
      <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
        {error instanceof Error
          ? error.message
          : "Unable to load invoices. Please try again."}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h2 className="text-base font-semibold">Payments / Invoices</h2>
        <p className="text-sm text-muted-foreground">
          Billing history for this business. Stripe invoices can be opened in a
          new tab when available.
        </p>
      </div>

      <BillingInvoicesTable
        invoices={invoices}
        isLoading={isLoading}
        isActiveStripeSubscription={isActiveStripeSubscription}
        showPlanColumns
        hasNextPage={hasNextPage}
        isFetchingNextPage={isFetchingNextPage}
        onLoadMore={() => void fetchNextPage()}
      />
    </div>
  );
}
