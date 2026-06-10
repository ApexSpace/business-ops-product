"use client";

import { useMemo, useState } from "react";
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { toast } from "sonner";
import {
  DataTable,
  type DataTableColumn,
} from "@/components/data-display/data-table";
import { StatusBadge } from "@/components/data-display/status-badge";
import { SearchableSelect } from "@/components/forms/searchable-select";
import { DataToolbar } from "@/components/layout/data-toolbar";
import { FilterBar } from "@/components/layout/filter-bar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PaymentDetailDrawer } from "@/features/platform/components/access/payment-detail-drawer";
import { PaymentSummaryCards } from "@/features/platform/components/access/payment-summary-cards";
import { RecordPaymentDialog } from "@/features/platform/components/access/record-payment-dialog";
import { RefundPaymentDialog } from "@/features/platform/components/access/refund-payment-dialog";
import {
  getPlatformBusinessAccess,
  listPlatformBusinessSubscriptionPayments,
  voidPlatformBusinessSubscriptionPayment,
} from "@/features/platform/api/business-access.api";
import type {
  SubscriptionPaymentMethod,
  SubscriptionPaymentStatus,
} from "@/features/platform/types/business-access";
import type {
  BusinessSubscriptionPayment,
  BusinessSubscriptionPaymentDirection,
  BusinessSubscriptionPaymentType,
  ListSubscriptionPaymentsQuery,
} from "@/features/platform/types/business-subscription";
import {
  formatPaymentMethod,
  formatPaymentSource,
} from "@/features/platform/utils/access-labels";
import {
  subscriptionPaymentDirectionFilterOptions,
  subscriptionPaymentMethodFilterOptions,
  subscriptionPaymentStatusFilterOptions,
  subscriptionPaymentTypeFilterOptions,
} from "@/features/platform/utils/select-options";
import { queryKeys } from "@/lib/query/keys";

const PAGE_LIMIT = 25;

