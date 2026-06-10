"use client";

import { StatusBadge } from "@/components/data-display/status-badge";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type { BusinessSubscriptionPayment } from "@/features/platform/types/business-subscription";
import {
  formatPaymentDirection,
  formatPaymentMethod,
  formatPaymentSource,
  formatSubscriptionPaymentType,
} from "@/features/platform/utils/access-labels";

function DetailRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 font-medium">{value}</dd>
    </div>
  );
}

function formatPeriod(payment: BusinessSubscriptionPayment): string {
  if (!payment.periodStart && !payment.periodEnd) return "—";
  const start = payment.periodStart
    ? new Date(payment.periodStart).toLocaleDateString()
    : "—";
  const end = payment.periodEnd
    ? new Date(payment.periodEnd).toLocaleDateString()
    : "—";
  return `${start} – ${end}`;
}

export function PaymentDetailDrawer({
  payment,
  open,
  onOpenChange,
}: {
  payment: BusinessSubscriptionPayment | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  if (!payment) return null;

  const signedAmount =
    payment.direction === "OUTGOING"
      ? `−${payment.amount}`
      : `+${payment.amount}`;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full overflow-y-auto sm:max-w-lg"
      >
        <SheetHeader>
          <SheetTitle>
            {signedAmount} {payment.currency}
          </SheetTitle>
          <SheetDescription>
            {formatSubscriptionPaymentType(payment.paymentType)} ·{" "}
            {new Date(payment.recordedAt).toLocaleString()}
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-4 px-4 pb-6">
          <div className="flex flex-wrap gap-2">
            <StatusBadge
              status={payment.paymentStatus}
              domain="subscriptionPayment"
            />
            {payment.voidedAt ? (
              <span className="text-xs text-muted-foreground">Voided</span>
            ) : null}
          </div>

          <dl className="grid gap-4 text-sm sm:grid-cols-2">
            <DetailRow
              label="Direction"
              value={formatPaymentDirection(payment.direction)}
            />
            <DetailRow
              label="Method"
              value={formatPaymentMethod(payment.paymentMethod)}
            />
            <DetailRow
              label="Source"
              value={formatPaymentSource(payment.source)}
            />
            <DetailRow label="Billing cycle" value={payment.billingCycle} />
            <DetailRow label="Period" value={formatPeriod(payment)} />
            <DetailRow
              label="Paid at"
              value={
                payment.paidAt
                  ? new Date(payment.paidAt).toLocaleString()
                  : "—"
              }
            />
            <DetailRow
              label="Due date"
              value={
                payment.dueDate
                  ? new Date(payment.dueDate).toLocaleDateString()
                  : "—"
              }
            />
            <DetailRow
              label="Reference"
              value={payment.paymentReference ?? "—"}
            />
            <DetailRow
              label="Recorded at"
              value={new Date(payment.recordedAt).toLocaleString()}
            />
            {payment.voidedAt ? (
              <>
                <DetailRow
                  label="Voided at"
                  value={new Date(payment.voidedAt).toLocaleString()}
                />
                <DetailRow
                  label="Void reason"
                  value={payment.voidReason ?? "—"}
                />
              </>
            ) : null}
            {payment.externalProvider ? (
              <DetailRow
                label="External provider"
                value={payment.externalProvider}
              />
            ) : null}
            {payment.externalPaymentId ? (
              <DetailRow
                label="External payment ID"
                value={
                  <code className="text-xs">{payment.externalPaymentId}</code>
                }
              />
            ) : null}
            {payment.notes ? (
              <div className="sm:col-span-2">
                <DetailRow
                  label="Notes"
                  value={
                    <span className="whitespace-pre-wrap font-normal">
                      {payment.notes}
                    </span>
                  }
                />
              </div>
            ) : null}
          </dl>

          {payment.metadata ? (
            <details className="text-xs">
              <summary className="cursor-pointer text-muted-foreground">
                Metadata
              </summary>
              <pre className="mt-2 max-h-48 overflow-auto rounded bg-muted p-2 font-mono text-[11px]">
                {JSON.stringify(payment.metadata, null, 2)}
              </pre>
            </details>
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  );
}
