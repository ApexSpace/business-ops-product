"use client";

import { useMemo, useState } from "react";
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { toast } from "sonner";
import { type DataTableColumn } from "@/components/data-display/data-table";
import { StatusBadge } from "@/components/data-display/status-badge";
import { EntityListLayout } from "@/components/layout/entity-list-layout";
import { ListFilterCheckboxGroup } from "@/components/layout/list-filter-checkbox-group";
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
  const [filterOpen, setFilterOpen] = useState(false);
  const [draftPaymentStatus, setDraftPaymentStatus] = useState("all");
  const [draftPaymentMethod, setDraftPaymentMethod] = useState("all");
  const [draftPaymentType, setDraftPaymentType] = useState("all");
  const [draftDirection, setDraftDirection] = useState("all");
  const [draftFromDate, setDraftFromDate] = useState("");
  const [draftToDate, setDraftToDate] = useState("");
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
    setDraftPaymentStatus("all");
    setDraftPaymentMethod("all");
    setDraftPaymentType("all");
    setDraftDirection("all");
    setDraftFromDate("");
    setDraftToDate("");
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
      <EntityListLayout
        title="Payment Records"
        description="Paid records can be refunded. Pending or failed records can be voided."
        hideHeader
        flush
        addButtonLabel="Record Payment"
        onAdd={canUpdate ? () => setUserRecordOpen(true) : undefined}
        leading={<PaymentSummaryCards payments={summaryData?.items ?? []} />}
        filterAriaLabel="Payment filters"
        filterActive={
          paymentStatus !== "all" ||
          paymentMethod !== "all" ||
          paymentType !== "all" ||
          direction !== "all" ||
          Boolean(fromDate || toDate)
        }
        filterOpen={filterOpen}
        onFilterOpenChange={(open) => {
          if (open) {
            setDraftPaymentStatus(paymentStatus);
            setDraftPaymentMethod(paymentMethod);
            setDraftPaymentType(paymentType);
            setDraftDirection(direction);
            setDraftFromDate(fromDate);
            setDraftToDate(toDate);
          }
          setFilterOpen(open);
        }}
        filterContent={
          <>
            <ListFilterCheckboxGroup
              legend="Payment status"
              options={subscriptionPaymentStatusFilterOptions}
              value={draftPaymentStatus}
              onChange={(next) => setDraftPaymentStatus(String(next))}
            />
            <ListFilterCheckboxGroup
              legend="Method"
              options={subscriptionPaymentMethodFilterOptions}
              value={draftPaymentMethod}
              onChange={(next) => setDraftPaymentMethod(String(next))}
            />
            <ListFilterCheckboxGroup
              legend="Payment type"
              options={subscriptionPaymentTypeFilterOptions}
              value={draftPaymentType}
              onChange={(next) => setDraftPaymentType(String(next))}
            />
            <ListFilterCheckboxGroup
              legend="Direction"
              options={subscriptionPaymentDirectionFilterOptions}
              value={draftDirection}
              onChange={(next) => setDraftDirection(String(next))}
            />
            <div className="flex w-full min-w-0 flex-col gap-2">
              <Label htmlFor="sub-pay-from">From date</Label>
              <Input
                id="sub-pay-from"
                type="date"
                value={draftFromDate}
                onChange={(e) => setDraftFromDate(e.target.value)}
              />
              <Label htmlFor="sub-pay-to">To date</Label>
              <Input
                id="sub-pay-to"
                type="date"
                value={draftToDate}
                onChange={(e) => setDraftToDate(e.target.value)}
              />
              <Button type="button" variant="ghost" size="sm" onClick={resetFilters}>
                Clear
              </Button>
            </div>
          </>
        }
        onFilterApply={() => {
          setPaymentStatus(draftPaymentStatus);
          setPaymentMethod(draftPaymentMethod);
          setPaymentType(draftPaymentType);
          setDirection(draftDirection);
          setFromDate(draftFromDate);
          setToDate(draftToDate);
        }}
        footer={
          hasNextPage ? (
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
          ) : undefined
        }
        columns={columns}
        data={payments}
        getRowId={(row) => row.id}
        isLoading={isLoading && payments.length === 0}
        emptyTitle="No payment records"
        emptyDescription="Subscription payments and credits will appear here."
        actionsColumnHeader="Actions"
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
      />

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
