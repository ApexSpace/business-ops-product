"use client";

import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { StatusBadge } from "@/components/data-display/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import {
  listPlatformBusinessSubscriptionPayments,
  voidPlatformBusinessSubscriptionPayment,
} from "@/features/platform/api/business-access.api";
import { RecordPaymentDialog } from "@/features/platform/components/access/record-payment-dialog";
import { RefundPaymentDialog } from "@/features/platform/components/access/refund-payment-dialog";
import type { BusinessSubscriptionPayment } from "@/features/platform/types/business-subscription";
import { queryKeys } from "@/lib/query/keys";

export function SubscriptionPaymentsSection({
  businessId,
  canUpdate,
  defaultCurrency,
  onSuccess,
}: {
  businessId: string;
  canUpdate: boolean;
  defaultCurrency?: string;
  onSuccess: () => void;
}) {
  const [recordOpen, setRecordOpen] = useState(false);
  const [refundPayment, setRefundPayment] = useState<BusinessSubscriptionPayment | null>(
    null,
  );
  const [voidPayment, setVoidPayment] = useState<BusinessSubscriptionPayment | null>(
    null,
  );
  const [voidReason, setVoidReason] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.platform.businesses.subscriptionPayments(businessId, {
      limit: 10,
    }),
    queryFn: () =>
      listPlatformBusinessSubscriptionPayments(businessId, { limit: 10 }),
  });

  const invalidate = () => {
    onSuccess();
  };

  const voidMutation = useMutation({
    mutationFn: () =>
      voidPlatformBusinessSubscriptionPayment(businessId, voidPayment!.id, {
        reason: voidReason,
      }),
    onSuccess: () => {
      toast.success("Payment voided");
      setVoidPayment(null);
      setVoidReason("");
      invalidate();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const payments = data?.items ?? [];

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <CardTitle className="text-base">Payments</CardTitle>
          {canUpdate && (
            <Button size="sm" variant="outline" onClick={() => setRecordOpen(true)}>
              Record Payment
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading payments…</p>
          ) : payments.length === 0 ? (
            <p className="text-sm text-muted-foreground">No payment records yet.</p>
          ) : (
            <div className="space-y-3">
              {payments.map((payment) => (
                <div
                  key={payment.id}
                  className="flex flex-wrap items-start justify-between gap-2 rounded-md border p-3"
                >
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">
                        {payment.direction === "OUTGOING" ? "−" : "+"}
                        {payment.amount} {payment.currency}
                      </span>
                      <StatusBadge
                        status={payment.paymentStatus}
                        domain="subscriptionPayment"
                      />
                      {payment.voidedAt && (
                        <span className="text-xs text-muted-foreground">(voided)</span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {payment.paymentType} · {payment.paymentMethod}
                      {payment.paidAt
                        ? ` · Paid ${new Date(payment.paidAt).toLocaleDateString()}`
                        : payment.recordedAt
                          ? ` · Recorded ${new Date(payment.recordedAt).toLocaleDateString()}`
                          : null}
                    </p>
                    {payment.notes && (
                      <p className="text-xs text-muted-foreground">{payment.notes}</p>
                    )}
                  </div>
                  {canUpdate && !payment.voidedAt && (
                    <div className="flex gap-2">
                      {payment.paymentStatus === "PAID" &&
                        payment.direction === "INCOMING" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setRefundPayment(payment)}
                          >
                            Refund
                          </Button>
                        )}
                      {(payment.paymentStatus === "PENDING" ||
                        payment.paymentStatus === "FAILED") && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setVoidPayment(payment)}
                        >
                          Void
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <RecordPaymentDialog
        businessId={businessId}
        open={recordOpen}
        onOpenChange={setRecordOpen}
        defaultCurrency={defaultCurrency}
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
    </>
  );
}