export function PlatformBusinessPaymentsTab({
  businessId,
  canUpdate,
  autoOpenRecord,
  onAutoOpenConsumed,
}: {
  businessId: string;
  canUpdate: boolean;
  autoOpenRecord?: boolean;
  onAutoOpenConsumed?: () => void;
}) {
  const queryClient = useQueryClient();
  const [paymentStatus, setPaymentStatus] = useState("all");
  const [paymentMethod, setPaymentMethod] = useState("all");
  const [paymentType, setPaymentType] = useState("all");
  const [direction, setDirection] = useState("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [selectedPayment, setSelectedPayment] =
    useState<BusinessSubscriptionPayment | null>(null);
  const [userRecordOpen, setUserRecordOpen] = useState(false);
  const recordOpen = userRecordOpen || Boolean(autoOpenRecord && canUpdate);
  const [refundPayment, setRefundPayment] =
    useState<BusinessSubscriptionPayment | null>(null);
  const [voidPayment, setVoidPayment] =
    useState<BusinessSubscriptionPayment | null>(null);
  const [voidReason, setVoidReason] = useState("");

  const { data: access } = useQuery({
    queryKey: queryKeys.platform.businesses.access(businessId),
    queryFn: () => getPlatformBusinessAccess(businessId),
  });

  const listFilters: ListSubscriptionPaymentsQuery = {
    paymentStatus:
      paymentStatus !== "all"
        ? (paymentStatus as SubscriptionPaymentStatus)
        : undefined,
    paymentMethod:
      paymentMethod !== "all"
        ? (paymentMethod as SubscriptionPaymentMethod)
        : undefined,
    paymentType:
      paymentType !== "all"
        ? (paymentType as BusinessSubscriptionPaymentType)
        : undefined,
    paymentDirection:
      direction !== "all"
        ? (direction as BusinessSubscriptionPaymentDirection)
        : undefined,
    from: fromDate || undefined,
    to: toDate || undefined,
    includeVoided: true,
    limit: PAGE_LIMIT,
  };

  const { data: summaryData } = useQuery({
    queryKey: queryKeys.platform.businesses.subscriptionPayments(businessId, {
      includeVoided: "true",
      limit: 100,
    }),
    queryFn: () =>
      listPlatformBusinessSubscriptionPayments(businessId, {
        includeVoided: true,
        limit: 100,
      }),
  });

  const {
    data,
    isLoading,
    isFetchingNextPage,
    fetchNextPage,
    hasNextPage,
  } = useInfiniteQuery({
    queryKey: queryKeys.platform.businesses.subscriptionPayments(
      businessId,
      listFilters as Record<string, string | number | boolean | null | undefined>,
    ),
    queryFn: ({ pageParam }) =>
      listPlatformBusinessSubscriptionPayments(businessId, {
        ...listFilters,
        cursor: pageParam,
      }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) =>
      lastPage.hasMore ? (lastPage.nextCursor ?? undefined) : undefined,
  });

  const payments = useMemo(
    () => data?.pages.flatMap((page) => page.items) ?? [],
    [data],
  );

  const invalidate = () => {
    void queryClient.invalidateQueries({
      queryKey: queryKeys.platform.businesses.subscriptionPayments(businessId),
    });
    void queryClient.invalidateQueries({
      queryKey: queryKeys.platform.businesses.access(businessId),
    });
    void queryClient.invalidateQueries({
      queryKey: queryKeys.platform.businesses.subscriptionEvents(businessId),
    });
    void queryClient.invalidateQueries({
      queryKey: queryKeys.platform.businesses.detail(businessId),
    });
  };

  const voidMutation = useMutation({
    mutationFn: () =>
      voidPlatformBusinessSubscriptionPayment(
        businessId,
        voidPayment!.id,
        { reason: voidReason },
      ),
    onSuccess: () => {
      toast.success("Payment voided");
      setVoidPayment(null);
      setVoidReason("");
      invalidate();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const resetFilters = () => {
    setPaymentStatus("all");
    setPaymentMethod("all");
    setPaymentType("all");
    setDirection("all");
    setFromDate("");
    setToDate("");
  };

  const columns = useMemo<DataTableColumn<BusinessSubscriptionPayment>[]>(
    () => [
      {
        id: "date",
        header: "Date",
        sortable: true,
        sortValue: (row) => row.recordedAt,
        cell: (row) => (
          <button
            type="button"
            className="whitespace-nowrap text-left text-primary hover:underline"
            onClick={() => setSelectedPayment(row)}
          >
            {new Date(row.recordedAt).toLocaleString()}
          </button>
        ),
      },
      {
        id: "amount",
        header: "Amount",
        sortable: true,
        sortValue: (row) => Number(row.amount),
        cell: (row) => (
          <span className="font-medium">
            {row.direction === "OUTGOING" ? "−" : "+"}
            {row.amount} {row.currency}
          </span>
        ),
      },
      {
        id: "method",
        header: "Method",
        cell: (row) => formatPaymentMethod(row.paymentMethod),
      },
      {
        id: "status",
        header: "Status",
        cell: (row) => (
          <StatusBadge status={row.paymentStatus} domain="subscriptionPayment" />
        ),
      },
      {
        id: "source",
        header: "Source",
        cell: (row) => formatPaymentSource(row.source),
      },
      {
        id: "reference",
        header: "Reference",
        cell: (row) => row.paymentReference ?? "—",
      },
      {
        id: "notes",
        header: "Notes",
        cell: (row) => (
          <span className="max-w-[160px] truncate block">
            {row.notes ?? "—"}
          </span>
        ),
      },
    ],
    [],
  );

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-base font-semibold">Payment Records</h2>
        <p className="text-sm text-muted-foreground">
          Paid records can be refunded. Pending or failed records can be voided.
        </p>
      </div>

      <PaymentSummaryCards payments={summaryData?.items ?? []} />

      <div className="space-y-4">
        <DataToolbar
          filters={
            <FilterBar>
              <SearchableSelect
                items={subscriptionPaymentStatusFilterOptions}
                value={paymentStatus}
                onValueChange={(v) => setPaymentStatus(v ?? "all")}
                placeholder="Payment status"
                triggerClassName="w-[180px]"
              />
              <SearchableSelect
                items={subscriptionPaymentMethodFilterOptions}
                value={paymentMethod}
                onValueChange={(v) => setPaymentMethod(v ?? "all")}
                placeholder="Method"
                triggerClassName="w-[160px]"
              />
              <SearchableSelect
                items={subscriptionPaymentTypeFilterOptions}
                value={paymentType}
                onValueChange={(v) => setPaymentType(v ?? "all")}
                placeholder="Payment type"
                triggerClassName="w-[180px]"
              />
              <SearchableSelect
                items={subscriptionPaymentDirectionFilterOptions}
                value={direction}
                onValueChange={(v) => setDirection(v ?? "all")}
                placeholder="Direction"
                triggerClassName="w-[160px]"
              />
              <Input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="w-[160px]"
                aria-label="From date"
              />
              <Input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="w-[160px]"
                aria-label="To date"
              />
              <Button type="button" variant="ghost" size="sm" onClick={resetFilters}>
                Clear
              </Button>
            </FilterBar>
          }
          actions={
            canUpdate ? (
              <Button size="sm" onClick={() => setUserRecordOpen(true)}>
                Record Payment
              </Button>
            ) : null
          }
        />

        <DataTable
          columns={columns}
          data={payments}
          getRowId={(row) => row.id}
          isLoading={isLoading && payments.length === 0}
          emptyTitle="No payment records"
          emptyDescription="Subscription payments and credits will appear here."
          rowActions={(payment) => (
            <div className="flex gap-1">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setSelectedPayment(payment)}
              >
                View
              </Button>
              {canUpdate && !payment.voidedAt ? (
                <>
                  {payment.paymentStatus === "PAID" &&
                  payment.direction === "INCOMING" ? (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setRefundPayment(payment)}
                    >
                      Refund
                    </Button>
                  ) : null}
                  {payment.paymentStatus === "PENDING" ||
                  payment.paymentStatus === "FAILED" ? (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setVoidPayment(payment)}
                    >
                      Void
                    </Button>
                  ) : null}
                </>
              ) : null}
            </div>
          )}
          actionsColumnHeader="Actions"
        />

        {hasNextPage ? (
          <div className="flex justify-center">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isFetchingNextPage}
              onClick={() => void fetchNextPage()}
            >
              {isFetchingNextPage ? "Loading…" : "Load more"}
            </Button>
          </div>
        ) : null}
      </div>

      <RecordPaymentDialog
        businessId={businessId}
        open={recordOpen}
        onOpenChange={(open) => {
          if (!open) {
            setUserRecordOpen(false);
            onAutoOpenConsumed?.();
          }
        }}
        defaultCurrency={access?.subscription?.currency ?? "USD"}
        onSuccess={invalidate}
      />

      <RefundPaymentDialog
        businessId={businessId}
        payment={refundPayment}
        open={!!refundPayment}
        onOpenChange={(open) => !open && setRefundPayment(null)}
        onSuccess={invalidate}
      />

      <Dialog
        open={!!voidPayment}
        onOpenChange={(open) => !open && setVoidPayment(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Void Payment</DialogTitle>
          </DialogHeader>
          <DialogBody className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Void pending/failed payment of {voidPayment?.amount}{" "}
              {voidPayment?.currency}. Paid records cannot be voided — use refund
              instead.
            </p>
            <div className="space-y-2">
              <Label>Reason</Label>
              <Input
                value={voidReason}
                onChange={(e) => setVoidReason(e.target.value)}
              />
            </div>
          </DialogBody>
          <DialogFooter>
            <Button
              variant="destructive"
              disabled={!voidReason.trim() || voidMutation.isPending}
              onClick={() => voidMutation.mutate()}
            >
              Void payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <PaymentDetailDrawer
        payment={selectedPayment}
        open={!!selectedPayment}
        onOpenChange={(open) => !open && setSelectedPayment(null)}
      />
    </div>
  );
}
