"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { BusinessSubscriptionPayment } from "@/features/platform/types/business-subscription";

function formatMoney(amount: number, currency: string): string {
  return `${amount.toFixed(2)} ${currency}`;
}

export function computePaymentSummary(payments: BusinessSubscriptionPayment[]) {
  const active = payments.filter((p) => !p.voidedAt);
  const currency = active[0]?.currency ?? "USD";

  let totalPaid = 0;
  let pendingAmount = 0;
  let refundedCredited = 0;
  let lastPayment: BusinessSubscriptionPayment | null = null;

  for (const payment of active) {
    const amount = Number(payment.amount);
    if (
      payment.direction === "INCOMING" &&
      payment.paymentStatus === "PAID"
    ) {
      totalPaid += amount;
      if (
        !lastPayment ||
        new Date(payment.paidAt ?? payment.recordedAt) >
          new Date(lastPayment.paidAt ?? lastPayment.recordedAt)
      ) {
        lastPayment = payment;
      }
    }
    if (
      payment.direction === "INCOMING" &&
      (payment.paymentStatus === "PENDING" ||
        payment.paymentStatus === "PARTIALLY_PAID" ||
        payment.paymentStatus === "OVERDUE")
    ) {
      pendingAmount += amount;
    }
    if (
      payment.direction === "OUTGOING" ||
      payment.paymentType === "REFUND" ||
      payment.paymentType === "CREDIT"
    ) {
      refundedCredited += amount;
    }
  }

  return {
    currency,
    totalPaid,
    pendingAmount,
    refundedCredited,
    lastPayment,
  };
}

export function PaymentSummaryCards({
  payments,
}: {
  payments: BusinessSubscriptionPayment[];
}) {
  const summary = computePaymentSummary(payments);

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Total paid
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-lg font-semibold">
            {formatMoney(summary.totalPaid, summary.currency)}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Pending amount
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-lg font-semibold">
            {formatMoney(summary.pendingAmount, summary.currency)}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Current Payment
          </CardTitle>
        </CardHeader>
        <CardContent>
          {summary.lastPayment ? (
            <div className="space-y-1">
              <p className="text-sm font-medium">
                {formatMoney(
                  Number(summary.lastPayment.amount),
                  summary.lastPayment.currency,
                )}
              </p>
              <p className="text-xs text-muted-foreground">
                {new Date(
                  summary.lastPayment.paidAt ?? summary.lastPayment.recordedAt,
                ).toLocaleString()}
              </p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No paid records</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Refunded / credited
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-lg font-semibold">
            {formatMoney(summary.refundedCredited, summary.currency)}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
