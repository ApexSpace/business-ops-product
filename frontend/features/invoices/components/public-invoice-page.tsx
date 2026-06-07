"use client";

import { use, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import { CheckCircle2, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  getPublicInvoice,
  startPublicInvoiceCheckout,
} from "@/features/invoices/api/public-invoices.api";
import { formatMoney } from "@/features/payments/utils/currencies";
import { formatInvoicePaymentStatus } from "@/features/invoices/schemas/invoice-payment-status";
import { formatInvoiceDate } from "@/features/invoices/schemas/invoice-profile";
import type { PublicInvoice } from "@/lib/types/api";

function formatPublicMoney(value: string, code: string) {
  return formatMoney(value, code);
}

function statusBadgeVariant(
  invoice: PublicInvoice,
): "default" | "secondary" | "outline" | "destructive" {
  if (invoice.isOverdue && invoice.paymentStatus !== "PAID") {
    return "destructive";
  }
  if (invoice.paymentStatus === "PAID") return "secondary";
  if (invoice.paymentStatus === "PARTIALLY_PAID") return "default";
  return "outline";
}

function statusLabel(invoice: PublicInvoice): string {
  if (invoice.isOverdue && invoice.paymentStatus !== "PAID") {
    return "Overdue";
  }
  return formatInvoicePaymentStatus(invoice.paymentStatus);
}

export function PublicInvoicePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = use(params);
  const searchParams = useSearchParams();
  const paymentResult = searchParams.get("payment");
  const [showSuccess, setShowSuccess] = useState(paymentResult === "success");

  const { data: invoice, isLoading, error, refetch } = useQuery({
    queryKey: ["public-invoice", token],
    queryFn: () => getPublicInvoice(token),
    enabled: !!token,
  });

  useEffect(() => {
    if (paymentResult === "success") {
      setShowSuccess(true);
      void refetch();
    }
  }, [paymentResult, refetch]);

  const checkoutMutation = useMutation({
    mutationFn: () => startPublicInvoiceCheckout(token),
    onSuccess: (result) => {
      window.location.href = result.checkoutUrl;
    },
  });

  if (isLoading) {
    return (
      <div className="flex flex-col items-center gap-3 py-16 text-muted-foreground">
        <Loader2 className="size-8 animate-spin" />
        <p className="text-sm">Loading invoice…</p>
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-6 text-center">
        <h1 className="text-lg font-semibold text-foreground">Invoice not found</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          This link may be invalid or expired.
        </p>
      </div>
    );
  }

  const money = (value: string) => formatPublicMoney(value, invoice.currencyCode);

  const canPay = invoice.canPayOnline && parseFloat(invoice.balanceDue) > 0;

  return (
    <article className="space-y-6">
      <header className="space-y-2 text-center sm:text-left">
        <p className="text-sm font-medium text-muted-foreground">
          {invoice.businessName}
        </p>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Invoice {invoice.invoiceNumber}
        </h1>
        <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
          <Badge variant={statusBadgeVariant(invoice)}>{statusLabel(invoice)}</Badge>
          <span className="text-sm text-muted-foreground">
            Issued {formatInvoiceDate(invoice.issueDate)}
            {invoice.dueDate
              ? ` · Due ${formatInvoiceDate(invoice.dueDate)}`
              : null}
          </span>
        </div>
      </header>

      {showSuccess ? (
        <div className="flex gap-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4">
          <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-emerald-600" />
          <div>
            <p className="font-medium text-foreground">Payment successful</p>
            <p className="text-sm text-muted-foreground">
              Thank you. Your payment has been received.
            </p>
          </div>
        </div>
      ) : null}

      {paymentResult === "cancelled" ? (
        <p className="text-center text-sm text-muted-foreground">
          Payment was cancelled. You can try again when ready.
        </p>
      ) : null}

      <section className="rounded-lg border bg-card p-4 shadow-sm">
        <p className="text-sm text-muted-foreground">Bill to</p>
        <p className="font-medium text-foreground">{invoice.contactLabel}</p>
      </section>

      <section className="rounded-lg border bg-card shadow-sm">
        <ul className="divide-y">
          {invoice.items.map((item) => (
            <li
              key={item.id}
              className="flex items-start justify-between gap-4 px-4 py-3"
            >
              <div className="min-w-0">
                <p className="font-medium text-foreground">{item.title}</p>
                {item.description ? (
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {item.description}
                  </p>
                ) : null}
                <p className="mt-1 text-xs text-muted-foreground tabular-nums">
                  {item.quantity} × {money(item.unitPrice)}
                </p>
              </div>
              <p className="shrink-0 font-medium tabular-nums">
                {money(item.totalPrice)}
              </p>
            </li>
          ))}
        </ul>
        <div className="space-y-1 border-t px-4 py-3 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Subtotal</span>
            <span className="tabular-nums">{money(invoice.subtotal)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Tax</span>
            <span className="tabular-nums">{money(invoice.taxAmount)}</span>
          </div>
          {parseFloat(invoice.discountAmount) > 0 ? (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Discount</span>
              <span className="tabular-nums">
                −{money(invoice.discountAmount)}
              </span>
            </div>
          ) : null}
          <div className="flex justify-between border-t pt-2 font-semibold">
            <span>Total</span>
            <span className="tabular-nums">{money(invoice.totalAmount)}</span>
          </div>
          {parseFloat(invoice.paidAmount) > 0 ? (
            <div className="flex justify-between text-muted-foreground">
              <span>Paid</span>
              <span className="tabular-nums">{money(invoice.paidAmount)}</span>
            </div>
          ) : null}
          <div className="flex justify-between text-base font-semibold text-foreground">
            <span>Amount due</span>
            <span className="tabular-nums">{money(invoice.balanceDue)}</span>
          </div>
        </div>
      </section>

      {canPay ? (
        <Button
          className="w-full"
          size="lg"
          disabled={checkoutMutation.isPending}
          onClick={() => checkoutMutation.mutate()}
        >
          {checkoutMutation.isPending ? (
            <>
              <Loader2 className="mr-2 size-4 animate-spin" />
              Redirecting…
            </>
          ) : (
            "Pay now"
          )}
        </Button>
      ) : (
        <p className="text-center text-sm text-muted-foreground">
          {invoice.paymentStatus === "PAID"
            ? "This invoice is paid in full."
            : "Online payment is not available for this invoice."}
        </p>
      )}
    </article>
  );
}
